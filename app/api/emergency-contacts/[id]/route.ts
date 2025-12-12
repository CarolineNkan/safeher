import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createResilientDatabaseClient, DatabaseErrorHandler, ErrorMessageFormatter } from "@/utils/database-resilience";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

const resilientDb = createResilientDatabaseClient();

interface EmergencyContactUpdate {
  name?: string;
  phone?: string;
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

// PUT - Update emergency contact
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: contactId } = await params;
    const body: EmergencyContactUpdate = await request.json();
    const { name, phone, relationship } = body;

    // Validate contact ID
    if (!contactId) {
      return NextResponse.json(
        { success: false, message: "Contact ID is required" },
        { status: 400 }
      );
    }

    // Validate phone number if provided
    if (phone && !validatePhoneNumber(phone)) {
      return NextResponse.json(
        { success: false, message: "Invalid phone number format" },
        { status: 400 }
      );
    }

    // For now, we'll use a placeholder user ID since authentication isn't fully implemented
    const userId = "placeholder-user-id";

    // Build update object
    const updateData: any = {};
    if (name !== undefined) updateData.name = name.trim();
    if (phone !== undefined) updateData.phone = formatPhoneNumber(phone);
    if (relationship !== undefined) updateData.relationship = relationship?.trim() || null;

    // Ensure we have something to update
    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { success: false, message: "No valid fields to update" },
        { status: 400 }
      );
    }

    // Update emergency contact with resilient database client
    const contactResult = await resilientDb.executeWithRetry(async (client) => {
      return await client
        .from("emergency_contacts")
        .update(updateData)
        .eq("id", contactId)
        .eq("user_id", userId) // Ensure user can only update their own contacts
        .select()
        .single();
    });

    if (contactResult.error) {
      console.error("Database error updating emergency contact:", ErrorMessageFormatter.formatForLogging(contactResult.error));
      
      if (contactResult.error.code === "PGRST116") {
        return NextResponse.json(
          { success: false, message: "Emergency contact not found" },
          { status: 404 }
        );
      }
      
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

    const contact = contactResult.data;

    console.log("✅ Emergency contact updated successfully:", (contact as any)?.id);

    return NextResponse.json({
      success: true,
      contact,
      message: "Emergency contact updated successfully"
    });

  } catch (error) {
    console.error("Emergency contact update error:", error);
    
    // Provide user-friendly error message
    let userMessage = "An unexpected error occurred while updating the emergency contact.";
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

// DELETE - Remove emergency contact
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: contactId } = await params;

    // Validate contact ID
    if (!contactId) {
      return NextResponse.json(
        { success: false, message: "Contact ID is required" },
        { status: 400 }
      );
    }

    // For now, we'll use a placeholder user ID since authentication isn't fully implemented
    const userId = "placeholder-user-id";

    // Delete emergency contact with resilient database client
    const contactResult = await resilientDb.executeWithRetry(async (client) => {
      return await client
        .from("emergency_contacts")
        .delete()
        .eq("id", contactId)
        .eq("user_id", userId) // Ensure user can only delete their own contacts
        .select()
        .single();
    });

    if (contactResult.error) {
      console.error("Database error deleting emergency contact:", ErrorMessageFormatter.formatForLogging(contactResult.error));
      
      if (contactResult.error.code === "PGRST116") {
        return NextResponse.json(
          { success: false, message: "Emergency contact not found" },
          { status: 404 }
        );
      }
      
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

    const contact = contactResult.data;

    console.log("✅ Emergency contact deleted successfully:", (contact as any)?.id);

    return NextResponse.json({
      success: true,
      message: "Emergency contact deleted successfully"
    });

  } catch (error) {
    console.error("Emergency contact delete error:", error);
    
    // Provide user-friendly error message
    let userMessage = "An unexpected error occurred while deleting the emergency contact.";
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