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

  useEffect(() => {
    async function loadAll() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return router.push("/");

      const logged = session.user.email.toLowerCase();
      if (logged !== "manu@vfive.com") return router.push("/");
      setEmail(logged);

      // Load accounts
      const { data: acc } = await supabase.from("accounts").select("*");
      setAccounts(acc || []);

      // Load orders
      const { data: ord } = await supabase
        .from("orders")
        .select("*")
        .order("id", { ascending: false });
      setOrders(ord || []);

      // 🚨 FIX: Load ALL payments — NOT filtered
      const { data: pays } = await supabase
        .from("payments")
        .select("*")
        .order("id", { ascending: false });
      setPayments(pays || []);

      setReady(true);
    }
    loadAll();
  }, []);

  // Increase outstanding
  async function increaseOutstanding() {
    if (!selectedEmail) return alert("Select distributor");
    if (!amount) return alert("Enter amount");

    const { error } = await supabase.rpc("increment_outstanding", {
      email_input: selectedEmail,
      amount: Number(amount),
    });

    if (error) return alert(error.message);

    // Refresh accounts after update
    const { data: acc } = await supabase.from("accounts").select("*");
    setAccounts(acc || []);
  }

  if (!ready) return <p style={{ padding: 20 }}>Loading...</p>;

  return (
    <div style={{
      display: "flex",
      gap: 20,
      padding: 24,
      maxWidth: 1300,
      margin: "auto"
    }}>
      
      {/* LEFT SIDE */}
      <div style={{ flex: 2 }}>
        <h1>Manufacturer Dashboard</h1>
        <p><b>Logged in as:</b> {email}</p>

        {/* Outstanding */}
        <h2 style={{ marginTop: 20 }}>Distributor Outstanding</h2>
        {accounts.map(acc => (
          <div key={acc.id} style={{
            background: "#fff",
            padding: 14,
            borderRadius: 10,
            border: "1px solid #ddd",
            marginBottom: 10
          }}>
            <p><b>{acc.name}</b></p>
            <p>{acc.email}</p>
            <p><b>Outstanding:</b> ₹ {acc.outstanding}</p>
          </div>
        ))}

        {/* Increase Outstanding */}
        <h2 style={{ marginTop: 25 }}>Increase Outstanding</h2>

        <select
          value={selectedEmail}
          onChange={(e) => setSelectedEmail(e.target.value)}
          style={{ padding: 10, width: 250 }}
        >
          <option value="">Select Distributor</option>
          {accounts.map(acc => (
            <option key={acc.email} value={acc.email}>
              {acc.name} ({acc.email})
            </option>
          ))}
        </select>

        <input
          type="number"
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          style={{ marginLeft: 10, padding: 10, width: 150 }}
        />

        <button
          onClick={increaseOutstanding}
          style={{
            marginLeft: 10,
            padding: "10px 16px",
            background: "green",
            color: "white",
            borderRadius: 8
          }}
        >
          Add
        </button>

        {/* Orders */}
        <h2 style={{ marginTop: 35 }}>All Orders</h2>
        {orders.map(o => (
          <div key={o.id} style={{
            background: "#fff",
            padding: 14,
            borderRadius: 10,
            border: "1px solid #ddd",
            marginBottom: 10
          }}>
            <p><b>{o.from_name}</b> ({o.from_email})</p>
            <p>Total: ₹ {o.grand_total}</p>
            <p>{new Date(o.created_at).toLocaleString()}</p>

            <a
              href={o.pdf_url}
              target="_blank"
              style={{
                display: "inline-block",
                marginTop: 8,
                padding: "6px 12px",
                background: "#2563eb",
                color: "#fff",
                borderRadius: 6,
                textDecoration: "none"
              }}
            >
              View PDF
            </a>
          </div>
        ))}
      </div>

      {/* RIGHT SIDE — FIXED PAYMENT HISTORY */}
      <div style={{
        flex: 1,
        position: "sticky",
        top: 20,
        background: "#fff",
        padding: 18,
        borderRadius: 12,
        border: "1px solid #ddd",
        height: "90vh",
        overflowY: "scroll"
      }}>
        <h2>Payment History</h2>

        {payments.length === 0 && (
          <p style={{ color: "#666" }}>No payments found</p>
        )}

        {payments.map(p => (
          <div key={p.id} style={{
            background: "#f8fafc",
            padding: 12,
            borderRadius: 10,
            border: "1px solid #ddd",
            marginBottom: 12
          }}>
            <p><b>{p.name}</b> ({p.email})</p>
            <p><b>₹ {p.amount}</b></p>
            <p>Note: {p.note || "—"}</p>
            <p style={{ fontSize: 12, color: "#666" }}>
              {new Date(p.created_at).toLocaleString()}
            </p>
          </div>
        ))}
      </div>

    </div>
  );
}
