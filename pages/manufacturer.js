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

  const [amount, setAmount] = useState("");
  const [selectedEmail, setSelectedEmail] = useState("");

  const [ready, setReady] = useState(false);

  // Allowed manufacturer email
  const manufacturerEmails = ["manu@vfive.com"];

  useEffect(() => {
    async function loadData() {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) return router.push("/");

      const userEmail = session.user.email.toLowerCase();
      setEmail(userEmail);

      if (!manufacturerEmails.includes(userEmail)) return router.push("/");

      await refreshAll();
      setReady(true);
    }

    loadData();
  }, []);

  async function refreshAll() {
    try {
      const { data: acc } = await supabase.from("accounts").select("*");
      if (acc) setAccounts(acc);

      const { data: ord } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
      if (ord) setOrders(ord);

      const { data: pay } = await supabase.from("payments").select("*").order("created_at", { ascending: false });
      if (pay) setPayments(pay);
    } catch (err) {
      console.error("refreshAll error:", err);
    }
  }

  // Increase outstanding
  async function increaseOutstanding() {
    if (!selectedEmail) return alert("Select distributor");
    if (!amount || isNaN(amount)) return alert("Enter valid amount");

    const extra = Number(amount);

    const { error } = await supabase.rpc("increment_outstanding", {
      email_input: selectedEmail,
      amount: extra,
    });

    if (error) return alert("Error: " + error.message);

    await refreshAll();
    setAmount("");
    alert("Outstanding updated successfully");
  }

  if (!ready) return <p style={{ padding: 20 }}>Loading…</p>;

  return (
    <div style={{ padding: 24, maxWidth: 1000, margin: "auto" }}>
      {/* Header */}
      <div style={{
        background: "#fff",
        padding: 22,
        borderRadius: 14,
        boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
        border: "1px solid #eee",
        marginBottom: 20
      }}>
        <h1 style={{ marginBottom: 6, fontSize: 26, fontWeight: 700 }}>Manufacturer Dashboard</h1>
        <p style={{ color: "#64748b" }}>Logged in as: <b>{email}</b></p>
      </div>

      {/* Two-column: left outstanding+increase, right orders+payments */}
      <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 20 }}>
        {/* Left column */}
        <div>
          <div style={{ background: "#fff", padding: 16, borderRadius: 12, border: "1px solid #eee", boxShadow: "0 3px 10px rgba(0,0,0,0.05)", marginBottom: 14 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>Distributor Outstanding</h2>
            {accounts.map(acc => (
              <div key={acc.id} style={{ padding: 10, borderRadius: 8, background: "#fafafa", marginTop: 10 }}>
                <div style={{ fontWeight: 700 }}>{acc.name}</div>
                <div style={{ color: "#64748b", fontSize: 13 }}>{acc.email}</div>
                <div style={{ marginTop: 6, fontWeight: 700, color: "#ef4444" }}>₹ {acc.outstanding}</div>
              </div>
            ))}
          </div>

          <div style={{ background: "#fff", padding: 16, borderRadius: 12, border: "1px solid #eee", boxShadow: "0 3px 10px rgba(0,0,0,0.05)" }}>
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>Increase Outstanding</h2>
            <select value={selectedEmail} onChange={(e) => setSelectedEmail(e.target.value)} style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #d1d5db", marginTop: 8 }}>
              <option value="">Select Distributor</option>
              {accounts.map(acc => <option key={acc.email} value={acc.email}>{acc.name} ({acc.email})</option>)}
            </select>

            <input type="number" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} style={{ width: "100%", padding: 10, borderRadius: 8, border: "1px solid #d1d5db", marginTop: 8 }} />

            <button onClick={increaseOutstanding} style={{ marginTop: 10, width: "100%", padding: 12, background: "green", color: "#fff", borderRadius: 8, border: "none", cursor: "pointer" }}>Add</button>
          </div>
        </div>

        {/* Right column */}
        <div>
          <div style={{ background: "#fff", padding: 16, borderRadius: 12, border: "1px solid #eee", boxShadow: "0 3px 10px rgba(0,0,0,0.05)", marginBottom: 14 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>All Orders</h2>
            {orders.length === 0 && <div style={{ color: "#64748b" }}>No orders yet</div>}
            {orders.map(o => (
              <div key={o.id} style={{ padding: 12, borderRadius: 10, border: "1px solid #f0f0f0", marginTop: 10 }}>
                <div style={{ fontWeight: 700 }}>{o.from_name} ({o.from_email})</div>
                <div style={{ color: "#64748b", marginTop: 6 }}>₹ {o.grand_total} — {o.items?.length || 0} items</div>
                <div style={{ color: "#94a3b8", marginTop: 6 }}>{new Date(o.created_at).toLocaleString()}</div>
                <a href={o.pdf_url} target="_blank" rel="noreferrer" style={{ marginTop: 8, display: "inline-block", padding: "6px 10px", background: "#0ea5e9", color: "#fff", borderRadius: 8, textDecoration: "none" }}>View PDF</a>
              </div>
            ))}
          </div>

          <div style={{ background: "#fff", padding: 16, borderRadius: 12, border: "1px solid #eee", boxShadow: "0 3px 10px rgba(0,0,0,0.05)" }}>
            <h2 style={{ fontSize: 18, fontWeight: 700 }}>Payment History</h2>
            {payments.length === 0 && <div style={{ color: "#64748b" }}>No payments yet</div>}
            {payments.map(p => (
              <div key={p.id} style={{ padding: 10, borderRadius: 8, border: "1px solid #f0f0f0", marginTop: 10 }}>
                <div style={{ fontWeight: 700 }}>₹ {p.amount} — {p.name}</div>
                <div style={{ color: "#64748b", marginTop: 6 }}>{p.note || "—"}</div>
                <div style={{ color: "#94a3b8", marginTop: 6 }}>{new Date(p.created_at).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
