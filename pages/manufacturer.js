import { useEffect, useState } from 'react'

export default function Manufacturer(){
  const [inbox,setInbox] = useState([])

  useEffect(()=>{ load() }, [])

  async function load(){
    const res = await fetch('/api/inbox')
    const j = await res.json()
    setInbox(j.orders || [])
  }

  return (
    <div style={{padding:24}}>
      <h1>Manufacturer — Inbox</h1>
      {inbox.length===0 ? <div style={{color:'#666', marginTop:12}}>No orders yet.</div> : (
        <ul style={{marginTop:12, display:'grid', gap:12}}>
          {inbox.map(o => (
            <li key={o.id} style={{background:'#fff', padding:12, borderRadius:8, display:'flex', justifyContent:'space-between'}}>
              <div>
                <div style={{fontWeight:700}}>Order by {o.from_email} — {new Date(o.created_at).toLocaleString()}</div>
                <ul style={{marginTop:8}}>
                  {o.items.map(it => <li key={it.id}>{it.name} — {it.qty}</li>)}
                </ul>
              </div>
              <div>
                <a href={o.pdf_url} target="_blank" rel="noreferrer" style={{padding:'8px 10px', borderRadius:6, border:'1px solid #ddd'}}>Open PDF</a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
