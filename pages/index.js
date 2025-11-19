import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/router'

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

export default function Home(){
  const [email,setEmail]=useState('')
  const [password,setPassword]=useState('')
  const [role,setRole]=useState('distributor')
  const router = useRouter()

  async function signupOrLogin(e){
    e.preventDefault()
    // Try sign in
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if(signInError){
      // sign up
      const { data, error } = await supabase.auth.signUp({ email, password, options: { data: { role } } })
      if(error){ alert(error.message); return }
      alert('Signup created. Confirm your email or login after verification.')
      return
    }
    // store role and go to dashboard
    localStorage.setItem('user_role', role)
    router.push(role === 'distributor' ? '/distributor' : '/manufacturer')
  }

  return (
    <div className="min-h-screen flex items-center justify-center">
      <form onSubmit={signupOrLogin} style={{maxWidth:420, width:'100%', background:'#fff', padding:20, borderRadius:8, boxShadow:'0 6px 20px rgba(0,0,0,0.06)'}}>
        <h2 style={{marginBottom:12}}>Company Portal — Login / Sign up</h2>
        <select value={role} onChange={e=>setRole(e.target.value)} style={{width:'100%', padding:8, marginBottom:8}}>
          <option value="distributor">Distributor</option>
          <option value="manufacturer">Manufacturer</option>
        </select>
        <input placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} style={{width:'100%', padding:8, marginBottom:8}} />
        <input type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} style={{width:'100%', padding:8, marginBottom:8}} />
        <button style={{width:'100%', padding:10, background:'#2563eb', color:'#fff', borderRadius:6}}>Login / Signup</button>
      </form>
    </div>
  )
}
