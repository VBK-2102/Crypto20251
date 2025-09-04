import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { dbOperations as db, clientPromise } from '@/lib/db';
import { paymentGateways } from '@/lib/payment-gateways';

// Establish database connection at module level to improve reliability
let dbConnectionPromise = clientPromise.catch(err => {
  console.error("Failed to connect to database:", err);
  throw err;
});

export async function POST(request: NextRequest) {
  // Ensure database connection is established before proceeding
  try {
    await dbConnectionPromise;
  } catch (error) {
    console.error("Database connection error:", error);
    return NextResponse.json({ 
      success: false, 
      error: "Database connection failed", 
      details: error instanceof Error ? error.message : "Unknown error" 
    }, { status: 500 });
  }
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { transactionId, paymentId, gateway = 'default' } = body;

    if (!transactionId) {
      return NextResponse.json({ success: false, error: 'Transaction ID is required' }, { status: 400 });
    }

    // Get transaction details
    const transaction = await db.getTransactionByHash(transactionId);
    if (!transaction) {
      return NextResponse.json({ success: false, error: 'Transaction not found' }, { status: 404 });
    }

    // Verify payment with the payment gateway
    const verificationResult = await paymentGateways.verifyPayment({
      paymentId: paymentId || transaction.upi_reference,
      amount: transaction.amount,
      currency: transaction.currency,
      gateway: gateway as 'stripe' | 'paypal' | 'razorpay' | 'default'
    });

    if (!verificationResult.success) {
      return NextResponse.json({ 
        success: false, 
        error: verificationResult.error || 'Payment verification failed' 
      }, { status: 400 });
    }

    // Update transaction status to completed
    const updateResult = await db.updateTransactionStatus(transaction._id.toString(), "completed");
    if (!updateResult) {
      return NextResponse.json({ success: false, error: 'Failed to update transaction status' }, { status: 500 });
    }

    // Update user balance
    const newBalance = await db.updateUserBalance(transaction.userId, transaction.amount, transaction.currency);
    if (!newBalance) {
      return NextResponse.json({ success: false, error: 'Failed to update user balance' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `${transaction.currency} ${transaction.amount} added successfully to your wallet`,
      newBalance,
      transaction,
    })
  } catch (error) {
    console.error('Error confirming payment:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}