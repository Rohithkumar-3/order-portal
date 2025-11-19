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

  // Payment modal state
  const [showPayBox, setShowPayBox] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payNote, setPayNote] = useState("");
  const [payMsg, setPayMsg] = useState("");

  // Histories
  const [payments, setPayments] = useState([]);
  const [orders, setOrders] = useState([]);

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

      // load outstanding, payments, orders
      await refreshOutstanding(userEmail);
      await loadPayments(userEmail);
      await loadOrders(userEmail);

      const c = {};
      products.forEach((p) => (c[p.id] = 0));
      setCart(c);

      setReady(true);
    }

    init();
  }, []);

  async function refreshOutstanding(userEmail) {
    try {
      const { data: acc, error } = await supabase
        .from("accounts")
        .select("outstanding")
        .eq("email", userEmail)
        .single();

      if (error) {
        console.error("Error loading outstanding:", error);
        return;
      }
      if (acc) setOutstanding(acc.outstanding);
    } catch (err) {
      console.error(err);
    }
  }

  async function loadPayments(userEmail) {
    try {
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .eq("email", userEmail)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Load payments error:", error);
        return;
      }
      setPayments(data || []);
    } catch (err) {
      console.error(err);
    }
  }

  async function loadOrders(userEmail) {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .eq("from_email", userEmail)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Load orders error:", error);
        return;
      }
      setOrders(data || []);
    } catch (err) {
      console.error(err);
    }
  }

  function update(id, value) {
    setCart((prev) => ({ ...prev, [id]: Number(value) }));
  }

  async function submit() {
    setMsg("Placing order...");
    try {
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
      console.log("ORDER RESPONSE:", j);

      if (j.ok) {
        setMsg("Order placed successfully!");
        // refresh outstanding and orders
        await refreshOutstanding(email);
        await loadOrders(email);
      } else {
        setMsg("Failed: " + (j.error || JSON.stringify(j)));
      }
    } catch (err) {
      console.error("Submit error:", err);
      setMsg("Failed: " + err.message);
    }
  }

  // Pay Now: insert payment record, decrement outstanding
  async function payNow() {
    setPayMsg("");
    if (!payAmount || isNaN(payAmount) || Number(payAmount) <= 0) {
      return setPayMsg("Enter a valid amount.");
    }

    const amt = Number(payAmount);
    try {
      // Insert payment row
      const { error: insErr } = await supabase.from("payments").insert([
        {
          email,
          name,
          amount: amt,
          note: payNote || null,
        },
      ]);

      if (insErr) {
        console.error("Payment insert error:", insErr);
        setPayMsg("Payment failed: " + insErr.message);
        return;
      }

      // Decrease outstanding using RPC (preferred)
      const { error: decErr } = await supabase.rpc("decrement_outstanding", {
        email_input: email,
        amount: amt,
      });

      if (decErr) {
        console.error("decrement_outstanding error:", decErr);
        setPayMsg("Payment recorded but failed to update outstanding: " + decErr.message);
        // still refresh payments history
        await loadPayments(email);
        return;
      }

      // Refresh outstanding & payment history
      await refreshOutstanding(email);
      await loadPayments(email);

      setPayMsg("Payment successful!");
      setPayAmount("");
      setPayNote("");
      setShowPayBox(false);
    } catch (err) {
      console.error("PayNow error:", err);
      setPayMsg("Payment failed: " + (err.message || String(err)));
    }
  }

  if (!ready) return <p style={{ padding: 20 }}>Loading…</p>;

  return (
    <div style={{ padding: 24, maxWidth: 920, margin: "auto" }}>
      {/* Header Card */}
      <div
        style={{
          background: "#fff",
          padding: 22,
          borderRadius: 14,
          boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
          border: "1px solid #eee",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <div>
          <h1 style={{ marginBottom: 6, fontSize: 26, fontWeight: 700 }}>
            Distributor — {name}
          </h1>
          <p style={{ color: "#64748b", margin: "4px 0" }}>
            Email: <b>{email}</b>
          </p>
        </div>

        {/* Outstanding Card */}
        <div
          style={{
            background: "#fff",
            marginLeft: 16,
            padding: 16,
            borderRadius: 12,
            border: "1px solid #eee",
            boxShadow: "0 3px 10px rgba(0,0,0,0.05)",
            minWidth: 220,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 14, color: "#64748b" }}>Outstanding</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "#ef4444", marginTop: 6 }}>
            ₹ {outstanding}
          </div>
          <button
            onClick={() => setShowPayBox(true)}
            style={{
              marginTop: 12,
              padding: "8px 12px",
              background: "#16a34a",
              color: "#fff",
              borderRadius: 8,
              border: "none",
              cursor: "pointer",
            }}
          >
            Pay Now
          </button>
        </div>
      </div>

      {/* Main area: left = products, right = history */}
      <div style={{ display: "flex", gap: 20, marginTop: 22, alignItems: "flex-start" }}>
        {/* Left: Products & Submit */}
        <div style={{ flex: 1 }}>
          <div>
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
                  alignItems: "center",
                }}
              >
                <div>
                  <div style={{ fontSize: 18, fontWeight: 600 }}>{p.name}</div>
                  <div style={{ fontSize: 14, color: "#64748b", marginTop: 4 }}>₹ {p.rate}</div>
                </div>

                <input
                  type="number"
                  min="0"
                  value={cart[p.id] || 0}
                  onChange={(e) => update(p.id, e.target.value)}
                  style={{
                    width: 100,
                    padding: 10,
                    borderRadius: 10,
                    border: "1px solid #d1d5db",
                    fontSize: 15,
                    textAlign: "center",
                  }}
                />
              </div>
            ))}
          </div>

          <button
            onClick={submit}
            style={{
              marginTop: 10,
              width: "100%",
              padding: "12px 10px",
              background: "#2563eb",
              color: "#fff",
              borderRadius: 10,
              fontSize: 16,
              fontWeight: 600,
              border: "none",
              cursor: "pointer",
            }}
          >
            Submit Order
          </button>

          <p style={{ marginTop: 12, textAlign: "center", color: "#2563eb" }}>{msg}</p>
        </div>

        {/* Right: Payment history + Order history */}
        <div style={{ width: 360 }}>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Payment History</div>
            <div>
              {payments.length === 0 && <div style={{ color: "#64748b" }}>No payments yet</div>}
              {payments.map((p) => (
                <div key={p.id} style={{
                  background: "#fff",
                  padding: 12,
                  borderRadius: 10,
                  border: "1px solid #eee",
                  marginBottom: 8
                }}>
                  <div style={{ fontWeight: 700 }}>₹ {p.amount}</div>
                  <div style={{ color: "#64748b", fontSize: 13 }}>{p.note || "—"}</div>
                  <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 6 }}>{new Date(p.created_at).toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Order History</div>
            <div>
              {orders.length === 0 && <div style={{ color: "#64748b" }}>No orders yet</div>}
              {orders.map((o) => (
                <div key={o.id} style={{
                  background: "#fff",
                  padding: 12,
                  borderRadius: 10,
                  border: "1px solid #eee",
                  marginBottom: 8
                }}>
                  <div style={{ fontWeight: 700 }}>₹ {o.grand_total}</div>
                  <div style={{ color: "#64748b", fontSize: 13 }}>{o.items?.length || 0} items</div>
                  <div style={{ color: "#94a3b8", fontSize: 12, marginTop: 6 }}>{new Date(o.created_at).toLocaleString()}</div>
                  <a href={o.pdf_url} target="_blank" rel="noreferrer" style={{ display: "inline-block", marginTop: 8, padding: "6px 10px", background: "#0ea5e9", color: "#fff", borderRadius: 8, textDecoration: "none" }}>View PDF</a>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

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
              maxWidth: 400,
              boxShadow: "0 6px 20px rgba(0,0,0,0.2)",
            }}
          >
            <h3 style={{ marginBottom: 10 }}>Make Payment</h3>

            <label style={{ fontSize: 13, color: "#475569" }}>Amount</label>
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
                marginTop: 6,
                marginBottom: 10
              }}
            />

            <label style={{ fontSize: 13, color: "#475569" }}>Note (optional)</label>
            <textarea
              rows={3}
              placeholder="Add a note for this payment (eg. 'Paid via bank transfer — UTR xxxx')"
              value={payNote}
              onChange={(e) => setPayNote(e.target.value)}
              style={{
                width: "100%",
                padding: 12,
                borderRadius: 10,
                border: "1px solid #d1d5db",
                fontSize: 14,
                marginTop: 6
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

            <p style={{ color: payMsg.startsWith("Payment") ? "green" : "red", marginTop: 8 }}>{payMsg}</p>
          </div>
        </div>
      )}
    </div>
  );
}
