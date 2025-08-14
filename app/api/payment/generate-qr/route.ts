import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { mockTransactions } from "@/lib/mock-data"

// Simple QR code generation with fallback
function generateMockQR(amount: number, transactionId: string): string {
  try {
    // Primary: Use QR Server API for generating QR codes
    const upiString = `upi://pay?pa=9741721110@superyes&pn=CryptoPay&am=${amount}&cu=INR&tn=Payment%20for%20${transactionId}`
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(upiString)}`

    return qrUrl
  } catch (error) {  
    // Fallback: Return a placeholder QR code image
    return `/placeholder.svg?height=300&width=300&text=UPI%20QR%20Code%20₹${amount}`
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await auth.getUserFromRequest(request)

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const { amount, currency } = await request.json()

    if (!amount || amount <= 0) {
      return NextResponse.json({ success: false, error: "Invalid amount" }, { status: 400 })
    }

    const transactionId = `TXN${Date.now()}`
    const qrCode = generateMockQR(amount, transactionId)

    // Create pending transaction
    const newTransaction = {
      id: mockTransactions.length + 1,
      user_id: user.userId,
      type: "deposit" as const,
      amount: amount,
      currency: currency,
      status: "pending" as const,
      payment_method: "UPI",
      transaction_hash: transactionId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    mockTransactions.push(newTransaction)

    return NextResponse.json({
      success: true,
      transactionId,
      qrCode,
      amount,
      currency,
      status: "pending",
    })
  } catch (error) {
    console.error("QR Generation error:", error)
    return NextResponse.json({ success: false, error: "Failed to generate QR code" }, { status: 500 })
  }
}
