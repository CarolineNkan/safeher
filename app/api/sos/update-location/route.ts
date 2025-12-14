import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createResilientDatabaseClient, DatabaseErrorHandler, ErrorMessageFormatter } from "@/utils/database-resilience";
import { executeWithRetry } from "@/utils/network-resilience";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { auth: { persistSession: false } }
);

const resilientDb = createResilientDatabaseClient();

interface SOSUpdateRequest {
  sos_id: string;
  lat: number;
  lng: number;
}

// Enhanced coordinate validation
function validateCoordinates(lat: number, lng: number): { isValid: boolean; error?: string } {
  // Check if coordinates are numbers
  if (typeof lat !== 'number' || typeof lng !== 'number') {
    return { isValid: false, error: "Coordinates must be numbers" };
  }

  // Check for NaN or Infinity
  if (!isFinite(lat) || !isFinite(lng)) {
    return { isValid: false, error: "Coordinates must be finite numbers" };
  }

  // Validate latitude range
  if (lat < -90 || lat > 90) {
    return { isValid: false, error: "Invalid latitude. Must be between -90 and 90" };
  }

  // Validate longitude range
  if (lng < -180 || lng > 180) {
    return { isValid: false, error: "Invalid longitude. Must be between -180 and 180" };
  }

  return { isValid: true };
}

// Enhanced SMS notification with retry logic
async function sendSMSNotificationWithRetry(phone: string, message: string): Promise<boolean> {
  return executeWithRetry(
    () => sendSMSNotification(phone, message),
    {
      maxRetries: 2,
      baseDelay: 500,
      retryCondition: (error) => {
        // Retry on network errors but not on invalid phone numbers
        return !error.message?.includes('invalid phone') && 
               !error.message?.includes('blocked number');
      }
    }
  );
}

// Send SMS notification (placeholder for Twilio integration)
async function sendSMSNotification(phone: string, message: string): Promise<boolean> {
  try {
    // TODO: Integrate with Twilio or other SMS service
    console.log(`SMS to ${phone}: ${message}`);
    
    // Simulate SMS sending with potential failure
    if (Math.random() < 0.1) { // 10% failure rate for testing
      throw new Error("SMS service temporarily unavailable");
    }
    
    return true;
  } catch (error) {
    console.error("SMS sending failed:", error);
    return false;
  }
}

// In-memory queue for offline location updates (in production, use Redis or similar)
const locationUpdateQueue = new Map<string, Array<{ lat: number; lng: number; timestamp: Date }>>();

