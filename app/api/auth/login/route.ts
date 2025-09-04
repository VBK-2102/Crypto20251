// This route requires dynamic features (request.json) so we mark it as force-dynamic
export const dynamic = 'force-dynamic';

import { type NextRequest, NextResponse } from "next/server"
import { simpleAuth } from "@/lib/simple-auth"
import { auth } from "@/lib/auth"
import { ObjectId } from "mongodb"

export async function POST(request: NextRequest) {
  try {
    // Parse request body with error handling
    let email: string;
    let password: string;
    try {
      const body = await request.json();
      email = body.email;
      password = body.password;
    } catch (error) {
      console.error("Error parsing request body:", error);
      return NextResponse.json({ 
        success: false, 
        error: "Invalid request format", 
        details: "Request body must be valid JSON with email and password fields" 
      }, { status: 400 });
    }

    // Validate required fields
    if (!email || !password) {
      console.log("Login attempt with missing credentials");
      return NextResponse.json({ 
        success: false, 
        error: "Email and password are required" 
      }, { status: 400 });
    }

    // Attempt login
    let user;
    try {
      user = await simpleAuth.login(email, password);
    } catch (error) {
      console.error("Login process error:", error);
      return NextResponse.json({ 
        success: false, 
        error: "Authentication error", 
        details: error instanceof Error ? error.message : "Unknown error" 
      }, { status: 500 });
    }

    // Check if login was successful
    if (!user) {
      return NextResponse.json({ 
        success: false, 
        error: "Invalid credentials" 
      }, { status: 401 });
    }

    // Ensure we have a valid ObjectId for the user ID
    if (!user._id) {
      console.error("User ID is missing in login response");
      return NextResponse.json({ success: false, error: "User ID is missing" }, { status: 500 })
    }
    
    // Extract userId as string, handling different possible types
    let userId: string;
    try {
      userId = user._id instanceof ObjectId
        ? user._id.toHexString()
        : typeof user._id === "string"
        ? user._id
        : user._id && typeof (user._id as any).toString === "function"
        ? (user._id as any).toString()
        : "";
        
      if (!userId) {
        throw new Error("Failed to extract valid userId string");
      }
    } catch (error) {
      console.error("Error extracting userId:", error);
      return NextResponse.json({ 
        success: false, 
        error: "Invalid user ID format", 
        details: error instanceof Error ? error.message : "Unknown error" 
      }, { status: 500 })
    }
    
    // Generate token with proper error handling
    let token: string;
    try {
      token = auth.generateToken({
        userId: userId,
        email: user.email,
        isAdmin: user.is_admin || false,
      });
      
      if (!token) {
        throw new Error("Token generation returned empty result");
      }
    } catch (error) {
      console.error("Token generation error:", error);
      return NextResponse.json({ 
        success: false, 
        error: "Authentication failed", 
        details: error instanceof Error ? error.message : "Unknown error" 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      token,
      user,
    })
  } catch (error) {
    console.error("Login error:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ 
      success: false, 
      error: "Login failed", 
      details: errorMessage 
    }, { status: 500 })
  }
}
