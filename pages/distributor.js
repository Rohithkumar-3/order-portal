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
  const [cart, setCart] = useState({})
  
  useEffect(() => {
    async function check() {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session) {
        window.location.href = '/'
        return
      }

      const email = session.user.email
      const allowedDistributor = [
        "dist1@vfive.com",
        "dist2@vfive.com"
      ]

      if (!allowedDistributor.includes(email)) {
        window.location.href = '/'
      }
    }
    check()

    const initial = {}
    products.forEach(p => initial[p.id] = 0)
    setCart(initial)
  }, [])

  function update(id, val) {
    setCart(prev => ({ ...prev, [id]: Number(val) }))
  }

  async function submit() {
    const res = await fetch('/api/place-order', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ cart })
    })
    const j = await res.json()
    alert(j.ok ? "Order submitted!" : "Failed")
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>Distributor — Place Order</h1>
      {/* your UI stays same */}
    </div>
  )
}
