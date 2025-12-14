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

interface SOSTriggerRequest {
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

  // Check for null island (0,0) which might indicate GPS error
  if (lat === 0 && lng === 0) {
    return { isValid: false, error: "Invalid coordinates. GPS may not be available" };
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

export async function POST(request: NextRequest) {
  try {
    const body: SOSTriggerRequest = await request.json();
    const { lat, lng } = body;

    // Validate required fields
    if (lat === undefined || lng === undefined) {
      return NextResponse.json(
        { success: false, message: "Location coordinates are required" },
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

    // Get authenticated user
    const authSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } }
    );
    
    const { data: { user }, error: authError } = await authSupabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { success: false, message: "Not authenticated" },
        { status: 401 }
      );
    }
    
    const userId = user.id;

    console.log("🚨 SOS Trigger activated for user:", userId, "at location:", { lat, lng });

    // Check for existing active SOS events with resilient database client
    const existingEventResult = await resilientDb.executeWithRetry(async (client) => {
      return await client
        .from("sos_events")
        .select("id")
        .eq("user_id", userId)
        .eq("is_active", true)
        .single();
    });

    if (existingEventResult.error && existingEventResult.error.code !== "PGRST116") {
      console.error("Database error checking existing SOS:", ErrorMessageFormatter.formatForLogging(existingEventResult.error));
      const userError = ErrorMessageFormatter.formatForUser(existingEventResult.error);
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

    if (existingEventResult.data) {
      return NextResponse.json(
        { success: false, message: "An active SOS event already exists. Please cancel it first." },
        { status: 409 }
      );
    }

    // Insert new SOS event into database with resilient client
    const sosEventResult = await resilientDb.insert("sos_events", {
      user_id: userId,
      initial_lat: lat,
      initial_lng: lng,
      is_active: true
    });

    if (sosEventResult.error) {
      console.error("Database error creating SOS event:", ErrorMessageFormatter.formatForLogging(sosEventResult.error));
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

    const sosEvent = sosEventResult.data as { id: string; user_id: string; initial_lat: number; initial_lng: number; is_active: boolean; created_at: string };

    // Insert initial location update with resilient client
    const locationResult = await resilientDb.insert("sos_locations", {
      sos_id: sosEvent.id,
      lat,
      lng
    });

    if (locationResult.error) {
      console.error("Database error inserting initial location:", ErrorMessageFormatter.formatForLogging(locationResult.error));
      // Don't fail the SOS trigger if location logging fails, but log the issue
    }

    // Fetch emergency contacts for notifications with resilient client
    let emergencyContacts: any[] = [];
    let contactsNotified = 0;
    let notificationErrors: string[] = [];

    const contactsResult = await resilientDb.select("emergency_contacts", "*", {
      maxRetries: 2 // Reduce retries for contact fetching to avoid delays
    });

    if (contactsResult.error) {
      console.error("Database error fetching emergency contacts:", ErrorMessageFormatter.formatForLogging(contactsResult.error));
      notificationErrors.push("Failed to fetch emergency contacts");
      emergencyContacts = [];
    } else {
      emergencyContacts = contactsResult.data || [];
    }

    // Send notifications with error handling
    if (emergencyContacts && emergencyContacts.length > 0) {
      console.log("📱 Sending SOS notifications to emergency contacts:");
      
      const notificationPromises = emergencyContacts.map(async (contact) => {
        const message = `🚨 SOS ACTIVATED: SafeHER emergency alert from your contact. Last location: https://maps.google.com/?q=${lat},${lng}`;
        
        try {
          const success = await sendSMSNotificationWithRetry(contact.phone, message);
          if (success) {
            contactsNotified++;
            console.log(`✅ SMS sent to ${contact.name} (${contact.phone})`);
          } else {
            notificationErrors.push(`Failed to notify ${contact.name}`);
            console.error(`❌ SMS failed to ${contact.name} (${contact.phone})`);
          }
        } catch (error) {
          notificationErrors.push(`Failed to notify ${contact.name}: ${error}`);
          console.error(`❌ SMS error for ${contact.name}:`, error);
        }
      });

      // Wait for all notifications to complete (with timeout)
      await Promise.allSettled(notificationPromises);
    } else {
      console.log("⚠️ No emergency contacts found for user");
      notificationErrors.push("No emergency contacts configured");
    }

    console.log("✅ SOS Event created successfully:", sosEvent.id);

    return NextResponse.json({
      success: true,
      sos_id: sosEvent.id,
      message: "SOS activated successfully",
      emergency_contacts_notified: contactsNotified,
      total_contacts: emergencyContacts.length,
      notification_errors: notificationErrors.length > 0 ? notificationErrors : undefined
    });

  } catch (error) {
    console.error("SOS trigger error:", error);
    
    // Provide user-friendly error message
    let userMessage = "An unexpected error occurred while activating SOS.";
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