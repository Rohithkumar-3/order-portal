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
  const [name, setName] = useState("Manufacturer");
  const [accounts, setAccounts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [amount, setAmount] = useState("");
  const [selectedEmail, setSelectedEmail] = useState("");

  const [ready, setReady] = useState(false);

  // Allowed manufacturer emails
  const manufacturerEmails = ["manufacturer@vfive.com"];

  useEffect(() => {
    async function protect() {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) return router.push("/");

      const userEmail = session.user.email.toLowerCase();
      setEmail(userEmail);

      if (!manufacturerEmails.includes(userEmail)) {
        return router.push("/");
      }

      // Load Outstanding for both distributors
      const { data: acc } = await supabase
        .from("accounts")
        .select("*");

      if (acc) setAccounts(acc);

      // Load orders
      const { data: ord } = await supabase
        .from("orders")
        .select("*")
        .order("id", { ascending: false });

      if (ord) setOrders(ord);

      setReady(true);
    }

    protect();
  }, []);

  // Manufacturer increases outstanding
  async function increaseOutstanding() {
    if (!selectedEmail) return alert("Select distributor");
    if (!amount || isNaN(amount)) return alert("Enter valid amount");

    const extra = Number(amount);

    const { data, error } = await supabase.rpc("increment_outstanding", {
      email_input: selectedEmail,
      amount: extra,
    });

    if (error) {
      alert("Error: " + error.message);
      return;
    }

    // Refresh accounts
    const { data: acc } = await supabase
      .from("accounts")
      .select("*");

    setAccounts(acc);
    setAmount("");
    alert("Outstanding updated");
  }

  if (!ready) return <p style={{ padding: 20 }}>Checking Authorization...</p>;

  return (
    <div style={{ padding: 24 }}>
      <h1>Manufacturer Dashboard</h1>

      <h2 style={{ marginTop: 20 }}>Distributor Outstanding Amounts</h2>
      <div style={{ marginTop: 10 }}>
        {accounts.map((acc) => (
          <div key={acc.id} style={{
            padding: 12,
            border: "1px solid #ddd",
            borderRadius: 8,
            marginBottom: 10,
            background: "#fff"
          }}>
            <p><b>Name:</b> {acc.name}</p>
            <p><b>Email:</b> {acc.email}</p>
            <p><b>Outstanding:</b> ₹ {acc.outstanding}</p>
          </div>
        ))}
      </div>

      {/* Increase Outstanding Section */}
      <h2 style={{ marginTop: 30 }}>Increase Outstanding</h2>

      <div style={{ marginTop: 10 }}>
        <select
          value={selectedEmail}
          onChange={(e) => setSelectedEmail(e.target.value)}
          style={{ padding: 8, width: "250px" }}
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
      </div>

      {/* Orders Section */}
      <h2 style={{ marginTop: 40 }}>All Orders</h2>
      <div style={{ marginTop: 10 }}>
        {orders.map((o) => (
          <div key={o.id} style={{
            padding: 12,
            border: "1px solid #ddd",
            borderRadius: 8,
            marginBottom: 10,
            background: "#fff"
          }}>
            <p><b>Distributor:</b> {o.from_name} ({o.from_email})</p>
            <p><b>Grand Total:</b> ₹ {o.grand_total}</p>
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
    </div>
  );
}
