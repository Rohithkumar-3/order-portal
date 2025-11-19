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
    async function loadData() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return router.push("/");

      const userEmail = session.user.email.toLowerCase();
      setEmail(userEmail);

      if (userEmail !== "manu@vfive.com") return router.push("/");

      // Load accounts/outstanding
      const { data: acc } = await supabase.from("accounts").select("*");
      setAccounts(acc || []);

      // Load orders
      const { data: ord } = await supabase
        .from("orders")
        .select("*")
        .order("id", { ascending: false });

      setOrders(ord || []);

      // Load payments
      const { data: pays } = await supabase
        .from("payments")
        .select("*")
        .order("id", { ascending: false });

      setPayments(pays || []);

      setReady(true);
    }

    loadData();
  }, []);

  async function increaseOutstanding() {
    if (!selectedEmail) return alert("Select distributor");
    if (!amount) return alert("Enter valid amount");

    const { error } = await supabase.rpc("increment_outstanding", {
      email_input: selectedEmail,
      amount: Number(amount),
    });

    if (error) return alert(error.message);

    // refresh outstanding
    const { data: acc } = await supabase.from("accounts").select("*");
    setAccounts(acc || []);
    setAmount("");
  }

  if (!ready) return <p style={{ padding: 20 }}>Loading…</p>;

  return (
    <div style={{
      display: "flex",
      gap: "20px",
      padding: "24px",
      maxWidth: "1300px",
      margin: "auto"
    }}>
      
      {/* LEFT SIDE — MAIN DASHBOARD */}
      <div style={{ flex: 2 }}>
        <h1>Manufacturer Dashboard</h1>
        <p><b>Logged in as:</b> {email}</p>

        {/* Outstanding */}
        <h2 style={{ marginTop: 20 }}>Distributor Outstanding Amounts</h2>
        {accounts.map(acc => (
          <div key={acc.id} style={{
            padding: 12,
            background: "#fff",
            borderRadius: 8,
            marginBottom: 12,
            border: "1px solid #ddd"
          }}>
            <p><b>Name:</b> {acc.name}</p>
            <p><b>Email:</b> {acc.email}</p>
            <p><b>Outstanding:</b> ₹ {acc.outstanding}</p>
          </div>
        ))}

        {/* Increase Outstanding */}
        <h2 style={{ marginTop: 30 }}>Increase Outstanding</h2>

        <select
          value={selectedEmail}
          onChange={(e) => setSelectedEmail(e.target.value)}
          style={{ padding: 10, width: 260 }}
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
          style={{ marginLeft: 10, padding: 10, width: 150 }}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />

        <button
          onClick={increaseOutstanding}
          style={{
            marginLeft: 10,
            padding: "10px 16px",
            background: "green",
            color: "#fff",
            borderRadius: 6
          }}
        >
          Add
        </button>

        {/* ORDERS */}
        <h2 style={{ marginTop: 40 }}>All Orders</h2>

        {orders.map(o => (
          <div key={o.id} style={{
            padding: 12,
            background: "#fff",
            borderRadius: 8,
            marginBottom: 12,
            border: "1px solid #ddd"
          }}>
            <p><b>Distributor:</b> {o.from_name} ({o.from_email})</p>
            <p><b>Total:</b> ₹ {o.grand_total}</p>
            <p><b>Date:</b> {new Date(o.created_at).toLocaleString()}</p>
            <a
              href={o.pdf_url}
              target="_blank"
              style={{
                display: "inline-block",
                marginTop: 5,
                padding: "6px 12px",
                background: "#0ea5e9",
                color: "#fff",
                borderRadius: 6
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
        height: "90vh",
        overflowY: "auto",
        background: "#fff",
        padding: 20,
        borderRadius: 12,
        border: "1px solid #ddd",
        boxShadow: "0 4px 12px rgba(0,0,0,0.05)"
      }}>
        <h2>Payment History</h2>

        {payments.length === 0 ? (
          <p>No payments yet</p>
        ) : (
          payments.map(p => (
            <div key={p.id} style={{
              padding: 12,
              background: "#f9fafb",
              borderRadius: 10,
              border: "1px solid #ddd",
              marginBottom: 12
            }}>
              <p><b>Name:</b> {p.name}</p>
              <p><b>Email:</b> {p.email}</p>
              <p><b>Amount:</b> ₹ {p.amount}</p>
              <p><b>Note:</b> {p.note}</p>
              <p style={{ fontSize: 13, color: "#666" }}>
                {new Date(p.created_at).toLocaleString()}
              </p>
            </div>
          ))
        )}
      </div>

    </div>
  );
}
