import { NextResponse } from 'next/server';
import { dbOperations as db, clientPromise } from '@/lib/db';

export async function POST(request: Request) {
  await clientPromise; // Ensure DB connection is established
  try {
    const body = await request.json();
    console.log('Webhook received:', body);

    const { userId, amount, currency, transactionId, status, paymentId } = body;

    if (!userId || !amount || !currency) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    const parsedUserId = userId.toString()
    
    // Check if transaction already exists
    const existingTransaction = await db.getTransactionByHash(transactionId);
    if (existingTransaction) {
      return NextResponse.json({ success: true, message: 'Webhook already processed' });
    }

    try {
      // Update user's wallet balance
      await db.updateUserBalance(parsedUserId, amount);

      // Optionally, create a transaction record
      await db.createTransaction({
        user_id: parsedUserId,
        type: 'deposit',
        amount: amount,
        currency: currency,
        status: 'completed',
        payment_method: 'Simulated Payment',
        transaction_hash: transactionId,
        upi_reference: paymentId,
      });
    } catch (error) {
      console.error('Error updating balance or creating transaction:', error);
      // TODO: Implement a retry mechanism or a way to handle this failure
      return NextResponse.json({ success: false, error: 'Failed to update wallet' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Webhook processed successfully and wallet updated' });
  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json({ success: false, error: 'Failed to process webhook' }, { status: 500 });
  }
}