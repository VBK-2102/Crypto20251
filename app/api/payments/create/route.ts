import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { dbOperations as db, clientPromise } from '@/lib/db';
import { paymentGateways } from '@/lib/payment-gateways';

export async function POST(request: NextRequest) {
  await clientPromise; // Ensure DB connection is established
  try {
    const user = await auth.getUserFromRequest(request)

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const { amount, currency, targetCrypto, paymentMethod = "upi" } = await request.json()

    if (!amount || !currency || !targetCrypto) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    // Generate a unique transaction ID
    const transactionId = `TXN_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`
    
    // Get current exchange rate from the database or external API
    // For now, we'll use a mock rate
    const rate = 30000 // Mock exchange rate for BTC in INR
    const fees = amount * 0.02 // 2% fee

    // Create a payment session with the appropriate payment gateway
    const paymentResponse = await paymentGateways.createPayment({
      amount,
      currency,
      description: `Add ${amount} ${currency} to wallet`,
      metadata: {
        userId: user.userId,
        targetCrypto,
        transactionId
      },
      returnUrl: `${request.headers.get('origin') || 'http://localhost:3000'}/payment/success?txnId=${transactionId}`,
      cancelUrl: `${request.headers.get('origin') || 'http://localhost:3000'}/payment/cancel?txnId=${transactionId}`,
    }, paymentMethod);

    if (!paymentResponse.success) {
      return NextResponse.json({ 
        success: false, 
        error: paymentResponse.error || "Failed to create payment with gateway" 
      }, { status: 500 });
    }

    // Create a new transaction in the database
    const newTransaction = {
      user_id: user.userId,
      transaction_hash: transactionId,
      amount: amount,
      currency: currency,
      type: "deposit",
      status: "pending",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      payment_method: paymentMethod,
      crypto_amount: (amount - fees) / rate,
      crypto_currency: targetCrypto,
      fee: fees,
      upi_reference: paymentResponse.paymentId || `${paymentMethod.toUpperCase()}_REF_${Date.now()}`
    }

    // Save transaction to database
    await db.createTransaction(newTransaction);

    return NextResponse.json({
      success: true,
      transactionId,
      amount,
      currency,
      targetCrypto,
      rate,
      fees,
      expectedCrypto: (amount - fees) / rate,
      paymentUrl: paymentResponse.paymentUrl,
      paymentId: paymentResponse.paymentId
    })
  } catch (error) {
    console.error("Payment creation error:", error)
    return NextResponse.json({ success: false, error: "Failed to create payment" }, { status: 500 })
  }
}