import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function Manufacturer() {
  const router = useRouter()
  const [orders, setOrders] = useState([])

  useEffect(() => {
    async function protectPage() {
      const { data: { session } } = await supabase.auth.getSession()

      // If no session → send to login page
      if (!session) {
        window.location.href = '/'
        return
      }

      const email = session.user.email
      const allowedManufacturers = ["manu@vfive.com"]

      // Block if not manufacturer
      if (!allowedManufacturers.includes(email)) {
        window.location.href = '/'
        return
      }
    }

    async function loadOrders() {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('id', { ascending: false })

      if (!error) setOrders(data)
    }

    protectPage()
    loadOrders()
  }, [])

  return (
    <div style={{ padding: 24 }}>
      <h1>Manufacturer — Orders Received</h1>

      <div style={{ marginTop: 20 }}>
        {orders.map(o => (
          <div
            key={o.id}
            style={{
              marginBottom: 12,
              padding: 12,
              background: '#fff',
              borderRadius: 8,
              boxShadow: '0 2px 6px rgba(0,0,0,0.06)'
            }}
          >
            <div><b>Order ID:</b> {o.id}</div>
            <div><b>From:</b> {o.from_email}</div>
            <div><b>Items:</b></div>
            <ul>
              {o.items?.map((it, i) => (
                <li key={i}>
                  {it.name} — Qty: {it.qty} — Rate: {it.rate}
                </li>
              ))}
            </ul>

            {o.pdf_url ? (
              <a
                href={o.pdf_url}
                target="_blank"
                rel="noreferrer"
                style={{
                  marginTop: 10,
                  display: 'inline-block',
                  padding: '8px 15px',
                  background: '#2563eb',
                  color: '#fff',
                  borderRadius: 6
                }}
              >
                Open PDF
              </a>
            ) : (
              <p style={{ color: 'red' }}>No PDF found</p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
