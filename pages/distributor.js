import { useEffect, useState } from 'react'
import products from '../data/products.json'

export default function Distributor(){
  const [cart, setCart] = useState({})
  const [msg, setMsg] = useState('')
  useEffect(()=> {
    const initial={}
    products.forEach(p=>initial[p.id]=0)
    setCart(initial)
  }, [])

  function update(id,val){ setCart(prev=>({...prev,[id]:Number(val)})) }

  async function submit(){
    const res = await fetch('/api/place-order', { method:'POST', headers:{'content-type':'application/json'}, body: JSON.stringify({cart}) })
    const j = await res.json()
    if(j.ok) setMsg('Order placed — manufacturer notified.')
    else setMsg('Failed: '+(j.error||'unknown'))
  }

  return (
    <div style={{padding:24}}>
      <h1>Distributor — Place Order</h1>
      <div style={{display:'grid', gap:10, marginTop:12}}>
        {products.map(p=>(
          <div key={p.id} style={{display:'flex', justifyContent:'space-between', padding:10, background:'#fff', borderRadius:8}}>
            <div>
              <div style={{fontWeight:600}}>{p.name}</div>
              <div style={{fontSize:13, color:'#555'}}>₹ {p.rate}</div>
            </div>
            <div>
              <input type="number" min={0} value={cart[p.id]||0} onChange={e=>update(p.id,e.target.value)} style={{width:80, padding:6}} />
            </div>
          </div>
        ))}
      </div>
      <div style={{marginTop:12}}>
        <button onClick={submit} style={{padding:'10px 16px', background:'#0ea5e9', color:'#fff', borderRadius:6}}>Submit Order</button>
        <span style={{marginLeft:12}}>{msg}</span>
      </div>
    </div>
  )
}
