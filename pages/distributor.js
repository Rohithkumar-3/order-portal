import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { createClient } from "@supabase/supabase-js";
import products from "../data/products.json";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const distributorNames = {
  "dist1@vfive.com": "Vijayakumar",
  "dist2@vfive.com": "Senthil Kumar",
};

export default function Distributor() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [outstanding, setOutstanding] = useState(0);

  const [cart, setCart] = useState({});
  const [msg, setMsg] = useState("");

  const [payments, setPayments] = useState([]);
  const [orders, setOrders] = useState([]);

  const [showPay, setShowPay] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payNote, setPayNote] = useState("");

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return router.push("/");

      const userEmail = session.user.email.toLowerCase();
      const dName = distributorNames[userEmail];

      if (!dName) return router.push("/");

      setEmail(userEmail);
      setName(dName);

      await refreshOutstanding(userEmail);
      await loadPayments(userEmail);
      await loadOrders(userEmail);

      const c = {};
      products.forEach((p) => (c[p.id] = 0));
      setCart(c);
    }

    init();
  }, []);

  async function refreshOutstanding(e) {
    const { data } = await supabase
      .from("accounts")
      .select("outstanding")
      .eq("email", e)
      .single();

    if (data) setOutstanding(data.outstanding);
  }

  async function loadPayments(e) {
    const { data } = await supabase
      .from("payments")
      .select("*")
      .eq("email", e)
      .order("created_at", { ascending: false });

    setPayments(data || []);
  }

  async function loadOrders(e) {
    const { data } = await supabase
      .from("orders")
      .select("*")
      .eq("from_email", e)
      .order("created_at", { ascending: false });

    setOrders(data || []);
  }

  function changeQty(id, val) {
    const qty = parseInt(val);

    setCart((prev) => {
      const newCart = { ...prev };

      if (!qty || qty <= 0) delete newCart[id];
      else newCart[id] = qty;

      return newCart;
    });
  }

  function increase(id) {
    const current = cart[id] || 0;
    changeQty(id, current + 1);
  }

  function decrease(id) {
    const current = cart[id] || 0;
    if (current - 1 <= 0) changeQty(id, 0);
    else changeQty(id, current - 1);
  }

  async function submit() {
    setMsg("Placing order...");

    const res = await fetch("/api/place-order", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ cart, from_email: email, from_name: name }),
    });

    const j = await res.json();

    if (j.ok) {
      setMsg("✅ Order placed successfully");
      await refreshOutstanding(email);
      await loadOrders(email);
      setCart({});
    } else {
      setMsg("❌ " + j.error);
    }
  }

  async function payNow() {
    if (!payAmount || isNaN(payAmount)) return;

    const amt = Number(payAmount);

    await supabase.from("payments").insert([
      { email, name, amount: amt, note: payNote },
    ]);

    await supabase.rpc("decrement_outstanding", {
      email_input: email,
      amount: amt,
    });

    await refreshOutstanding(email);
    await loadPayments(email);

    setPayAmount("");
    setPayNote("");
    setShowPay(false);
  }

  return (
    <div style={{ minHeight: "100vh", background: "#f1f5f9", padding: 20 }}>

      {/* HEADER */}
      <div style={{
        background: "linear-gradient(135deg,#1e40af,#2563eb)",
        color: "#fff",
        padding: 20,
        borderRadius: 16
      }}>
        <h2>{name}</h2>
        <p>{email}</p>
        <h1>₹ {outstanding}</h1>
      </div>

      {/* MAIN */}
      <div style={{ display: "flex", gap: 20, marginTop: 20 }}>

        {/* LEFT */}
        <div style={{ flex: 1 }}>
          {products.map((p) => (
            <div key={p.id} style={{
              background: "#fff",
              padding: 16,
              borderRadius: 16,
              marginBottom: 12,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center"
            }}>
              <div>
                <b>{p.name}</b>
                <div>₹ {p.rate}</div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button onClick={() => decrease(p.id)}>-</button>

                <input
                  type="number"
                  style={{ width: 60, textAlign: "center" }}
                  value={cart[p.id] || ""}
                  onChange={(e) => changeQty(p.id, e.target.value)}
                />

                <button onClick={() => increase(p.id)}>+</button>
              </div>
            </div>
          ))}

          <button onClick={submit} style={{
            width: "100%",
            padding: 15,
            background: "#2563eb",
            color: "#fff",
            borderRadius: 10,
            border: "none"
          }}>
            Place Order
          </button>

          <p>{msg}</p>
        </div>

        {/* RIGHT */}
        <div style={{ width: 360 }}>

          {/* PAY */}
          <button
            onClick={() => setShowPay(true)}
            style={{
              width: "100%",
              padding: 16,
              background: "#22c55e",
              color: "#fff",
              borderRadius: 12,
              border: "none"
            }}
          >
            PAY NOW
          </button>

          {/* PAYMENTS */}
          <div style={{ background: "#fff", padding: 12, borderRadius: 12, marginTop: 16 }}>
            <h3>Payments</h3>
            {payments.map((p) => (
              <div key={p.id} style={{ marginBottom: 8 }}>
                <b>₹ {p.amount}</b>
                <div style={{ fontSize: 13 }}>{p.note || "—"}</div>
              </div>
            ))}
          </div>

          {/* ORDERS */}
          <div style={{ background: "#fff", padding: 12, borderRadius: 12, marginTop: 16 }}>
            <h3>Orders</h3>
            {orders.map((o) => (
              <div key={o.id} style={{ marginBottom: 8 }}>
                ₹ {o.grand_total}
                <br />
                <a href={o.pdf_url} target="_blank">View PDF</a>
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* PAY MODAL */}
      {showPay && (
        <div style={{
          position: "fixed",
          inset: 0,
          background: "#0006",
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}>
          <div style={{
            background: "#fff",
            padding: 20,
            borderRadius: 16,
            width: 300
          }}>
            <h3>Make Payment</h3>

            <input
              placeholder="Amount"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              style={{ width: "100%", padding: 10 }}
            />

            <textarea
              placeholder="Note"
              value={payNote}
              onChange={(e) => setPayNote(e.target.value)}
              style={{ width: "100%", padding: 10, marginTop: 10 }}
            />

            <button onClick={payNow} style={{
              width: "100%",
              marginTop: 10,
              padding: 12,
              background: "#2563eb",
              color: "#fff",
              borderRadius: 10,
              border: "none"
            }}>
              CONFIRM
            </button>

            <button onClick={() => setShowPay(false)} style={{
              width: "100%",
              marginTop: 8,
              padding: 12
            }}>
              CANCEL
            </button>
          </div>
        </div>
      )}

    </div>
  );
}

