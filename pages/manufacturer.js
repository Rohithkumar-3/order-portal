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

  const manufacturerEmails = ["manu@vfive.com"];

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        console.log("NO SESSION, redirect");
        return router.push("/");
      }

      const userEmail = session.user.email.toLowerCase();
      console.log("LOGGED IN AS:", userEmail);
      setEmail(userEmail);

      if (!manufacturerEmails.includes(userEmail)) {
        console.log("NOT MANUFACTURER, redirect");
        return router.push("/");
      }

      console.log("AUTHORIZED MANUFACTURER");

      await refreshAll();
      setReady(true);
    }

    init();
  }, []);

  async function refreshAll() {
    console.log("REFRESHING DATA...");

    // ACCOUNTS
    const { data: accData } = await supabase
      .from("accounts")
      .select("*");

    console.log("ACCOUNTS:", accData);
    if (accData) setAccounts(accData);

    // ORDERS
    const { data: ordData } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    console.log("ORDERS:", ordData);
    if (ordData) setOrders(ordData);

    // PAYMENTS — REAL PROBLEM
    const { data: payData, error: payErr } = await supabase
      .from("payments")
      .select("*")
      .order("created_at", { ascending: false });

    console.log("PAYMENTS ERROR:", payErr);
    console.log("PAYMENTS RESULT:", payData);

    if (payData) setPayments(payData);
  }

  async function increaseOutstanding() {
    if (!selectedEmail) return alert("Select distributor");
    if (!amount || isNaN(amount)) return alert("Enter valid amount");

    const extra = Number(amount);

    const { error } = await supabase.rpc("increment_outstanding", {
      email_input: selectedEmail,
      amount: extra
    });

    if (error) {
      alert("Error: " + error.message);
      return;
    }

    await refreshAll();
    setAmount("");
    alert("Outstanding updated");
  }

  if (!ready) return <p style={{ padding: 20 }}>Loading…</p>;

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: "auto" }}>
      <h1>Manufacturer</h1>
      <p>Logged in as <b>{email}</b></p>

      <h2 style={{ marginTop: 30 }}>Outstanding</h2>
      {accounts.map(acc => (
        <div key={acc.id} style={{
          padding: 12,
          background: "#fff",
          borderRadius: 8,
          marginBottom: 10,
          border: "1px solid #ddd"
        }}>
          <p><b>{acc.name}</b> ({acc.email})</p>
          <p>Outstanding: ₹ {acc.outstanding}</p>
        </div>
      ))}

      <h2 style={{ marginTop: 30 }}>Increase Outstanding</h2>
      <select
        value={selectedEmail}
        onChange={(e) => setSelectedEmail(e.target.value)}
        style={{ padding: 8, width: 200 }}
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
        style={{ padding: 8, width: 100, marginLeft: 10 }}
      />

      <button
        onClick={increaseOutstanding}
        style={{ marginLeft: 10, padding: "8px 12px", background: "green", color: "#fff" }}
      >
        Add
      </button>

      <h2 style={{ marginTop: 40 }}>Payment History</h2>

      {payments.length === 0 && (
        <div style={{ color: "gray" }}>No payments found</div>
      )}

      {payments.map(p => (
        <div key={p.id} style={{
          padding: 12,
          background: "#fff",
          borderRadius: 8,
          marginTop: 10,
          border: "1px solid #ddd"
        }}>
          <p><b>{p.name}</b> ({p.email})</p>
          <p>Amount: <b>₹ {p.amount}</b></p>
          <p>Note: {p.note}</p>
          <p style={{ fontSize: 12, color: "#666" }}>
            {new Date(p.created_at).toLocaleString()}
          </p>
        </div>
      ))}

      <h2 style={{ marginTop: 40 }}>Orders</h2>
      {orders.map(o => (
        <div key={o.id} style={{
          padding: 12,
          background: "#fff",
          borderRadius: 8,
          marginTop: 10,
          border: "1px solid #ddd"
        }}>
          <p><b>{o.from_name}</b> ({o.from_email})</p>
          <p>Total: <b>₹ {o.grand_total}</b></p>
          <a href={o.pdf_url} target="_blank" style={{ color: "blue" }}>
            View PDF
          </a>
        </div>
      ))}
    </div>
  );
}
