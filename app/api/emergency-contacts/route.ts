import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createResilientDatabaseClient, DatabaseErrorHandler, ErrorMessageFormatter } from "@/utils/database-resilience";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const resilientDb = createResilientDatabaseClient();

interface EmergencyContact {
  id?: string;
  user_id: string;
  name: string;
  phone: string;
  relationship?: string;
}

// Validate phone number format (basic validation)
function validatePhoneNumber(phone: string): boolean {
  // Remove all non-digit characters
  const cleanPhone = phone.replace(/\D/g, '');
  // Check if it's a valid length (10-15 digits)
  return cleanPhone.length >= 10 && cleanPhone.length <= 15;
}

// Format phone number for storage
function formatPhoneNumber(phone: string): string {
  // Remove all non-digit characters and store as clean number
  return phone.replace(/\D/g, '');
}

// GET - Retrieve all emergency contacts for the user
export async function GET(request: NextRequest) {
  try {
    // For now, we'll use a placeholder user ID since authentication isn't fully implemented
    const userId = "placeholder-user-id";

    const contactsResult = await resilientDb.executeWithRetry(async (client) => {
      return await client
        .from("emergency_contacts")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: true });
    });

    if (contactsResult.error) {
      console.error("Database error fetching emergency contacts:", ErrorMessageFormatter.formatForLogging(contactsResult.error));
      const userError = ErrorMessageFormatter.formatForUser(contactsResult.error);
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

    return NextResponse.json({
      success: true,
      contacts: contactsResult.data || []
    });

  } catch (error) {
    console.error("Emergency contacts fetch error:", error);
    
    // Provide user-friendly error message
    let userMessage = "An unexpected error occurred while fetching emergency contacts.";
    let errorDetails = null;
    
    if (error instanceof Error) {
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

// POST - Add new emergency contact
export async function POST(request: NextRequest) {
  try {
    const body: Omit<EmergencyContact, 'id' | 'user_id'> = await request.json();
    const { name, phone, relationship } = body;

    // Validate required fields
    if (!name || !phone) {
      return NextResponse.json(
        { success: false, message: "Name and phone number are required" },
        { status: 400 }
      );
    }

    // Validate phone number format
    if (!validatePhoneNumber(phone)) {
      return NextResponse.json(
        { success: false, message: "Invalid phone number format" },
        { status: 400 }
      );
    }

    // For now, we'll use a placeholder user ID since authentication isn't fully implemented
    const userId = "placeholder-user-id";

    // Format phone number for storage
    const formattedPhone = formatPhoneNumber(phone);

    // Insert new emergency contact with resilient database client
    const contactResult = await resilientDb.insert("emergency_contacts", {
      user_id: userId,
      name: name.trim(),
      phone: formattedPhone,
      relationship: relationship?.trim() || null
    });

    if (contactResult.error) {
      console.error("Database error adding emergency contact:", ErrorMessageFormatter.formatForLogging(contactResult.error));
      const userError = ErrorMessageFormatter.formatForUser(contactResult.error);
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

    console.log("✅ Emergency contact added successfully:", (contactResult.data as any)?.id);

    return NextResponse.json({
      success: true,
      contact: contactResult.data,
      message: "Emergency contact added successfully"
    });

  } catch (error) {
    console.error("Emergency contact add error:", error);
    
    // Provide user-friendly error message
    let userMessage = "An unexpected error occurred while adding the emergency contact.";
    let errorDetails = null;
    
    if (error instanceof Error) {
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