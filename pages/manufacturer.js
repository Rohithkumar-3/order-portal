import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Manufacturer() {
  const router = useRouter();

  const [email, setEmail] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [payments, setPayments] = useState([]);

  const [amount, setAmount] = useState("");
  const [selectedEmail, setSelectedEmail] = useState("");

  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  const manufacturerEmails = ["manu@vfive.com"];

  // ---------------------------------------------------------
  // AUTH + LOAD ALL DATA
  // ---------------------------------------------------------
  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        router.push("/");
        return;
      }

      const userEmail = session.user.email.toLowerCase();
      setEmail(userEmail);

      if (!manufacturerEmails.includes(userEmail)) {
        router.push("/");
        return;
      }

      setAuthorized(true);
      await refreshAll();

      setLoading(false);
    }

    init();
  }, []);

  // ---------------------------------------------------------
  // REFRESH ALL DATA
  // ---------------------------------------------------------
  async function refreshAll() {
    // ACCOUNTS
    const { data: acc } = await supabase
      .from("accounts")
      .select("*");

    if (acc) setAccounts(acc);

    // ORDERS
    const { data: ord } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (ord) setOrders(ord);

    // PAYMENTS  *THIS WAS NOT LOADING BEFORE*
    const { data: pay } = await supabase
      .from("payments")
      .select("*")
      .order("created_at", { ascending: false });

    if (pay) setPayments(pay);
  }

  // ---------------------------------------------------------
  // INCREASE OUTSTANDING
  // ---------------------------------------------------------
  async function increaseOutstanding() {
    if (!selectedEmail) return alert("Select distributor");
    if (!amount || isNaN(amount)) return alert("Enter valid amount");

    const extra = Number(amount);

    const { error } = await supabase.rpc("increment_outstanding", {
      email_input: selectedEmail,
      amount: extra,
    });

    if (error) return alert(error.message);

    await refreshAll();
    setAmount("");
  }

  // ---------------------------------------------------------
  // RENDERING
  // ---------------------------------------------------------
  if (loading) {
    return <p style={{ padding: 20 }}>Loading…</p>;
  }

  if (!authorized) {
    return <p style={{ padding: 20 }}>Unauthorized</p>;
  }

  return (
    <div style={{ padding: 24, maxWidth: 1000, margin: "auto" }}>
      {/* HEADER */}
      <div
        style={{
          background: "#fff",
          padding: 22,
          borderRadius: 14,
          boxShadow: "0 4px 14px rgba(0,0,0,0.08)",
          border: "1px solid #eee",
          marginBottom: 20,
        }}
      >
        <h1 style={{ marginBottom: 6, fontSize: 26, fontWeight: 700 }}>
          Manufacturer Dashboard
        </h1>
        <p style={{ color: "#64748b" }}>
          Logged in as: <b>{email}</b>
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 20 }}>
        
        {/* LEFT SIDE */}
        <div>

          {/* Outstanding Section */}
          <div
            style={{
              background: "#fff",
              padding: 16,
              borderRadius: 12,
              border: "1px solid #eee",
              marginBottom: 20,
            }}
          >
            <h2>Outstanding</h2>

            {accounts.map(acc => (
              <div key={acc.id} style={{ padding: 10, marginTop: 10, background: "#fafafa", borderRadius: 8 }}>
                <b>{acc.name}</b> ({acc.email})
                <br />
                <span style={{ color: "red" }}>₹ {acc.outstanding}</span>
              </div>
            ))}
          </div>

          {/* Increase Outstanding */}
          <div
            style={{
              background: "#fff",
              padding: 18,
              borderRadius: 12,
              border: "1px solid #eee",
            }}
          >
            <h2>Increase Outstanding</h2>

            <select
              value={selectedEmail}
              onChange={(e) => setSelectedEmail(e.target.value)}
              style={{ width: "100%", padding: 10, borderRadius: 8, marginTop: 10 }}
            >
              <option value="">Select distributor</option>
              {accounts.map(acc => (
                <option key={acc.email} value={acc.email}>
                  {acc.name} ({acc.email})
                </option>
              ))}
            </select>

            <input
              type="number"
              value={amount}
              placeholder="Amount"
              onChange={(e) => setAmount(e.target.value)}
              style={{ width: "100%", padding: 10, borderRadius: 8, marginTop: 10 }}
            />

            <button
              onClick={increaseOutstanding}
              style={{
                marginTop: 10,
                width: "100%",
                padding: 12,
                background: "green",
                color: "#fff",
                borderRadius: 8,
                border: "none",
              }}
            >
              Add
            </button>
          </div>
        </div>

        {/* RIGHT SIDE */}
        <div>

          {/* PAYMENT HISTORY */}
          <div
            style={{
              background: "#fff",
              padding: 16,
              borderRadius: 12,
              border: "1px solid #eee",
              marginBottom: 20,
            }}
          >
            <h2>Payment History</h2>

            {payments.length === 0 && (
              <p style={{ color: "#6b7280" }}>No payments yet</p>
            )}

            {payments.map(p => (
              <div
                key={p.id}
                style={{
                  padding: 12,
                  borderRadius: 10,
                  border: "1px solid #eee",
                  marginTop: 10,
                }}
              >
                <b>{p.name}</b> ({p.email})  
                <br />
                Amount: <b style={{ color: "green" }}>₹ {p.amount}</b>
                <br />
                Note: {p.note || "-"}
                <br />
                <span style={{ color: "#6b7280", fontSize: 12 }}>
                  {new Date(p.created_at).toLocaleString()}
                </span>
              </div>
            ))}
          </div>

          {/* ORDERS */}
          <div
            style={{
              background: "#fff",
              padding: 16,
              borderRadius: 12,
              border: "1px solid #eee",
            }}
          >
            <h2>All Orders</h2>

            {orders.map(o => (
              <div key={o.id} style={{ marginTop: 10, padding: 12, border: "1px solid #eee", borderRadius: 8 }}>
                <b>{o.from_name}</b> ({o.from_email})  
                <br />
                Total: <b>₹ {o.grand_total}</b>
                <br />
                <a href={o.pdf_url} target="_blank" style={{ color: "#2563eb" }}>
                  View PDF
                </a>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}