// Process queued location updates with resilient database client
async function processQueuedUpdates(sosId: string): Promise<void> {
  const queuedUpdates = locationUpdateQueue.get(sosId);
  if (!queuedUpdates || queuedUpdates.length === 0) {
    return;
  }

  console.log(`Processing ${queuedUpdates.length} queued location updates for SOS ${sosId}`);

  const processedUpdates: typeof queuedUpdates = [];

  for (const update of queuedUpdates) {
    const result = await resilientDb.insert("sos_locations", {
      sos_id: sosId,
      lat: update.lat,
      lng: update.lng,
      timestamp: update.timestamp.toISOString()
    });

    if (result.error) {
      console.error("Failed to process queued location update:", ErrorMessageFormatter.formatForLogging(result.error));
      // Keep failed updates in queue for next attempt if retryable
      if (result.error.isRetryable) {
        continue;
      }
    }
    
    processedUpdates.push(update);
  }

  // Remove processed updates from queue
  if (processedUpdates.length > 0) {
    const remainingUpdates = queuedUpdates.filter(update => !processedUpdates.includes(update));
    if (remainingUpdates.length === 0) {
      locationUpdateQueue.delete(sosId);
    } else {
      locationUpdateQueue.set(sosId, remainingUpdates);
    }
    console.log(`Processed ${processedUpdates.length} queued updates, ${remainingUpdates.length} remaining`);
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: SOSUpdateRequest = await request.json();
    const { sos_id, lat, lng } = body;

    // Validate required fields
    if (!sos_id || lat === undefined || lng === undefined) {
      return NextResponse.json(
        { success: false, message: "SOS ID and location coordinates are required" },
        { status: 400 }
      );
    }

    // Enhanced coordinate validation
    const validation = validateCoordinates(lat, lng);
    if (!validation.isValid) {
      return NextResponse.json(
        { success: false, message: validation.error },
        { status: 400 }
      );
    }

    console.log("📍 SOS Location update:", { sos_id, lat, lng });

    // Process any queued updates first
    try {
      await processQueuedUpdates(sos_id);
    } catch (error) {
      console.warn("Failed to process queued updates:", error);
    }

    // Verify SOS event exists and is active with resilient database client
    const sosEventResult = await resilientDb.executeWithRetry(async (client) => {
      return await client
        .from("sos_events")
        .select("id, is_active, user_id")
        .eq("id", sos_id)
        .single();
    });

    if (sosEventResult.error) {
      console.error("Database error verifying SOS event:", ErrorMessageFormatter.formatForLogging(sosEventResult.error));
      
      if (sosEventResult.error.code === "PGRST116") {
        return NextResponse.json(
          { success: false, message: "SOS event not found" },
          { status: 404 }
        );
      }
      
      const userError = ErrorMessageFormatter.formatForUser(sosEventResult.error);
      return NextResponse.json(
        { 
          success: false, 
          message: userError.message,
          error_details: {
            title: userError.title,
            actions: userError.actions,
            severity: userError.severity
          }
        },
        { status: 500 }
      );
    }

    const sosEvent = sosEventResult.data as { id: string; user_id: string; is_active: boolean; created_at: string } | null;

    if (!sosEvent || !sosEvent.is_active) {
      return NextResponse.json(
        { success: false, message: "SOS event is no longer active" },
        { status: 400 }
      );
    }

    // Insert location update with resilient database client
    const locationUpdateResult = await resilientDb.insert("sos_locations", {
      sos_id,
      lat,
      lng
    });

    let locationUpdate: any;
    
    if (locationUpdateResult.error) {
      console.error("Database error inserting location update:", ErrorMessageFormatter.formatForLogging(locationUpdateResult.error));
      
      // Queue the update for later processing if the error is retryable
      if (locationUpdateResult.error.isRetryable) {
        const queuedUpdates = locationUpdateQueue.get(sos_id) || [];
        queuedUpdates.push({ lat, lng, timestamp: new Date() });
        locationUpdateQueue.set(sos_id, queuedUpdates);
        
        console.log(`Location update queued for SOS ${sos_id}. Queue size: ${queuedUpdates.length}`);
        
        return NextResponse.json({
          success: true,
          message: "Location update queued due to database issues",
          queued: true,
          queue_size: queuedUpdates.length
        });
      } else {
        // Non-retryable error
        const userError = ErrorMessageFormatter.formatForUser(locationUpdateResult.error);
        return NextResponse.json(
          { 
            success: false, 
            message: userError.message,
            error_details: {
              title: userError.title,
              actions: userError.actions,
              severity: userError.severity
            }
          },
          { status: 500 }
        );
      }
    }

    locationUpdate = locationUpdateResult.data;

    // Enhanced rate limiting for notifications (max every 2 minutes)
    let shouldSendUpdate = false;
    let notificationsSent = 0;
    let notificationErrors: string[] = [];

    try {
      // Get the latest notification timestamps for rate limiting with resilient client
      const twoMinutesAgo = new Date(Date.now() - 2 * 60 * 1000);
      
      const recentNotificationsResult = await resilientDb.executeWithRetry(async (client) => {
        return await client
          .from("sos_locations")
          .select("id, timestamp")
          .eq("sos_id", sos_id)
          .gte("timestamp", twoMinutesAgo.toISOString())
          .order("timestamp", { ascending: false });
      }, { maxRetries: 1 }); // Quick check, don't delay notifications too much

      if (recentNotificationsResult.error) {
        console.error("Database error checking rate limit:", ErrorMessageFormatter.formatForLogging(recentNotificationsResult.error));
        // Default to sending notification if we can't check rate limit
        shouldSendUpdate = true;
      } else {
        // Send notification if this is the first update in the last 2 minutes
        const recentNotifications = recentNotificationsResult.data || [];
        shouldSendUpdate = recentNotifications.length <= 1;
      }
    } catch (error) {
      console.error("Rate limiting check failed:", error);
      shouldSendUpdate = true; // Default to sending if check fails
    }
    
    if (shouldSendUpdate) {
      try {
        // Fetch emergency contacts for notifications with resilient client
        const contactsResult = await resilientDb.select("emergency_contacts", "*", {
          maxRetries: 1 // Quick fetch, don't delay notifications
        });

        let emergencyContacts: any[] = [];
        if (contactsResult.error) {
          console.error("Database error fetching emergency contacts:", ErrorMessageFormatter.formatForLogging(contactsResult.error));
          notificationErrors.push("Failed to fetch emergency contacts");
        } else {
          emergencyContacts = contactsResult.data || [];
        }

        if (emergencyContacts && emergencyContacts.length > 0) {
          console.log("📱 Sending SOS location update to emergency contacts:");
          
          const notificationPromises = emergencyContacts.map(async (contact) => {
            const message = `🚨 SOS UPDATE: Location updated - https://maps.google.com/?q=${lat},${lng}`;
            
            try {
              const success = await sendSMSNotificationWithRetry(contact.phone, message);
              if (success) {
                notificationsSent++;
                console.log(`✅ Location update SMS sent to ${contact.name} (${contact.phone})`);
              } else {
                notificationErrors.push(`Failed to notify ${contact.name}`);
                console.error(`❌ Location update SMS failed to ${contact.name} (${contact.phone})`);
              }
            } catch (error) {
              notificationErrors.push(`Failed to notify ${contact.name}: ${error}`);
              console.error(`❌ Location update SMS error for ${contact.name}:`, error);
            }
          });

          // Wait for all notifications to complete (with timeout)
          await Promise.allSettled(notificationPromises);
        } else {
          console.log("⚠️ No emergency contacts found for location update notifications");
        }
      } catch (error) {
        console.error("Failed to send location update notifications:", error);
        notificationErrors.push("Failed to fetch emergency contacts");
      }
    } else {
      console.log("📱 Location update notification rate limited (last sent < 2 minutes ago)");
    }

    console.log("✅ SOS Location updated successfully:", locationUpdate.id);

    return NextResponse.json({
      success: true,
      location_id: locationUpdate.id,
      message: "Location updated successfully",
      notification_sent: shouldSendUpdate,
      notifications_sent: notificationsSent,
      notification_errors: notificationErrors.length > 0 ? notificationErrors : undefined,
      queued_updates_processed: locationUpdateQueue.has(sos_id) ? 0 : undefined
    });

  } catch (error) {
    console.error("SOS location update error:", error);
    
    // Provide user-friendly error message
    let userMessage = "An unexpected error occurred while updating location.";
    let errorDetails = null;
    
    if (error instanceof Error) {
      // Check if it's a database error
      const dbError = DatabaseErrorHandler.classifyError(error);
      if (dbError.code !== 'UNKNOWN') {
        const userError = ErrorMessageFormatter.formatForUser(dbError);
        userMessage = userError.message;
        errorDetails = {
          title: userError.title,
          actions: userError.actions,
          severity: userError.severity
        };
      }
    }
    
    return NextResponse.json(
      { 
        success: false, 
        message: userMessage,
        error_details: errorDetails
      },
      { status: 500 }
    );
  }
}