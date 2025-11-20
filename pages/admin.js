import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Admin() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [accounts, setAccounts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  const allowed = ["admin@vfive.com", "manu@vfive.com"];

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

      await refreshAll();
      setLoading(false);
    }

    init();
  }, []);

  async function refreshAll() {
    await refreshAccounts();
    await refreshPayments();
    await refreshOrders();
  }

  async function refreshAccounts() {
    const { data } = await supabase.from("accounts").select("*");
    setAccounts(data || []);
  }

  async function refreshPayments() {
    const { data } = await supabase
      .from("payments")
      .select("*")
      .order("created_at", { ascending: false });

    setPayments(data || []);
  }

  async function refreshOrders() {
    const { data } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    setOrders(data || []);
  }

  if (loading) {
    return <div style={{ padding: 30 }}>Loading Admin Panel...</div>;
  }

  return (
    <div style={{ padding: 28, background: "#f1f5f9", minHeight: "100vh" }}>
      {/* HEADER */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
        }}
      >
        <div>
          <h1 style={{ margin: 0 }}>Admin Control Panel</h1>
          <p style={{ color: "#64748b" }}>Logged in as {email}</p>
        </div>

        <button
          onClick={async () => {
            await supabase.auth.signOut();
            router.push("/");
          }}
          style={{
            background: "#dc2626",
            color: "#fff",
            padding: "8px 14px",
            borderRadius: 8,
            border: "none",
            cursor: "pointer",
          }}
        >
          Logout
        </button>
      </div>

      {/* MAIN GRID */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 420px", gap: 20 }}>

        {/* LEFT SIDE - OUTSTANDING + ORDERS */}
        <div>

          {/* ACCOUNTS CONTROL */}
          <div
            style={{
              background: "#020617",
              padding: 16,
              borderRadius: 16,
              color: "white",
              marginBottom: 20,
              boxShadow: "0 15px 30px rgba(0,0,0,0.4)",
            }}
          >
            <h2 style={{ marginTop: 0 }}>Distributors – Balance Control</h2>

            {accounts.map((acc) => (
              <DistributorControl
                key={acc.email}
                account={acc}
                refreshAll={refreshAll}
              />
            ))}
          </div>

          {/* ORDER SECTION */}
          <div
            style={{
              background: "#fff",
              padding: 16,
              borderRadius: 16,
              boxShadow: "0 8px 20px rgba(0,0,0,0.06)",
            }}
          >
            <h2 style={{ marginTop: 0 }}>All Orders</h2>

            {orders.map((o) => (
              <div
                key={o.id}
                style={{
                  padding: 12,
                  borderBottom: "1px solid #e5e7eb",
                }}
              >
                <div style={{ fontWeight: 700 }}>
                  {o.from_name} ({o.from_email})
                </div>
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
                      display: "inline-block",
                      marginTop: 6,
                      padding: "5px 10px",
                      background: "#2563eb",
                      color: "#fff",
                      borderRadius: 8,
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
        </div>

        {/* RIGHT SIDE - PAYMENTS */}
        <div
          style={{
            position: "sticky",
            top: 20,
            background: "#fff",
            padding: 16,
            borderRadius: 16,
            boxShadow: "0 8px 20px rgba(0,0,0,0.06)",
            maxHeight: "85vh",
            overflowY: "auto",
          }}
        >
          <h2 style={{ marginTop: 0 }}>Payment History</h2>

          {payments.map((p) => (
            <div
              key={p.id}
              style={{
                padding: 12,
                borderBottom: "1px solid #e5e7eb",
              }}
            >
              <div style={{ fontWeight: 700 }}>
                {p.name} ({p.email})
              </div>
              <div style={{ fontSize: 15 }}>₹ {p.amount}</div>
              <div style={{ fontSize: 13, color: "#64748b" }}>
                {p.note || "-"}
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

/* COMPONENT : DISTRIBUTOR CONTROL CARD */
function DistributorControl({ account, refreshAll }) {
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  async function increase() {
    if (!amount || isNaN(amount)) return alert("Please enter valid amount");
    setLoading(true);

    const amt = Number(amount);

    const { error } = await supabase.rpc("increment_outstanding", {
      email_input: account.email,
      amount: amt,
    });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    await supabase.from("payments").insert([
      {
        email: account.email,
        name: account.name,
        amount: amt,
        note: "(ADMIN ADDED) " + (note || ""),
      },
    ]);

    await refreshAll();

    setAmount("");
    setNote("");
    setLoading(false);
  }

  async function decrease() {
    if (!amount || isNaN(amount)) return alert("Please enter valid amount");
    setLoading(true);

    const amt = Number(amount);

    const { error } = await supabase.rpc("decrement_outstanding", {
      email_input: account.email,
      amount: amt,
    });

    if (error) {
      alert(error.message);
      setLoading(false);
      return;
    }

    await supabase.from("payments").insert([
      {
        email: account.email,
        name: account.name,
        amount: amt,
        note: "(ADMIN REDUCED) " + (note || ""),
      },
    ]);

    await refreshAll();

    setAmount("");
    setNote("");
    setLoading(false);
  }

  return (
    <div
      style={{
        padding: 12,
        borderBottom: "1px dashed rgba(255,255,255,0.3)",
      }}
    >
      <div style={{ fontWeight: 700 }}>{account.name}</div>
      <div style={{ fontSize: 12, opacity: 0.7 }}>{account.email}</div>
      <div
        style={{
          color: "#f87171",
          margin: "6px 0",
          fontWeight: 600,
        }}
      >
        Outstanding: ₹ {account.outstanding}
      </div>

      <input
        placeholder="Amount"
        type="number"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        style={{
          width: "100%",
          padding: 6,
          borderRadius: 6,
          border: "none",
          outline: "none",
          marginBottom: 6,
        }}
      />

      <input
        placeholder="Note"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        style={{
          width: "100%",
          padding: 6,
          borderRadius: 6,
          border: "none",
          outline: "none",
          marginBottom: 8,
        }}
      />

      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={increase}
          disabled={loading}
          style={{
            flex: 1,
            padding: 6,
            borderRadius: 8,
            border: "none",
            background: "#16a34a",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          + Add
        </button>

        <button
          onClick={decrease}
          disabled={loading}
          style={{
            flex: 1,
            padding: 6,
            borderRadius: 8,
            border: "none",
            background: "#dc2626",
            color: "#fff",
            cursor: "pointer",
          }}
        >
          - Reduce
        </button>
      </div>
    </div>
  );
}
