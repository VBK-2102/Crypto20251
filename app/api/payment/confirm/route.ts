import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { mockTransactions, updateUserBalance } from "@/lib/mock-data"

export async function POST(request: NextRequest) {
  try {
    const user = await auth.getUserFromRequest(request)

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const { transactionId } = await request.json()
    console.log("[Payment Confirm] User ID:", user.userId, "Transaction ID:", transactionId)

    if (!transactionId) {
      console.log("[Payment Confirm] No transaction ID provided")
      return NextResponse.json({ success: false, error: "Transaction ID required" }, { status: 400 })
    }

    // Find the pending transaction
    const transaction = mockTransactions.find(
      (t) => t.transaction_hash === transactionId && t.user_id === user.userId && t.status === "pending",
    )
    if (!transaction) {
      console.log("[Payment Confirm] Transaction not found for user", user.id, "with transactionId", transactionId)
      return NextResponse.json({ success: false, error: "Transaction not found" }, { status: 404 })
    }

    // Update transaction status
    transaction.status = "completed"
    transaction.updated_at = new Date().toISOString()

    // Update user balance
    const newBalances = updateUserBalance(user.userId, transaction.currency, transaction.amount)

    if (!newBalances) {
      return NextResponse.json({ success: false, error: "Failed to update balance" }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: `${transaction.currency} ${transaction.amount} added successfully`,
      newBalances,
      transaction,
    })
  } catch (error) {
    console.error("Payment confirmation error:", error)
    return NextResponse.json({ success: false, error: "Failed to confirm payment" }, { status: 500 })
  }
}
