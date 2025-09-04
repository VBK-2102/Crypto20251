// This route requires dynamic features so we mark it as force-dynamic
export const dynamic = 'force-dynamic';

import { NextResponse } from "next/server";
import { authUtils } from "@/lib/auth-utils";

export async function GET() {
  try {
    // Check if JWT_SECRET is available
    const jwtSecretAvailable = !!process.env.JWT_SECRET;
    const jwtSecretLength = process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 0;
    
    // Try to generate a test token
    let token = null;
    let verificationResult = null;
    let error = null;
    
    try {
      token = authUtils.generateToken({
        userId: "test-user-id",
        email: "test@example.com",
        isAdmin: false
      });
      
      // Try to verify the token
      verificationResult = authUtils.verifyToken(token);
    } catch (err) {
      error = err instanceof Error ? err.message : String(err);
    }
    
    return NextResponse.json({
      success: true,
      jwtSecretAvailable,
      jwtSecretLength,
      token: token ? "[Generated successfully]" : null,
      verificationResult,
      error,
      env: process.env.NODE_ENV
    });
  } catch (error) {
    console.error("Test JWT error:", error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}