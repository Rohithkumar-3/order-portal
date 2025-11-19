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
  const [msg, setMsg] = useState("")
  const [authReady, setAuthReady] = useState(false)

  // 🔒 Protect Page
  useEffect(() => {
    async function checkAuth() {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        window.location.href = "/"
        return
      }

      const userEmail = session.user.email
      const allowed = ["dist1@vfive.com", "dist2@vfive.com"]

      if (!allowed.includes(userEmail)) {
        window.location.href = "/"
        return
      }

      setEmail(userEmail)
      setAuthReady(true)
    }

    checkAuth()
  }, [])

  // 🛒 Load Cart AFTER auth
  useEffect(() => {
    if (authReady) {
      const initial = {}
      products.forEach(p => initial[p.id] = 0)
      setCart(initial)
    }
  }, [authReady])

  function update(id, val) {
    setCart(prev => ({ ...prev, [id]: Number(val) }))
  }

  async function submit() {
    const res = await fetch("/api/place-order", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        cart,
        from_email: email
      })
    })

    const j = await res.json()

    if (j.ok) setMsg("Order placed — manufacturer notified.")
    else setMsg("Failed: " + (j.error || "unknown"))
  }

  if (!authReady) return <p style={{ padding: 20 }}>Loading...</p>

  // 📦 OLD WORKING UI (unchanged)
  return (
    <div style={{ padding: 24 }}>
      <h1>Distributor — Place Order</h1>

      <div style={{ display: 'grid', gap: 10, marginTop: 12 }}>
        {products.map(p => (
          <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: 10, background: '#fff', borderRadius: 8 }}>
            <div>
              <div style={{ fontWeight: 600 }}>{p.name}</div>
              <div style={{ fontSize: 13, color: '#555' }}>₹ {p.rate}</div>
            </div>

            <input
              type="number"
              min={0}
              value={cart[p.id] || 0}
              onChange={e => update(p.id, e.target.value)}
              style={{ width: 80, padding: 6 }}
            />
          </div>
        ))}
      </div>

      <div style={{ marginTop: 12 }}>
        <button
          onClick={submit}
          style={{ padding: '10px 16px', background: '#0ea5e9', color: '#fff', borderRadius: 6 }}
        >
          Submit Order
        </button>
        <span style={{ marginLeft: 12 }}>{msg}</span>
      </div>
    </div>
  )
}
