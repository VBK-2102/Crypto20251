import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { mockUsers, mockTransactions } from "@/lib/mock-data"

export async function POST(request: NextRequest) {
  try {
    const user = await auth.getUserFromRequest(request)

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const { recipientId, amount, note } = await request.json()

    if (!recipientId || !amount || amount <= 0) {
      return NextResponse.json({ success: false, error: "Invalid recipient or amount" }, { status: 400 })
    }

    // Find sender and recipient
    const sender = mockUsers.find((u) => u.id === user.userId)
    const recipient = mockUsers.find((u) => u.id === recipientId)

    if (!sender || !recipient) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
    }

    if (sender.walletBalance < amount) {
      return NextResponse.json({ success: false, error: "Insufficient balance" }, { status: 400 })
    }

    // Update balances
    sender.walletBalance -= amount
    recipient.walletBalance += amount

    // Create transactions
    const transactionId = `TXN${Date.now()}`
    const timestamp = new Date().toISOString()

    // Debit transaction for sender
    const debitTransaction = {
      id: mockTransactions.length + 1,
      user_id: sender.userId,
      type: "transfer_out" as const,
      amount: amount,
      currency: "INR",
      status: "completed" as const,
      payment_method: "wallet",
      transaction_hash: transactionId,
      receiver_address: recipient.email,
      upi_reference: note || `Transfer to ${recipient.fullName}`,
      created_at: timestamp,
      updated_at: timestamp,
    }

    // Credit transaction for recipient
    const creditTransaction = {
      id: mockTransactions.length + 2,
      user_id: recipient.id,
      type: "transfer_in" as const,
      amount: amount,
      currency: "INR",
      status: "completed" as const,
      payment_method: "wallet",
      transaction_hash: transactionId,
      receiver_address: sender.email,
      upi_reference: note || `Transfer from ${sender.fullName}`,
      created_at: timestamp,
      updated_at: timestamp,
    }

    mockTransactions.push(debitTransaction, creditTransaction)

    return NextResponse.json({
      success: true,
      transactionId,
      message: `₹${amount} sent successfully to ${recipient.fullName}`,
      newBalance: sender.walletBalance,
    })
  } catch (error) {
    console.error("Error sending money:", error)
    return NextResponse.json({ success: false, error: "Transfer failed" }, { status: 500 })
  }
}
