import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { dbOperations as db, clientPromise, ObjectId } from '@/lib/db';
import { paymentGateways } from '@/lib/payment-gateways';
import { v4 as uuidv4 } from 'uuid';
export const dynamic = 'force-dynamic';

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
    const user = await auth.getUserFromRequest(request)

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 })
    }

    const { amount, currency, withdrawalMethod, accountDetails, gateway = 'default' } = await request.json()

    if (!amount || !currency || !withdrawalMethod || !accountDetails) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 })
    }

    // Check if user has sufficient balance
    const userData = await db.getUserById(user.userId);
    if (!userData) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 })
    }
    
    const userBalance = userData.wallet_balance?.[currency] || 0;
    if (userBalance < amount) {
      return NextResponse.json({ success: false, error: "Insufficient balance" }, { status: 400 })
    }

    // Generate a unique transaction ID
    const transactionId = uuidv4()
    
    // Calculate fees (e.g., 1% for withdrawals)
    const fees = amount * 0.01;
    const netAmount = amount - fees;

    // Create a withdrawal transaction in the database
    const withdrawalTransaction = {
      user_id: new ObjectId(user.userId),
      transaction_hash: transactionId,
      amount: -amount, // Negative amount for withdrawal
      currency: currency,
      type: "withdrawal" as const,
  status: "pending" as const, // Initially pending until processed
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      payment_method: withdrawalMethod,
      fee: fees,
      receiver_address: accountDetails // Store account details in receiver_address
    }

    // Save transaction to database
    await db.createTransaction(withdrawalTransaction);

    // Update user's balance
    const newBalance = await db.updateUserBalance(user.userId, -amount);

    // Process the withdrawal through the payment gateway
    try {
      const withdrawalResult = await paymentGateways.processWithdrawal({
        amount: netAmount,
        currency,
        method: withdrawalMethod,
        accountDetails,
        userId: user.userId,
        transactionId,
        gateway: gateway as 'stripe' | 'paypal' | 'razorpay' | 'default'
      });

      if (!withdrawalResult.success) {
        // If withdrawal fails, rollback the transaction and balance
        await db.updateTransactionStatus(transactionId, "failed");
        await db.updateUserBalance(user.userId, amount); // Refund the amount
        return NextResponse.json({ 
          success: false, 
          error: withdrawalResult.error || "Withdrawal processing failed" 
        }, { status: 400 });
      }

      // For demo purposes, simulate a delay and then mark the transaction as completed
      // In a real app, this would be handled by a webhook from the payment gateway
      setTimeout(async () => {
        try {
          await db.updateTransactionStatus(transactionId, "completed");
          console.log(`Withdrawal ${transactionId} marked as completed`);
        } catch (error) {
          console.error(`Failed to update withdrawal status for ${transactionId}:`, error);
        }
      }, 5000); // Simulate 5 second processing time

      return NextResponse.json({
        success: true,
        message: `Withdrawal of ${currency} ${netAmount.toFixed(2)} initiated`,
        transactionId,
        amount: netAmount,
        fees,
        currency,
        withdrawalMethod,
        status: "pending",
        newBalance
      })
    } catch (error) {
      console.error("Withdrawal error:", error)
      return NextResponse.json({ success: false, error: "Failed to process withdrawal" }, { status: 500 })
    }
  } catch (error) {
    console.error("Unexpected error in withdrawal endpoint:", error)
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 })
  }
}
