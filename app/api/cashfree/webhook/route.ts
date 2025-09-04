import { NextRequest, NextResponse } from "next/server";
import { clientPromise, dbOperations as db } from "@/lib/db";

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
    console.log("Received Cashfree webhook");
    
    // Parse the webhook payload
    const body = await request.json();
    console.log("Webhook payload:", body);
    
    // Verify the webhook signature (in production, you should verify this)
    // const signature = request.headers.get("x-webhook-signature");
    // if (!signature || !verifySignature(body, signature)) {
    //   console.error("Invalid webhook signature");
    //   return NextResponse.json({ success: false, error: "Invalid signature" }, { status: 401 });
    // }
    
    // Extract order details
    const { data } = body;
    if (!data || !data.order) {
      console.error("Missing order data in webhook");
      return NextResponse.json({ success: false, error: "Invalid webhook data" }, { status: 400 });
    }
    
    const { order } = data;
    const orderId = order.order_id;
    const orderStatus = order.order_status;
    const orderAmount = parseFloat(order.order_amount);
    const orderCurrency = order.order_currency;
    
    console.log(`Processing order ${orderId} with status ${orderStatus}`);
    
    // Only process PAID orders
    if (orderStatus !== "PAID") {
      console.log(`Order ${orderId} status is ${orderStatus}, not processing`);
      return NextResponse.json({ success: true, message: "Webhook received but not processed" });
    }
    
    // Check if this transaction has already been processed
    const existingTransaction = await db.getTransactionByHash(orderId);
    if (existingTransaction && existingTransaction.status === "completed") {
      console.log(`Order ${orderId} already processed`);
      return NextResponse.json({ success: true, message: "Order already processed" });
    }
    
    // If transaction exists but is pending, update it
    if (existingTransaction) {
      console.log(`Updating existing transaction ${orderId} to completed`);
      await db.updateTransactionStatus(existingTransaction._id.toString(), "completed");
      
      // Extract user ID from the transaction
      const userId = existingTransaction.user_id.toString();
      
      // Update user's wallet balance
      await db.updateUserBalance(userId, orderAmount);
      
      return NextResponse.json({
        success: true,
        message: "Payment confirmed and wallet updated"
      });
    }
    
    // If we don't have a transaction record, this is unexpected
    // In a real app, you might want to create a transaction record here
    console.error(`No transaction found for order ${orderId}`);
    return NextResponse.json({
      success: false,
      error: "Transaction not found"
    }, { status: 404 });
    
  } catch (error: any) {
    console.error("Error processing Cashfree webhook:", error?.message || error);
    console.error("Error stack:", error?.stack);
    return NextResponse.json({
      success: false,
      error: error?.message || "Failed to process webhook",
      details: process.env.NODE_ENV === 'development' ? error?.stack : "No stack trace available"
    }, { status: 500 });
  }
}