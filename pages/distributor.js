import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { createClient } from "@supabase/supabase-js";
import products from "../data/products.json";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Distributor() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [outstanding, setOutstanding] = useState(0);

  const [cart, setCart] = useState({});
  const [msg, setMsg] = useState("");
  const [ready, setReady] = useState(false);

  const [payBox, setPayBox] = useState(false);
  const [payAmount, setPayAmount] = useState("");

  const distributorNames = {
    "dist1@vfive.com": "Vijayakumar",
    "dist2@vfive.com": "Senthil Kumar",
  };

  // AUTH + load outstanding
  useEffect(() => {
    async function protect() {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) return router.push("/");

      const userEmail = session.user.email.toLowerCase();
      setEmail(userEmail);

      if (!distributorNames[userEmail]) return router.push("/");

      setName(distributorNames[userEmail]);

      // Load outstanding balance
      const { data: acc } = await supabase
        .from("accounts")
        .select("outstanding")
        .eq("email", userEmail)
        .single();

      if (acc) setOutstanding(acc.outstanding);

      // Init cart
      const c = {};
      products.forEach((p) => (c[p.id] = 0));
      setCart(c);

      setReady(true);
    }
    protect();
  }, []);

  function update(id, val) {
    setCart((prev) => ({ ...prev, [id]: Number(val) }));
  }

  // ORDER → increases outstanding
  async function submit() {
    try {
      const res = await fetch("/api/place-order", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ cart, from_email: email, from_name: name }),
      });

      const j = await res.json();
      console.log("ORDER RESPONSE:", j);

      if (j.ok) {
        // Refresh outstanding
        const { data: acc } = await supabase
          .from("accounts")
          .select("outstanding")
          .eq("email", email)
          .single();

        if (acc) setOutstanding(acc.outstanding);

        setMsg("Order placed — manufacturer notified.");
      } else {
        setMsg("Failed: " + JSON.stringify(j.error));
      }
    } catch (err) {
      setMsg("Failed: " + err.message);
    }
  }

  // PAYMENT → decreases outstanding
  async function makePayment() {
    if (!payAmount || isNaN(payAmount))
      return alert("Enter valid amount");

    const amount = Number(payAmount);

    const { data, error } = await supabase.rpc("decrement_outstanding", {
      email_input: email,
      amount,
    });

    if (error) {
      alert("Payment failed: " + error.message);
      return;
    }

    // Update on UI
    const { data: acc } = await supabase
      .from("accounts")
      .select("outstanding")
      .eq("email", email)
      .single();

    if (acc) setOutstanding(acc.outstanding);

    setPayBox(false);
    setPayAmount("");
    alert("Payment submitted");
  }

  if (!ready) return <p style={{ padding: 20 }}>Loading...</p>;

  return (
    <div style={{ padding: 24 }}>
      <h1>Distributor — {name}</h1>
      <p><b>Email:</b> {email}</p>
      <p><b>Outstanding Amount:</b> ₹ {outstanding}</p>

      <button
        onClick={() => setPayBox(true)}
        style={{ padding: "6px 12px", background: "orange", color: "#fff", borderRadius: 6 }}
      >
        Make Payment
      </button>

      {payBox && (
        <div style={{ marginTop: 15, padding: 15, border: "1px solid #ccc", borderRadius: 8 }}>
          <h3>Enter Payment Amount</h3>
          <input
            type="number"
            value={payAmount}
            onChange={(e) => setPayAmount(e.target.value)}
            style={{ width: "100%", padding: 8 }}
          />
          <button
            onClick={makePayment}
            style={{ marginTop: 10, padding: "8px 12px", background: "green", color: "#fff" }}
          >
            Pay
          </button>
          <button
            onClick={() => setPayBox(false)}
            style={{ marginLeft: 10, padding: "8px 12px", background: "red", color: "#fff" }}
          >
            Cancel
          </button>
        </div>
      )}

      {/* PRODUCTS */}
      <div style={{ display: "grid", gap: 10, marginTop: 20 }}>
        {products.map((p) => (
          <div key={p.id} style={{
            display: "flex",
            justifyContent: "space-between",
            padding: 10,
            background: "#fff",
            borderRadius: 8,
          }}>
            <div>
              <div style={{ fontWeight: 600 }}>{p.name}</div>
              <div style={{ fontSize: 13, color: "#555" }}>₹ {p.rate}</div>
            </div>

            <input
              type="number"
              min={0}
              value={cart[p.id] || 0}
              onChange={(e) => update(p.id, e.target.value)}
              style={{ width: 80, padding: 6 }}
            />
          </div>
        ))}
      </div>

      <button
        onClick={submit}
        style={{
          marginTop: 20,
          padding: "10px 16px",
          background: "#0ea5e9",
          color: "#fff",
          borderRadius: 6,
        }}
      >
        Submit Order
      </button>

      <p style={{ marginTop: 12 }}>{msg}</p>
    </div>
  );
}
