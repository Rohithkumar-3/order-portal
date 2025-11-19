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

  const [amount, setAmount] = useState("");
  const [selectedEmail, setSelectedEmail] = useState("");

  const [ready, setReady] = useState(false);

  // Allowed manufacturer login
  const manufacturerEmails = ["manu@vfive.com"];

  // Load data on page open
  useEffect(() => {
    async function loadData() {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) return router.push("/");

      const userEmail = session.user.email.toLowerCase();
      setEmail(userEmail);

      if (!manufacturerEmails.includes(userEmail)) return router.push("/");

      const { data: acc } = await supabase
        .from("accounts")
        .select("*");

      if (acc) setAccounts(acc);

      const { data: ord } = await supabase
        .from("orders")
        .select("*")
        .order("id", { ascending: false });

      if (ord) setOrders(ord);

      setReady(true);
    }

    loadData();
  }, []);

  // Increase outstanding amount
  async function increaseOutstanding() {
    if (!selectedEmail) return alert("Select distributor");
    if (!amount || isNaN(amount)) return alert("Enter valid amount");

    const extra = Number(amount);

    const { error } = await supabase.rpc("increment_outstanding", {
      email_input: selectedEmail,
      amount: extra,
    });

    if (error) return alert("Error: " + error.message);

    // Refresh outstanding
    const { data: acc } = await supabase.from("accounts").select("*");
    if (acc) setAccounts(acc);

    setAmount("");
    alert("Outstanding updated!");
  }

  if (!ready) return <p style={{ padding: 20 }}>Loading…</p>;

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: "auto" }}>

      {/* Header */}
      <div
        style={{
          background: "#fff",
          padding: 22,
          borderRadius: 14,
          boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
          border: "1px solid #eee",
        }}
      >
        <h1 style={{ marginBottom: 6, fontSize: 26, fontWeight: 700 }}>
          Manufacturer Dashboard
        </h1>
        <p style={{ color: "#64748b" }}>
          Logged in as: <b>{email}</b>
        </p>
      </div>

      {/* Outstanding Amounts */}
      <h2
        style={{
          marginTop: 30,
          marginBottom: 10,
          fontSize: 22,
          fontWeight: 700,
          color: "#1e293b",
        }}
      >
        Distributor Outstanding Amounts
      </h2>

      {accounts.map((acc) => (
        <div
          key={acc.id}
          style={{
            background: "#fff",
            padding: 18,
            borderRadius: 14,
            boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
            border: "1px solid #eee",
            marginBottom: 14,
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 600 }}>{acc.name}</div>
          <p style={{ color: "#64748b", marginTop: 4 }}>{acc.email}</p>
          <p style={{ marginTop: 4, fontSize: 16 }}>
            <b style={{ color: "#ef4444" }}>Outstanding: ₹ {acc.outstanding}</b>
          </p>
        </div>
      ))}

      {/* Increase Outstanding */}
      <div
        style={{
          marginTop: 40,
          background: "#fff",
          padding: 20,
          borderRadius: 14,
          boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
          border: "1px solid #eee",
        }}
      >
        <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 10 }}>
          Increase Outstanding
        </h2>

        <select
          value={selectedEmail}
          onChange={(e) => setSelectedEmail(e.target.value)}
          style={{
            width: "100%",
            padding: 12,
            borderRadius: 10,
            border: "1px solid #d1d5db",
            marginBottom: 12,
            fontSize: 15,
          }}
        >
          <option value="">Select Distributor</option>
          {accounts.map((acc) => (
            <option key={acc.email} value={acc.email}>
              {acc.name} ({acc.email})
            </option>
          ))}
        </select>

        <input
          type="number"
          placeholder="Enter amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          style={{
            width: "100%",
            padding: 12,
            borderRadius: 10,
            border: "1px solid #d1d5db",
            fontSize: 15,
            marginBottom: 14,
          }}
        />

        <button
          onClick={increaseOutstanding}
          style={{
            width: "100%",
            padding: "14px",
            background: "green",
            color: "#fff",
            borderRadius: 10,
            fontWeight: 600,
            fontSize: 16,
            border: "none",
            cursor: "pointer",
            boxShadow: "0 4px 10px rgba(34,197,94,0.3)",
          }}
        >
          Add Amount
        </button>
      </div>

      {/* Orders */}
      <h2
        style={{
          marginTop: 40,
          marginBottom: 10,
          fontSize: 22,
          fontWeight: 700,
          color: "#1e293b",
        }}
      >
        All Orders
      </h2>

      {orders.map((o) => (
        <div
          key={o.id}
          style={{
            background: "#fff",
            padding: 18,
            borderRadius: 14,
            boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
            border: "1px solid #eee",
            marginBottom: 14,
          }}
        >
          <p>
            <b>{o.from_name}</b> ({o.from_email})
          </p>
          <p style={{ color: "#64748b", marginTop: 4 }}>
            Total Amount: ₹ {o.grand_total}
          </p>
          <p style={{ color: "#64748b", marginTop: 4 }}>
            Date: {new Date(o.created_at).toLocaleString()}
          </p>

          <a
            href={o.pdf_url}
            target="_blank"
            style={{
              display: "inline-block",
              marginTop: 10,
              padding: "10px 16px",
              background: "#2563eb",
              color: "#fff",
              borderRadius: 10,
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            View PDF
          </a>
        </div>
      ))}
    </div>
  );
}
