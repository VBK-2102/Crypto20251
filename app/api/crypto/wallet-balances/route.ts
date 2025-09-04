import { NextRequest, NextResponse } from "next/server"
import { dbOperations as db, clientPromise } from "@/lib/db"
import { auth } from "@/lib/auth"

// This route requires dynamic features (headers/cookies access for authentication)
// so we explicitly mark it as force-dynamic
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  await clientPromise
  
  try {
    const user = await auth.getUserFromRequest(request)
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      )
    }

    // 4. Return Wallet Balance
    return NextResponse.json({
      success: true,
      balances: {
        INR: user.wallet_balance || 0,
        userId: user._id?.toString() || 'unknown' // For debugging
      },
      userEmail: user.email // For debugging
    })

  } catch (error) {
    console.error("Wallet balance error:", error)
    return NextResponse.json(
      { 
        success: false, 
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    )
  }
}