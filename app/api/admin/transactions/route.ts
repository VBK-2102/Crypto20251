import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { dbOperations as db } from "@/lib/db"

export async function GET(request: NextRequest) {
  try {
    const user = await auth.getUserFromRequest(request)

    if (!user || !user.isAdmin) {
      return NextResponse.json({ success: false, error: "Admin access required" }, { status: 403 })
    }

    // Get real transactions from database
    const transactions = await db.getAllTransactions()

    return NextResponse.json(transactions)
  } catch (error) {
    console.error("Error fetching transactions:", error)
    return NextResponse.json({ success: false, error: "Failed to get transactions" }, { status: 500 })
  }
}
