import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { dbOperations as db, clientPromise } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export async function POST(request: NextRequest) {
  await clientPromise; // Ensure DB connection is established
  try {
    const user = await auth.getUserFromRequest(request)

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const { amount, currency, paymentToken } = await request.json()

    if (!amount || !currency || !paymentToken) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    // In a real implementation, you would validate the Google Pay token with Google's API
    // For this example, we'll assume the payment is valid

    // Generate a unique transaction ID
    const transactionId = `GPAY_${uuidv4()}`;
    
    try {
      // Create a transaction record
      const transaction = await db.createTransaction({
        user_id: user.userId,
        type: 'deposit',
        amount: parseFloat(amount),
        currency: currency,
        status: 'completed', // Mark as completed immediately since Google Pay is instant
        payment_method: 'Google Pay',
        transaction_hash: transactionId,
      });

      // Update user's wallet balance
      const newBalance = await db.updateUserBalance(user.userId, parseFloat(amount));

      return NextResponse.json({
        success: true,
        message: `${currency} ${amount} added successfully to your wallet`,
        transactionId,
        newBalance,
        transaction,
      });
    } catch (error) {
      console.error('Error processing Google Pay payment:', error);
      return NextResponse.json({ success: false, error: 'Failed to process payment' }, { status: 500 });
    }
  } catch (error) {
    console.error("Google Pay payment error:", error)
    return NextResponse.json({ success: false, error: "Failed to process Google Pay payment" }, { status: 500 })
  }
}