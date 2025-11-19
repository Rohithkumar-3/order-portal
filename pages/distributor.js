import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { createClient } from '@supabase/supabase-js'
import products from '../data/products.json'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function Distributor() {

  const router = useRouter()
  const [email, setEmail] = useState("")
  const [cart, setCart] = useState({})
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState("")

  useEffect(() => {
    async function authenticate() {
      const { data: { session } } = await supabase.auth.getSession()

      // No session → send to login
      if (!session) {
        window.location.href = "/"
        return
      }

      const userEmail = session.user.email
      setEmail(userEmail)

      // Allowed distributor emails
      const allowed = ["dist1@vfive.com", "dist2@vfive.com"]

      if (!allowed.includes(userEmail)) {
        window.location.href = "/"
        return
      }

      // NOW safe to load cart
      const initial = {}
      products.forEach(p => initial[p.id] = 0)
      setCart(initial)

      setLoading(false)
    }

    authenticate()
  }, [])

  // Update cart
  function update(id, value) {
    setCart(prev => ({ ...prev, [id]: Number(value) }))
  }

  // Submit order
  async function submit() {
    if (!email) {
      alert("User email not detected.")
      return
    }

    const res = await fetch("/api/place-order", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ cart, from_email: email })
    })

    const j = await res.json()

    if (j.ok) setMsg("Order placed successfully.")
    else setMsg("Error: " + j.error)
  }

  if (loading) return <p style={{ padding: 20 }}>Loading...</p>

  return (
    <div style={{ padding: 24 }}>
      <h1>Distributor — Place Order</h1>

      <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
        {products.map(p => (
          <div
            key={p.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: 10,
              background: "#fff",
              borderRadius: 8
            }}
          >
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
          marginTop: 12,
          padding: "10px 16px",
          background: "#0ea5e9",
          color: "#fff",
          borderRadius: 6
        }}
      >
        Submit Order
      </button>

      <div style={{ marginTop: 12 }}>{msg}</div>
    </div>
  )
}
