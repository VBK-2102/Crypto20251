import { NextRequest, NextResponse } from 'next/server';
import * as jwt from 'jsonwebtoken';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    // Check if JWT_SECRET is available
    const jwtSecret = process.env.JWT_SECRET;
    const jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';
    
    // Create test payload
    const testPayload = {
      userId: 'test-user-id',
      email: 'test@example.com',
      isAdmin: false
    };
    
    // Attempt to sign a token
    let token = null;
    let verifyResult = null;
    let error = null;
    
    try {
      if (jwtSecret) {
        token = jwt.sign(testPayload, jwtSecret, { expiresIn: jwtExpiresIn });
        // Verify the token
        verifyResult = jwt.verify(token, jwtSecret);
      }
    } catch (err) {
      error = err instanceof Error ? err.message : 'Unknown error';
    }
    
    return NextResponse.json({
      success: true,
      environment: process.env.NODE_ENV,
      jwtSecretAvailable: !!jwtSecret,
      jwtSecretLength: jwtSecret ? jwtSecret.length : 0,
      jwtExpiresIn,
      tokenGenerated: !!token,
      tokenVerified: !!verifyResult,
      error
    });
  } catch (error) {
    console.error('JWT test error:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'JWT test failed', 
      details: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}