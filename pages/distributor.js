import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { createClient } from "@supabase/supabase-js";
import products from "../data/products.json";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Distributor() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [outstanding, setOutstanding] = useState(0);
  const [ready, setReady] = useState(false);

  const [cart, setCart] = useState({});
  const [msg, setMsg] = useState("");

  // Payment states
  const [showPayBox, setShowPayBox] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payMsg, setPayMsg] = useState("");

  const distributorNames = {
    "dist1@vfive.com": "Vijayakumar",
    "dist2@vfive.com": "Senthil Kumar",
  };

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) return router.push("/");

      const userEmail = session.user.email.toLowerCase();
      setEmail(userEmail);

      const dName = distributorNames[userEmail];
      if (!dName) return router.push("/");

      setName(dName);

      const { data: acc } = await supabase
        .from("accounts")
        .select("outstanding")
        .eq("email", userEmail)
        .single();

      if (acc) setOutstanding(acc.outstanding);

      const c = {};
      products.forEach((p) => (c[p.id] = 0));
      setCart(c);

      setReady(true);
    }

    init();
  }, []);

  function update(id, value) {
    setCart((prev) => ({ ...prev, [id]: Number(value) }));
  }

  async function submit() {
    const res = await fetch("/api/place-order", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        cart,
        from_email: email,
        from_name: name,
      }),
    });

    const j = await res.json();
    if (j.ok) {
      setMsg("Order placed successfully!");
    } else {
      setMsg("Failed: " + j.error);
    }
  }

  // PAY NOW FUNCTION
  async function payNow() {
    if (!payAmount || isNaN(payAmount)) {
      return setPayMsg("Enter valid amount.");
    }

    const amt = Number(payAmount);

    const { error } = await supabase.rpc("increment_outstanding", {
      email_input: email,
      amount: -amt, // SUBTRACT
    });

    if (error) {
      setPayMsg("Payment failed: " + error.message);
      return;
    }

    const { data: acc } = await supabase
      .from("accounts")
      .select("outstanding")
      .eq("email", email)
      .single();

    if (acc) setOutstanding(acc.outstanding);

    setPayMsg("Payment successful!");
    setPayAmount("");
    setShowPayBox(false);
  }

  if (!ready) return <p style={{ padding: 20 }}>Loading…</p>;

  return (
    <div style={{ padding: 24, maxWidth: 650, margin: "auto" }}>

      {/* Header Card */}
      <div style={{
        background: "#fff",
        padding: 22,
        borderRadius: 14,
        boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
        border: "1px solid #eee"
      }}>
        <h1 style={{ marginBottom: 6, fontSize: 26, fontWeight: 700 }}>
          Distributor — {name}
        </h1>
        <p style={{ color: "#64748b", margin: "4px 0" }}>
          Email: <b>{email}</b>
        </p>

        {/* Outstanding Box */}
        <div
          style={{
            background: "#fff",
            marginTop: 12,
            padding: 16,
            borderRadius: 12,
            border: "1px solid #eee",
            boxShadow: "0 3px 10px rgba(0,0,0,0.05)",
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 600 }}>Outstanding Amount</div>

          <div
            style={{
              fontSize: 22,
              marginTop: 6,
              fontWeight: 700,
              color: "#ef4444",
            }}
          >
            ₹ {outstanding}
          </div>

          <button
            onClick={() => setShowPayBox(true)}
            style={{
              marginTop: 12,
              padding: "10px 16px",
              background: "#16a34a",
              color: "#fff",
              borderRadius: 10,
              fontSize: 16,
              border: "none",
              cursor: "pointer",
              boxShadow: "0 3px 10px rgba(22,163,74,0.3)",
            }}
          >
            Pay Now
          </button>
        </div>
      </div>

      {/* Product Cards */}
      <div style={{ marginTop: 22 }}>
        {products.map((p) => (
          <div
            key={p.id}
            style={{
              background: "#fff",
              padding: 18,
              borderRadius: 14,
              boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
              border: "1px solid #eee",
              marginBottom: 14,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}
          >
            <div>
              <div style={{ fontSize: 18, fontWeight: 600 }}>{p.name}</div>
              <div style={{ fontSize: 14, color: "#64748b", marginTop: 4 }}>
                ₹ {p.rate}
              </div>
            </div>

            <input
              type="number"
              min="0"
              value={cart[p.id] || 0}
              onChange={(e) => update(p.id, e.target.value)}
              style={{
                width: 90,
                padding: 10,
                borderRadius: 10,
                border: "1px solid #d1d5db",
                fontSize: 15
              }}
            />
          </div>
        ))}
      </div>

      {/* Submit Button */}
      <button
        onClick={submit}
        style={{
          marginTop: 20,
          width: "100%",
          padding: "14px 10px",
          background: "#2563eb",
          color: "#fff",
          borderRadius: 10,
          fontSize: 17,
          fontWeight: 600,
          boxShadow: "0 3px 10px rgba(37,99,235,0.3)",
          border: "none",
          cursor: "pointer"
        }}
      >
        Submit Order
      </button>

      <p style={{ marginTop: 12, textAlign: "center", color: "#2563eb" }}>
        {msg}
      </p>

      {/* Pay Popup Modal */}
      {showPayBox && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            zIndex: 999,
          }}
        >
          <div
            style={{
              background: "#fff",
              padding: 24,
              borderRadius: 14,
              width: "90%",
              maxWidth: 350,
              boxShadow: "0 6px 20px rgba(0,0,0,0.2)",
            }}
          >
            <h3 style={{ marginBottom: 10 }}>Make Payment</h3>

            <input
              type="number"
              placeholder="Enter amount"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 10,
                border: "1px solid #d1d5db",
                fontSize: 15,
              }}
            />

            <button
              onClick={payNow}
              style={{
                width: "100%",
                marginTop: 12,
                padding: 12,
                background: "#2563eb",
                color: "#fff",
                borderRadius: 10,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Pay
            </button>

            <button
              onClick={() => setShowPayBox(false)}
              style={{
                width: "100%",
                marginTop: 8,
                padding: 12,
                background: "#e5e7eb",
                color: "#000",
                borderRadius: 10,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>

            <p style={{ color: "green", marginTop: 6 }}>{payMsg}</p>
          </div>
        </div>
      )}

    </div>
  );
}
