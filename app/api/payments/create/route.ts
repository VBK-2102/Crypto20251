import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { mockTransactions, updateUserBalance, mockWallets } from "@/lib/mock-data"

export async function POST(request: NextRequest) {
  try {
    const user = await auth.getUserFromRequest(request)

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const { amount, currency, targetCrypto } = await request.json()

    if (!amount || !currency || !targetCrypto) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    // In a real app, you'd use a payment gateway to create a payment session
    // and get a transaction ID. Here, we'll just create a mock transaction.

    const transactionId = `MOCK_TXN_${Date.now()}`
    const rate = 30000 // Mock exchange rate
    const fees = 5 // Mock fees

    const newTransaction = {
      transaction_id: mockTransactions.length + 1,
      user_id: user.userId,
      transaction_hash: transactionId,
      amount: amount,
      currency: currency,
      type: "deposit",
      status: "pending",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      payment_method: "card",
      crypto_amount: amount / rate,
      crypto_currency: targetCrypto,
      fee: fees,
    }

    mockTransactions.push(newTransaction)

    return NextResponse.json({
      success: true,
      transactionId,
      amount,
      currency,
      targetCrypto,
      rate,
      fees,
      expectedCrypto: (amount - fees) / rate,
    })
  } catch (error) {
    console.error("Payment creation error:", error)
    return NextResponse.json({ success: false, error: "Failed to create payment" }, { status: 500 })
  }
}