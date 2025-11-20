// pages/manufacturer.js
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);


export default function Manufacturer() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [accounts, setAccounts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [payments, setPayments] = useState([]);
  const [ready, setReady] = useState(false);

  const allowed = ["manu@vfive.com", "admin@vfive.com"];

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.push("/");
        return;
      }

      const userEmail = session.user.email.toLowerCase();

      if (!allowed.includes(userEmail)) {
        router.push("/");
        return;
      }

      setEmail(userEmail);

      // Load accounts
      const { data: accData } = await supabase
        .from("accounts")
        .select("*")
        .order("name", { ascending: true });

      setAccounts(accData || []);

      // Load orders
      const { data: ordData } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      setOrders(ordData || []);

      // Load payments ✅ FIXED
      const { data: payData, error: payErr } = await supabase
        .from("payments")
        .select("*")
        .order("created_at", { ascending: false });

      console.log("PAYMENTS:", payData, payErr);

      setPayments(payData || []);
      setReady(true);
    }

    init();
  }, []);

  if (!ready) {
    return <p style={{ padding: 24 }}>Loading manufacturer dashboard…</p>;
  }

  return (
    <div style={{ padding: 24, maxWidth: 1300, margin: "0 auto" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <div>
          <h1 style={{ margin: 0 }}>Manufacturer / Admin Dashboard</h1>
          <p style={{ color: "#64748b" }}>
            Logged in as <b>{email}</b>
          </p>
        </div>

        <button
          onClick={async () => {
            await supabase.auth.signOut();
            router.push("/");
          }}
          style={{
            padding: "8px 16px",
            background: "#ef4444",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            cursor: "pointer",
          }}
        >
          Logout
        </button>
      </div>

      {/* Outstanding */}
      <div
        style={{
          background: "#fff",
          padding: 16,
          borderRadius: 12,
          border: "1px solid #e5e7eb",
          marginBottom: 24,
        }}
      >
        <h2>Distributor Outstanding</h2>

        {accounts.length === 0 && (
          <p style={{ color: "#64748b" }}>No accounts available</p>
        )}

        {accounts.map((acc) => (
          <div
            key={acc.email}
            style={{
              padding: 10,
              borderRadius: 8,
              background: "#f9fafb",
              border: "1px solid #e5e7eb",
              marginBottom: 8,
            }}
          >
            <b>{acc.name}</b> ({acc.email}) <br />
            <span style={{ color: "#ef4444" }}>
              Outstanding: ₹ {acc.outstanding}
            </span>
          </div>
        ))}
      </div>

      {/* TWO PANELS */}
      <div style={{ display: "flex", gap: 20 }}>
        {/* LEFT - ORDERS */}
        <div style={{ flex: 1 }}>
          <h2>Orders</h2>

          {orders.length === 0 && (
            <p style={{ color: "#64748b" }}>No orders yet</p>
          )}

          {orders.map((o) => (
            <div
              key={o.id}
              style={{
                background: "#fff",
                padding: 14,
                borderRadius: 10,
                border: "1px solid #e5e7eb",
                marginBottom: 10,
              }}
            >
              <b>
                {o.from_name} ({o.from_email})
              </b>
              <div>₹ {o.grand_total}</div>
              <div style={{ fontSize: 12, color: "#64748b" }}>
                {new Date(o.created_at).toLocaleString()}
              </div>

              {o.pdf_url && (
                <a
                  href={o.pdf_url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    marginTop: 6,
                    display: "inline-block",
                    padding: "6px 12px",
                    borderRadius: 6,
                    background: "#2563eb",
                    color: "#fff",
                    textDecoration: "none",
                    fontSize: 13,
                  }}
                >
                  View PDF
                </a>
              )}
            </div>
          ))}
        </div>

        {/* RIGHT - PAYMENTS */}
        <div style={{ width: 380 }}>
          <h2>Payment History</h2>

          {payments.length === 0 && (
            <p style={{ color: "#64748b" }}>No payments found</p>
          )}

          {payments.map((p) => (
            <div
              key={p.id}
              style={{
                background: "#fff",
                padding: 14,
                borderRadius: 10,
                border: "1px solid #e5e7eb",
                marginBottom: 10,
              }}
            >
              <b>
                {p.name} ({p.email})
              </b>
              <div>₹ {p.amount}</div>
              <div style={{ color: "#64748b", fontSize: 13 }}>
                {p.note || "No note"}
              </div>
              <div style={{ fontSize: 12, color: "#94a3b8" }}>
                {new Date(p.created_at).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
