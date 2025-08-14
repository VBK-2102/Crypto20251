import { NextRequest, NextResponse } from "next/server";
import { dbOperations as db, clientPromise } from "@/lib/db";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
  await clientPromise; // Ensure DB connection

  try {
    const user = await auth.getUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    // 3. Return wallet balances
    return NextResponse.json({
      success: true,
      balances: {
        INR: user.wallet_balance || 0,
      },
      last_updated: user.updated_at,
    });

  } catch (error) {
    console.error("[WALLET_BALANCES_ERROR]", error);
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}