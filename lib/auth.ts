import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

/**
 * Authenticates the current user from the request
 * For API routes, we'll use a simplified approach for now
 */
export async function authenticateUser(request: Request) {
  try {
    // For now, we'll use a simplified authentication approach
    // In production, you would validate JWT tokens from the Authorization header
    
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // For demo purposes, return a placeholder user
      // In production, this should return an authentication error
      console.log("⚠️ No auth header found, using demo user for development");
      return { 
        user: { 
          id: 'demo-user-id', 
          email: 'demo@safeher.com' 
        }, 
        userId: 'demo-user-id' 
      };
    }

    // Extract and validate the token
    const token = authHeader.substring(7);
    
    // Create a new supabase instance for this request
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } }
    );

    // Set the session for this request
    const { data, error } = await supabase.auth.setSession({
      access_token: token,
      refresh_token: '', // Not needed for this use case
    });

    if (error || !data.user) {
      return {
        error: NextResponse.json(
          { success: false, message: "Not authenticated - invalid token" },
          { status: 401 }
        )
      };
    }

    return { user: data.user, userId: data.user.id };
  } catch (error) {
    console.error("Authentication error:", error);
    return {
      error: NextResponse.json(
        { success: false, message: "Authentication failed" },
        { status: 401 }
      )
    };
  }
}

/**
 * Alternative authentication method using cookies (for client-side requests)
 */
export async function authenticateUserFromCookies(request: Request) {
  try {
    // This would be used when the request comes from the browser with cookies
    // For now, we'll use the same logic but could be extended for cookie-based auth
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { persistSession: false } }
    );
    
    const { data: { user }, error } = await supabase.auth.getUser();

    if (error || !user) {
      return {
        error: NextResponse.json(
          { success: false, message: "Not authenticated" },
          { status: 401 }
        )
      };
    }

    return { user, userId: user.id };
  } catch (error) {
    console.error("Authentication error:", error);
    return {
      error: NextResponse.json(
        { success: false, message: "Authentication failed" },
        { status: 401 }
      )
    };
  }
}