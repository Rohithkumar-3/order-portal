import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'
import { useRouter } from 'next/router'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)

export default function Home() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const router = useRouter()

  async function loginOnly(e) {
    e.preventDefault()

    // Allowed email list
    const allowedEmails = [
      "dist1@vfive.com",
      "dist2@vfive.com",
      "manu@vfive.com"
    ]

    // Block if email not allowed
    if (!allowedEmails.includes(email)) {
      alert("Access Denied: You are not authorized.")
      return
    }

    // LOGIN ONLY – NO SIGNUP
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })

    if (error) {
      alert("Incorrect password")
      return
    }

    // Redirect based on email
    if (email === "manu@vfive.com") {
      router.push("/manufacturer")
    } else {
      router.push("/distributor")
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
      <form
        onSubmit={loginOnly}
        style={{
          maxWidth: 420,
          width: "100%",
          background: "#fff",
          padding: 20,
          borderRadius: 8,
          boxShadow: "0 6px 20px rgba(0,0,0,0.06)"
        }}
      >
        <h2 style={{ marginBottom: 12 }}>VFive Company Portal — Login</h2>

        <input
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ width: "100%", padding: 8, marginBottom: 8 }}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ width: "100%", padding: 8, marginBottom: 8 }}
        />

        <button
          style={{
            width: "100%",
            padding: 10,
            background: "#2563eb",
            color: "#fff",
            borderRadius: 6
          }}
        >
          Login
        </button>
      </form>
    </div>
  )
}
