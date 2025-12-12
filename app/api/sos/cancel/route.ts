import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createResilientDatabaseClient, DatabaseErrorHandler, ErrorMessageFormatter } from "@/utils/database-resilience";
import { executeWithRetry } from "@/utils/network-resilience";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const resilientDb = createResilientDatabaseClient();

interface SOSCancelRequest {
  sos_id: string;
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

// Clear any queued location updates for this SOS event
function clearLocationUpdateQueue(sosId: string): void {
  // In production, this would clear from Redis or similar
  // For now, we'll simulate clearing a queue
  console.log(`Clearing location update queue for SOS ${sosId}`);
}

export async function POST(request: NextRequest) {
  try {
    const body: SOSCancelRequest = await request.json();
    const { sos_id } = body;

    // Validate required fields
    if (!sos_id) {
      return NextResponse.json(
        { success: false, message: "SOS ID is required" },
        { status: 400 }
      );
    }

    console.log("🛑 SOS Cancel requested for:", sos_id);

    // First, verify the SOS event exists and get its details with resilient client
    const sosEventCheckResult = await resilientDb.executeWithRetry(async (client) => {
      return await client
        .from("sos_events")
        .select("id, is_active, user_id, started_at")
        .eq("id", sos_id)
        .single();
    });

    if (sosEventCheckResult.error) {
      console.error("Database error verifying SOS event:", ErrorMessageFormatter.formatForLogging(sosEventCheckResult.error));
      
      if (sosEventCheckResult.error.code === "PGRST116") {
        return NextResponse.json(
          { success: false, message: "SOS event not found" },
          { status: 404 }
        );
      }
      
      const userError = ErrorMessageFormatter.formatForUser(sosEventCheckResult.error);
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

    const sosEventCheck = sosEventCheckResult.data as { id: string; user_id: string; is_active: boolean; created_at: string; started_at?: string } | null;

    // Check if SOS is already cancelled
    if (!sosEventCheck || !sosEventCheck.is_active) {
      return NextResponse.json(
        { success: false, message: "SOS event is already cancelled" },
        { status: 400 }
      );
    }

    // Step 1: Clear any queued location updates
    clearLocationUpdateQueue(sos_id);

    // Step 2: Update SOS event to inactive with comprehensive cleanup using resilient client
    const endTime = new Date().toISOString();
    const sosEventResult = await resilientDb.executeWithRetry(async (client) => {
      return await client
        .from("sos_events")
        .update({
          is_active: false,
          ended_at: endTime
        })
        .eq("id", sos_id)
        .eq("is_active", true) // Ensure we only update if still active
        .select()
        .single();
    });

    if (sosEventResult.error) {
      console.error("Database error cancelling SOS event:", ErrorMessageFormatter.formatForLogging(sosEventResult.error));
      
      if (sosEventResult.error.code === "PGRST116") {
        return NextResponse.json(
          { success: false, message: "SOS event not found or already cancelled" },
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

    const sosEvent = sosEventResult.data as { id: string; user_id: string; is_active: boolean; ended_at: string; created_at: string } | null;
    if (!sosEvent) {
      return NextResponse.json(
        { success: false, message: "Failed to cancel SOS event" },
        { status: 500 }
      );
    }

    // Step 3: Fetch emergency contacts for cancellation notification with resilient client
    let emergencyContacts: any[] = [];
    let contactsNotified = 0;
    let notificationErrors: string[] = [];

    const contactsResult = await resilientDb.select("emergency_contacts", "*", {
      maxRetries: 2 // Allow some retries for cancellation notifications
    });

    if (contactsResult.error) {
      console.error("Database error fetching emergency contacts:", ErrorMessageFormatter.formatForLogging(contactsResult.error));
      notificationErrors.push("Failed to fetch emergency contacts for cancellation notification");
      emergencyContacts = [];
    } else {
      emergencyContacts = contactsResult.data || [];
    }

    // Step 4: Send cancellation notifications with comprehensive error handling
    if (emergencyContacts && emergencyContacts.length > 0) {
      console.log("📱 Sending SOS cancellation notification to emergency contacts:");
      
      const notificationPromises = emergencyContacts.map(async (contact) => {
        const duration = sosEvent.ended_at && sosEventCheck?.started_at 
          ? Math.round((new Date(sosEvent.ended_at).getTime() - new Date(sosEventCheck.started_at).getTime()) / 1000 / 60)
          : 0;
        
        const message = `✅ SOS CANCELLED: Your contact has cancelled their emergency alert after ${duration} minutes. They are safe.`;
        
        try {
          const success = await sendSMSNotificationWithRetry(contact.phone, message);
          if (success) {
            contactsNotified++;
            console.log(`✅ Cancellation SMS sent to ${contact.name} (${contact.phone})`);
          } else {
            notificationErrors.push(`Failed to notify ${contact.name} of cancellation`);
            console.error(`❌ Cancellation SMS failed to ${contact.name} (${contact.phone})`);
          }
        } catch (error) {
          notificationErrors.push(`Failed to notify ${contact.name} of cancellation: ${error}`);
          console.error(`❌ Cancellation SMS error for ${contact.name}:`, error);
        }
      });

      // Wait for all cancellation notifications to complete (with timeout)
      await Promise.allSettled(notificationPromises);
    } else {
      console.log("⚠️ No emergency contacts found for cancellation notification");
      if (emergencyContacts.length === 0) {
        notificationErrors.push("No emergency contacts configured");
      }
    }

    // Step 5: Log comprehensive cancellation details
    const duration = sosEvent.ended_at && sosEventCheck?.started_at 
      ? Math.round((new Date(sosEvent.ended_at).getTime() - new Date(sosEventCheck.started_at).getTime()) / 1000)
      : 0;

    console.log("✅ SOS Event cancelled successfully:", {
      sos_id,
      duration_seconds: duration,
      contacts_notified: contactsNotified,
      total_contacts: emergencyContacts.length,
      errors: notificationErrors.length
    });

    return NextResponse.json({
      success: true,
      message: "SOS cancelled successfully",
      ended_at: sosEvent.ended_at,
      duration_seconds: duration,
      contacts_notified: contactsNotified,
      total_contacts: emergencyContacts.length,
      notification_errors: notificationErrors.length > 0 ? notificationErrors : undefined,
      cleanup_completed: true
    });

  } catch (error) {
    console.error("SOS cancel error:", error);
    
    // Provide user-friendly error message
    let userMessage = "An unexpected error occurred while cancelling SOS.";
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