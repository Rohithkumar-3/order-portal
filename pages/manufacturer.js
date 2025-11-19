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
      setReady(false);

      // Wait for session
      const {
        data: { session }
      } = await supabase.auth.getSession();

      if (!session) return router.push("/");

      const userEmail = session.user.email.toLowerCase();
      setEmail(userEmail);

      // Manufacturer only
      if (userEmail !== "manu@vfive.com") return router.push("/");

      // Load accounts
      const { data: acc } = await supabase
        .from("accounts")
        .select("*")
        .order("id", { ascending: true });

      setAccounts(acc || []);

      // Load orders
      const { data: ord } = await supabase
        .from("orders")
        .select("*")
        .order("id", { ascending: false });

      setOrders(ord || []);

      // Load payments
      const { data: pays, error: payErr } = await supabase
        .from("payments")
        .select("*")
        .order("id", { ascending: false });

      if (payErr) console.log("Payment load error:", payErr);
      setPayments(pays || []);

      setReady(true);
    }

    loadData();
  }, []);

  async function increaseOutstanding() {
    if (!selectedEmail) return alert("Select distributor");
    if (!amount || isNaN(amount)) return alert("Enter valid amount");

    const extra = Number(amount);

    const { error } = await supabase.rpc("increment_outstanding", {
      email_input: selectedEmail,
      amount: extra
    });

    if (error) return alert("Error: " + error.message);

    const { data: acc } = await supabase
      .from("accounts")
      .select("*");

    setAccounts(acc || []);
    setAmount("");
    alert("Outstanding updated");
  }

  if (!ready) return <p style={{ padding: 20 }}>Loading…</p>;

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: "auto" }}>
      <h1>Manufacturer Dashboard</h1>
      <p><b>Logged in as:</b> {email}</p>

      {/* Outstanding Section */}
      <h2 style={{ marginTop: 30 }}>Distributor Outstanding</h2>

      {accounts.map(acc => (
        <div
          key={acc.id}
          style={{
            padding: 12,
            background: "#fff",
            borderRadius: 10,
            border: "1px solid #ddd",
            marginBottom: 12
          }}
        >
          <p><b>Name:</b> {acc.name}</p>
          <p><b>Email:</b> {acc.email}</p>
          <p><b>Outstanding:</b> ₹ {acc.outstanding}</p>
        </div>
      ))}

      {/* Increase Outstanding */}
      <h2 style={{ marginTop: 40 }}>Increase Outstanding</h2>

      <select
        value={selectedEmail}
        onChange={(e) => setSelectedEmail(e.target.value)}
        style={{ padding: 8, width: "260px" }}
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
        style={{ padding: 8, marginLeft: 10, width: "150px" }}
      />

      <button
        onClick={increaseOutstanding}
        style={{
          padding: "8px 12px",
          marginLeft: 10,
          background: "green",
          color: "#fff",
          borderRadius: 6
        }}
      >
        Add
      </button>

      {/* Payment History */}
      <h2 style={{ marginTop: 50 }}>Payment History</h2>

      {payments.length === 0 ? (
        <p>No payments yet</p>
      ) : (
        <div style={{ marginTop: 10 }}>
          {payments.map(p => (
            <div
              key={p.id}
              style={{
                padding: 12,
                background: "#fff",
                borderRadius: 10,
                border: "1px solid #ddd",
                marginBottom: 12
              }}
            >
              <p><b>Distributor:</b> {p.name} ({p.email})</p>
              <p><b>Amount Paid:</b> ₹ {p.amount}</p>
              <p><b>Note:</b> {p.note}</p>
              <p><b>Date:</b> {new Date(p.created_at).toLocaleString()}</p>
            </div>
          ))}
        </div>
      )}

      {/* Order History */}
      <h2 style={{ marginTop: 50 }}>All Orders</h2>

      {orders.map(o => (
        <div
          key={o.id}
          style={{
            padding: 12,
            background: "#fff",
            borderRadius: 10,
            border: "1px solid #ddd",
            marginBottom: 12
          }}
        >
          <p><b>Distributor:</b> {o.from_name} ({o.from_email})</p>
          <p><b>Total Amount:</b> ₹ {o.grand_total}</p>
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
              borderRadius: 6,
              textDecoration: "none"
            }}
          >
            View PDF
          </a>
        </div>
      ))}
    </div>
  );
}
