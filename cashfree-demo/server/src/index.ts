import express from "express";
import cors from "cors";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:3000";
app.use(cors({ origin: [
  CLIENT_ORIGIN,
 "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://192.168.1.61:3000",
    "http://localhost:3001"
] }));

const APP_ID = process.env.CASHFREE_APP_ID!;
const SECRET_KEY = process.env.CASHFREE_SECRET_KEY!;
const API_VERSION = process.env.CASHFREE_API_VERSION || "2023-08-01";
const BASE = process.env.CASHFREE_BASE || "https://sandbox.cashfree.com/pg";
const PORT = Number(process.env.PORT || 5000);

if (!APP_ID || !SECRET_KEY) {
  console.error("❌ Missing CASHFREE_APP_ID or CASHFREE_SECRET_KEY in .env");
  process.exit(1);
}

app.post("/api/create-order", async (req, res) => {
  try {
    const { amount, email, phone } = req.body;

    const orderId = "order_" + Date.now();

    const payload = {
      order_id: orderId,
      order_amount: Number(amount || 100),
      order_currency: "INR",
      customer_details: {
        customer_id: "cust_" + Date.now(),
        customer_email: email || "test@cashfree.com",
        customer_phone: phone || "9999999999"
      },
      order_meta: {
        return_url: `http://localhost:5173/return?order_id={order_id}`
      }
    };

    const headers = {
      "x-client-id": APP_ID,
      "x-client-secret": SECRET_KEY,
      "x-api-version": API_VERSION,
      "Content-Type": "application/json"
    };

    const resp = await axios.post(`${BASE}/orders`, payload, { headers });
    res.json({ ...resp.data, order_id: orderId });
  } catch (err: any) {
    console.error("Create order error:", err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

app.get("/api/order-status/:order_id", async (req, res) => {
  try {
    const { order_id } = req.params;
    const headers = {
      "x-client-id": APP_ID,
      "x-client-secret": SECRET_KEY,
      "x-api-version": API_VERSION
    };
    const resp = await axios.get(`${BASE}/orders/${order_id}`, { headers });
    res.json(resp.data);
  } catch (err: any) {
    console.error("Get order error:", err.response?.data || err.message);
    res.status(500).json({ error: err.response?.data || err.message });
  }
});

app.post("/api/webhook/cashfree", (req, res) => {
  console.log("Webhook received:", req.headers, req.body);
  res.sendStatus(200);
});

app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
