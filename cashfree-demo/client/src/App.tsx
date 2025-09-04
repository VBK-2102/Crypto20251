import { useState } from "react";
import axios from "axios";


type CreateOrderResponse = {
  payment_session_id: string;
  order_id: string;
};

type OrderStatusResponse = {
  order_status: string;
};

function App() {
  const [amount, setAmount] = useState<number>(100);
  const [email, setEmail] = useState<string>("test@cashfree.com");
  const [phone, setPhone] = useState<string>("9999999999");
  const [loading, setLoading] = useState(false);
  const apiBase = process.env.REACT_APP_API_BASE || "http://localhost:5000";

  const openCheckout = async () => {
    try {
      setLoading(true);
      const { data } = await axios.post<CreateOrderResponse>(`${apiBase}/api/create-order`, {
        amount,
        email,
        phone,
      });

      const paymentSessionId: string = data?.payment_session_id;
      const orderId: string = data?.order_id;

      if (!paymentSessionId) {
        alert("Failed to create order");
        return;
      }

      const cashfree = (window as any).Cashfree({ mode: "sandbox" });

      const result = await cashfree.checkout({
        paymentSessionId,
        redirectTarget: "_modal",
      });

      console.log("Checkout result:", result);

      if (orderId) {
        const statusResp = await axios.get<OrderStatusResponse>(
          `${apiBase}/api/order-status/${orderId}`
        );
        const status = statusResp.data?.order_status;
        if (status === "PAID") {
          alert("✅ Payment Successful!");
        } else {
          alert(`ℹ️ Payment status: ${status || "Unknown"}`);
        }
      }
    } catch (err: any) {
      console.error(err);
      alert("Something went wrong. Check console.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 520, margin: "40px auto", fontFamily: "sans-serif" }}>
      <h2>Cashfree Payment (Sandbox)</h2>

      <label>
        Amount (₹):
        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          style={{ display: "block", marginBottom: 10, width: "100%" }}
        />
      </label>

      <label>
        Email:
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ display: "block", marginBottom: 10, width: "100%" }}
        />
      </label>

      <label>
        Phone:
        <input
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          style={{ display: "block", marginBottom: 20, width: "100%" }}
        />
      </label>

      <button
        onClick={openCheckout}
        disabled={loading}
        style={{
          padding: "10px 18px",
          borderRadius: 8,
          border: "none",
          cursor: "pointer",
          background: "#2e7d32",
          color: "white",
          fontSize: 16,
        }}
      >
        {loading ? "Processing..." : `Pay ₹${amount}`}
      </button>
    </div>
  );
}

export default App;
