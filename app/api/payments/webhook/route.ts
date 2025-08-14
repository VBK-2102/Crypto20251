import { NextResponse } from 'next/server';
import { dbOperations as db, clientPromise } from '@/lib/db';
import { paymentGateways } from '@/lib/payment-gateways';

export async function POST(request: Request) {
  await clientPromise; // Ensure DB connection is established
  try {
    const body = await request.json();
    console.log('Webhook received:', body);

    // Get the signature from headers for verification
    const signature = request.headers.get('stripe-signature') || 
                     request.headers.get('x-razorpay-signature') || 
                     request.headers.get('paypal-signature') || '';
    
    // Determine which payment gateway sent the webhook
    let gateway: 'stripe' | 'paypal' | 'razorpay' = 'stripe';
    if (request.headers.get('x-razorpay-signature')) {
      gateway = 'razorpay';
    } else if (request.headers.get('paypal-signature')) {
      gateway = 'paypal';
    }
    
    // Verify the webhook signature (in production, this would be a critical security step)
    const isValid = paymentGateways.verifyWebhookSignature(body, signature, gateway);
    if (!isValid) {
      console.error('Invalid webhook signature');
      return NextResponse.json({ success: false, error: 'Invalid signature' }, { status: 401 });
    }

    // Extract data based on the payment gateway
    let userId, amount, currency, transactionId, status, paymentId;
    
    if (gateway === 'stripe') {
      // Handle Stripe webhook
      const event = body;
      if (event.type === 'checkout.session.completed') {
        const session = event.data.object;
        transactionId = session.metadata?.transactionId;
        userId = session.metadata?.userId;
        amount = session.amount_total / 100; // Convert from cents
        currency = session.currency.toUpperCase();
        status = 'success';
        paymentId = session.payment_intent;
      } else {
        // We only care about checkout.session.completed events
        return NextResponse.json({ success: true, message: 'Webhook received but not processed' });
      }
    } else if (gateway === 'paypal') {
      // Handle PayPal webhook
      if (body.event_type === 'CHECKOUT.ORDER.APPROVED') {
        const resource = body.resource;
        transactionId = resource.purchase_units[0]?.custom_id;
        userId = resource.purchase_units[0]?.custom_id?.split('_')[0];
        amount = parseFloat(resource.purchase_units[0]?.amount?.value);
        currency = resource.purchase_units[0]?.amount?.currency_code;
        status = 'success';
        paymentId = resource.id;
      } else {
        // We only care about CHECKOUT.ORDER.APPROVED events
        return NextResponse.json({ success: true, message: 'Webhook received but not processed' });
      }
    } else if (gateway === 'razorpay') {
      // Handle Razorpay webhook
      if (body.event === 'payment.authorized') {
        const payload = body.payload.payment.entity;
        transactionId = payload.notes?.transactionId;
        userId = payload.notes?.userId;
        amount = payload.amount / 100; // Convert from paise
        currency = payload.currency;
        status = 'success';
        paymentId = payload.id;
      } else {
        // We only care about payment.authorized events
        return NextResponse.json({ success: true, message: 'Webhook received but not processed' });
      }
    } else {
      // For simulation and backward compatibility
      ({ userId, amount, currency, transactionId, status, paymentId } = body);
    }
    
    // Log the extracted fields for debugging
    console.log('Webhook fields:', { userId, amount, currency, transactionId, status, paymentId });
    
    if (!userId || !amount || !currency || !transactionId) {
      console.error('Missing required fields in webhook:', { userId, amount, currency, transactionId });
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