"use client";

import React, { useState } from "react";

interface CashfreeCardFormProps {
  user?: { email?: string; phone?: string };
  onSuccess?: () => void;
}

const CashfreeCardForm: React.FC<CashfreeCardFormProps> = ({ user, onSuccess }) => {
  const [amount, setAmount] = useState<number>(100);
  const [loading, setLoading] = useState(false);

  // Use user email/phone if available, else fallback to demo
  const email = user?.email || "test@cashfree.com";
  const phone = user?.phone || "9999999999";

  const handlePay = async () => {
    try {
      setLoading(true);
      // Call backend to create order
      const res = await fetch("http://localhost:5000/api/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, email, phone }),
      });
      const data = await res.json();
      const paymentSessionId = data.payment_session_id;
      if (!paymentSessionId) {
        alert("Failed to create order");
        return;
      }
      // Open Cashfree checkout modal
      const cashfree = (window as any).Cashfree({ mode: "sandbox" });
      await cashfree.checkout({
        paymentSessionId,
        redirectTarget: "_modal",
      });
      // Optionally, check payment status here
      if (onSuccess) onSuccess();
    } catch (err) {
      alert("Payment failed. See console for details.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 16 }}>
      <h3 style={{ marginBottom: 12 }}>Add Money via Cashfree</h3>
      <label style={{ display: "block", marginBottom: 8 }}>
        Amount (₹):
        <input
          type="number"
          value={amount}
          min={1}
          onChange={e => setAmount(Number(e.target.value))}
          style={{ width: "100%", padding: 8, marginTop: 4, borderRadius: 4, border: "1px solid #ccc" }}
        />
      </label>
      <div style={{ marginBottom: 8 }}>
        <strong>Email:</strong> {email}
      </div>
      <div style={{ marginBottom: 16 }}>
        <strong>Phone:</strong> {phone}
      </div>
      <button
        onClick={handlePay}
        disabled={loading || amount < 1}
        style={{
          padding: "12px 24px",
          fontSize: "16px",
          cursor: loading || amount < 1 ? "not-allowed" : "pointer",
          backgroundColor: loading || amount < 1 ? "#a0a0a0" : "#2361d5",
          color: "#fff",
          border: "none",
          borderRadius: "6px",
          transition: "background-color 0.3s ease",
        }}
      >
        {loading ? "Processing..." : `Pay ₹${amount}`}
      </button>
    </div>
  );
};

export default CashfreeCardForm;
