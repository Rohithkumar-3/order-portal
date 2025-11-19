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
  const [ready, setReady] = useState(false);

  const [cart, setCart] = useState({});
  const [msg, setMsg] = useState("");

  const distributorNames = {
    "dist1@vfive.com": "Vijayakumar",
    "dist2@vfive.com": "Senthil Kumar",
  };

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) return router.push("/");

      const userEmail = session.user.email.toLowerCase();
      setEmail(userEmail);

      const dName = distributorNames[userEmail];
      if (!dName) return router.push("/");

      setName(dName);

      const { data: acc } = await supabase
        .from("accounts")
        .select("outstanding")
        .eq("email", userEmail)
        .single();

      if (acc) setOutstanding(acc.outstanding);

      const c = {};
      products.forEach((p) => (c[p.id] = 0));
      setCart(c);

      setReady(true);
    }

    init();
  }, []);

  function update(id, value) {
    setCart((prev) => ({ ...prev, [id]: Number(value) }));
  }

  async function submit() {
    const res = await fetch("/api/place-order", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        cart,
        from_email: email,
        from_name: name,
      }),
    });

    const j = await res.json();
    if (j.ok) {
      setMsg("Order placed!");
    } else {
      setMsg("Failed: " + j.error);
    }
  }

  if (!ready) return <p style={{ padding: 20 }}>Loading…</p>;

  return (
    <div style={{ padding: 24 }}>
      <h1>Distributor — {name}</h1>
      <p><b>Email:</b> {email}</p>
      <p><b>Outstanding:</b> ₹ {outstanding}</p>

      <div style={{ display: "grid", gap: 10, marginTop: 20 }}>
        {products.map((p) => (
          <div
            key={p.id}
            style={{
              padding: 10,
              background: "#fff",
              borderRadius: 8,
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <div>
              <div style={{ fontWeight: 600 }}>{p.name}</div>
              <div style={{ fontSize: 13, color: "#555" }}>₹ {p.rate}</div>
            </div>

            <input
              type="number"
              min="0"
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

      <p style={{ marginTop: 10 }}>{msg}</p>
    </div>
  );
}
