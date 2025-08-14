import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { dbOperations as db, clientPromise } from '@/lib/db';

export async function GET(request: Request) {
  await clientPromise; // Ensure DB connection is established
  try {
    // Get the transaction ID from the URL
    const url = new URL(request.url);
    const transactionId = url.searchParams.get('transactionId');

    if (!transactionId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Transaction ID is required' 
      }, { status: 400 });
    }

    // Authenticate the user
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Get the transaction from the database
    const transaction = await db.getTransactionByHash(transactionId);
    
    if (!transaction) {
      return NextResponse.json({ 
        success: false, 
        error: 'Transaction not found' 
      }, { status: 404 });
    }

    // Verify that the transaction belongs to the authenticated user
    if (transaction.user_id.toString() !== userId) {
      return NextResponse.json({ 
        success: false, 
        error: 'Unauthorized access to transaction' 
      }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      transactionId,
      status: transaction.status,
      amount: Math.abs(transaction.amount), // Convert negative amount to positive for display
      currency: transaction.currency,
      timestamp: transaction.created_at,
      withdrawalMethod: transaction.payment_method,
      fee: transaction.fee
    });
  } catch (error) {
    console.error('Error checking withdrawal status:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}