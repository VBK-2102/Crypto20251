
import { NextRequest, NextResponse } from "next/server";
export const dynamic = 'force-dynamic';
const CASHFREE_CLIENT_ID = "TEST10783812f10718d0b666328656b221838701";
const CASHFREE_CLIENT_SECRET = "cfsk_ma_test_055a585aa73adc293efd874e702cd10c_23aa53e9";
const CASHFREE_BASE_URL = "https://sandbox.cashfree.com/pg/orders";
const CASHFREE_API_VERSION = "2022-09-01";

export async function POST(request: NextRequest) {
  try {
    console.log("Received request to create Cashfree order");
    const body = await request.json();
    console.log("Request body:", body);
    const { amount, currency, customer_id, customer_email, customer_phone } = body;

    if (!amount || !currency || !customer_id || !customer_email || !customer_phone) {
      console.log("Missing required fields:", { amount, currency, customer_id, customer_email, customer_phone });
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }


    // Direct authentication with client ID and secret
    console.log("Preparing to create Cashfree order with direct authentication");

    // 2. Create order
    console.log("Creating Cashfree order");
    const orderId = "order_" + Date.now() + "_" + Math.random().toString(36).substring(2, 10);
    console.log("Generated order ID:", orderId);
    
    const orderRequest = {
      order_id: orderId,
      order_amount: amount,
      order_currency: currency,
      customer_details: {
        customer_id,
        customer_name: "Customer",
        customer_email,
        customer_phone,
      },
      order_meta: {
        return_url: `${request.headers.get('origin') || 'http://localhost:3000'}/payment/success?order_id={order_id}`,
        notify_url: `${request.headers.get('origin') || 'http://localhost:3000'}/api/cashfree/webhook`
      },
      order_expiry_time: new Date(Date.now() + 30 * 60 * 1000).toISOString(), // 30 minutes from now
      order_note: "Payment for crypto",
    };
    
    console.log("Order request:", orderRequest);

    const orderRes = await fetch(CASHFREE_BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-client-id": CASHFREE_CLIENT_ID,
        "x-client-secret": CASHFREE_CLIENT_SECRET,
        "x-api-version": CASHFREE_API_VERSION,
      },
      body: JSON.stringify(orderRequest),
    });
    
    console.log("Order response status:", orderRes.status);
    const orderData = await orderRes.json();
    console.log("Order response data:", orderData);
    
    if (!orderRes.ok) {
      console.error("Failed to create Cashfree order", orderData);
      return NextResponse.json(
        { success: false, error: "Failed to create Cashfree order", details: orderData },
        { status: 500 }
      );
    }

    // Format response to match what the frontend expects
    return NextResponse.json({
      success: true,
      data: {
        payment_session_id: orderData.payment_session_id,
        order_id: orderData.order_id,
        order_status: orderData.order_status
      }
    });
  } catch (error: any) {
    console.error("Cashfree order error:", error?.message || error);
    console.error("Error stack:", error?.stack);
    return NextResponse.json({ 
      success: false, 
      error: error?.message || "Failed to create Cashfree order",
      details: process.env.NODE_ENV === 'development' ? error?.stack : "No stack trace available"
    }, { status: 500 });
  }
}
