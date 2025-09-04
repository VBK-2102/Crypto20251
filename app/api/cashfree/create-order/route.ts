
import { NextRequest, NextResponse } from "next/server";

const CASHFREE_CLIENT_ID = "TEST10783812f10718d0b666328656b221838701";
const CASHFREE_CLIENT_SECRET = "cfsk_ma_test_055a585aa73adc293efd874e702cd10c_23aa53e9";
const CASHFREE_BASE_URL = "https://sandbox.cashfree.com/pg/orders";
const CASHFREE_AUTH_URL = "https://sandbox.cashfree.com/pg/v1/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount, currency, customer_id, customer_email, customer_phone } = body;

    if (!amount || !currency || !customer_id || !customer_email || !customer_phone) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }


    // 1. Get Cashfree access token
    const authRes = await fetch(CASHFREE_AUTH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-client-id": CASHFREE_CLIENT_ID,
        "x-client-secret": CASHFREE_CLIENT_SECRET,
      },
      body: JSON.stringify({}),
    });
    const authData = await authRes.json();
    if (!authData.data?.token) {
      throw new Error("Failed to get Cashfree access token");
    }
    const token = authData.data.token;

    // 2. Create order
    const orderRequest = {
      order_amount: amount,
      order_currency: currency,
      customer_details: {
        customer_id,
        customer_name: "",
        customer_email,
        customer_phone,
      },
      order_meta: {
        return_url: "https://test.cashfree.com/pgappsdemos/return.php?order_id=order_123",
      },
      order_note: "",
    };

    const orderRes = await fetch(CASHFREE_BASE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "x-api-version": "2022-09-01",
      },
      body: JSON.stringify(orderRequest),
    });
    const orderData = await orderRes.json();
    if (!orderRes.ok) {
      throw new Error(orderData.message || "Failed to create Cashfree order");
    }
    return NextResponse.json({ success: true, data: orderData });
  } catch (error: any) {
    console.error("Cashfree order error:", error?.message || error);
    return NextResponse.json({ success: false, error: error?.message || "Failed to create Cashfree order" }, { status: 500 });
  }
}
