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

  const [selectedEmail, setSelectedEmail] = useState("");
  const [addAmount, setAddAmount] = useState("");
  const [note, setNote] = useState("");

  const [msg, setMsg] = useState("");

  const allowed = ["manu@vfive.com", "admin@vfive.com"];

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return router.push("/");

      const userEmail = session.user.email.toLowerCase();

      if (!allowed.includes(userEmail)) return router.push("/");
      setEmail(userEmail);

      await loadAll();
    }

    init();
  }, []);

  async function loadAll() {
    const { data: acc } = await supabase.from("accounts").select("*");
    const { data: ord } = await supabase.from("orders").select("*").order("created_at", { ascending: false });
    const { data: pay } = await supabase.from("payments").select("*").order("created_at", { ascending: false });

    setAccounts(acc || []);
    setOrders(ord || []);
    setPayments(pay || []);
  }

  async function increaseOutstanding() {
    if (!selectedEmail || !addAmount || isNaN(addAmount)) {
      setMsg("Enter valid distributor and amount");
      return;
    }

    const amount = Number(addAmount);

    const { error } = await supabase.rpc("increment_outstanding", {
      email_input: selectedEmail,
      amount: amount
    });

    if (error) {
      setMsg("❌ " + error.message);
      return;
    }

    // optional record in payments table as debit
    if (note) {
      await supabase.from("payments").insert([
        {
          email: selectedEmail,
          name: "ADDED BY MANUFACTURER",
          amount: amount,
          note: note
        }
      ]);
    }

    setMsg("✅ Outstanding updated");
    setAddAmount("");
    setNote("");
    setSelectedEmail("");

    await loadAll();
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9", padding: 24 }}>

      {/* HEADER */}
      <div style={{
        background: "linear-gradient(135deg,#1e3a8a,#2563eb)",
        padding: 20,
        borderRadius: 16,
        color: "#fff",
        marginBottom: 20
      }}>
        <h1>Manufacturer Dashboard</h1>
        <p>{email}</p>
      </div>

      <div style={{ display: "flex", gap: 20 }}>

        {/* LEFT */}
        <div style={{ flex: 1 }}>

          {/* Outstanding */}
          <div style={{ background: "#fff", padding: 16, borderRadius: 14, marginBottom: 20 }}>
            <h3>Distributor Outstanding</h3>

            {accounts.map(acc => (
              <div key={acc.email} style={{
                padding: 10,
                marginBottom: 6,
                background: "#f9fafb",
                borderRadius: 10
              }}>
                <b>{acc.name}</b>
                <div>{acc.email}</div>
                <div style={{ color: "red" }}>₹ {acc.outstanding}</div>
              </div>
            ))}
          </div>

          {/* INCREASE OUTSTANDING */}
          <div style={{ background: "#fff", padding: 16, borderRadius: 14, marginBottom: 20 }}>
            <h3>Increase Outstanding</h3>

            <select
              value={selectedEmail}
              onChange={(e) => setSelectedEmail(e.target.value)}
              style={{ width: "100%", padding: 10, marginBottom: 10 }}
            >
              <option value="">Select Distributor</option>
              {accounts.map(a => (
                <option key={a.email} value={a.email}>
                  {a.name} ({a.email})
                </option>
              ))}
            </select>

            <input
              type="number"
              placeholder="Amount"
              value={addAmount}
              onChange={(e) => setAddAmount(e.target.value)}
              style={{ width: "100%", padding: 10, marginBottom: 10 }}
            />

            <textarea
              placeholder="Note (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              style={{ width: "100%", padding: 10, marginBottom: 10 }}
            />

            <button
              onClick={increaseOutstanding}
              style={{
                width: "100%",
                padding: 14,
                background: "#22c55e",
                color: "#fff",
                borderRadius: 10,
                border: "none"
              }}
            >
              ADD
            </button>

            <p style={{ marginTop: 8 }}>{msg}</p>
          </div>

          {/* ORDERS */}
          <div style={{ background: "#fff", padding: 16, borderRadius: 14 }}>
            <h3>Orders</h3>

            {orders.map(o => (
              <div key={o.id} style={{
                padding: 10,
                marginBottom: 8,
                borderBottom: "1px solid #eee"
              }}>
                <b>{o.from_name}</b> ({o.from_email})
                <div>₹ {o.grand_total}</div>
                <div style={{ fontSize: 13 }}>
                  {new Date(o.created_at).toLocaleString()}
                </div>
                <a href={o.pdf_url} target="_blank">View PDF</a>
              </div>
            ))}
          </div>

        </div>

        {/* RIGHT PANEL */}
        <div style={{ width: 380 }}>

          <div style={{ background: "#fff", padding: 16, borderRadius: 14 }}>
            <h3>Payment History</h3>

            {payments.length === 0 && <p>No payments</p>}

            {payments.map(p => (
              <div key={p.id} style={{
                padding: 10,
                marginBottom: 8,
                background: "#f9fafb",
                borderRadius: 10
              }}>
                <b>{p.name}</b>
                <div>{p.email}</div>
                <div style={{ fontWeight: "bold" }}>₹ {p.amount}</div>
                <div style={{ fontSize: 13 }}>{p.note || "-"}</div>
                <div style={{ fontSize: 11 }}>
                  {new Date(p.created_at).toLocaleString()}
                </div>
              </div>
            ))}

          </div>

        </div>
      </div>
    </div>
  );
}
