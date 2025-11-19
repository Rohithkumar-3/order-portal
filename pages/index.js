import { useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/router";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Home() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");

  async function login(e) {
    e.preventDefault();

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) return setMsg(error.message);

    const lower = email.toLowerCase();

    if (lower === "manu@vfive.com") router.push("/manufacturer");
    else if (lower === "dist1@vfive.com" || lower === "dist2@vfive.com")
      router.push("/distributor");
    else setMsg("Unauthorized login");
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(135deg, #1d4ed8 0%, #9333ea 50%, #ec4899 100%)",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: 20,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 420,
          background: "rgba(255,255,255,0.12)",
          borderRadius: 20,
          padding: 32,
          boxShadow: "0 15px 40px rgba(0,0,0,0.30)",
          backdropFilter: "blur(14px)",
          border: "1px solid rgba(255,255,255,0.25)",
        }}
      >
        <h2
          style={{
            textAlign: "center",
            color: "#fff",
            fontSize: 30,
            fontWeight: 700,
            marginBottom: 20,
          }}
        >
          V-Five Portal
        </h2>

        <div style={{ marginBottom: 16 }}>
          <label style={{ color: "#e2e8f0" }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              width: "100%",
              padding: 14,
              borderRadius: 12,
              background: "rgba(255,255,255,0.25)",
              border: "1px solid rgba(255,255,255,0.3)",
              color: "#fff",
              marginTop: 6,
            }}
          />
        </div>

        <div style={{ marginBottom: 18 }}>
          <label style={{ color: "#e2e8f0" }}>Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{
              width: "100%",
              padding: 14,
              borderRadius: 12,
              background: "rgba(255,255,255,0.25)",
              border: "1px solid rgba(255,255,255,0.3)",
              color: "#fff",
              marginTop: 6,
            }}
          />
        </div>

        <button
          onClick={login}
          style={{
            width: "100%",
            padding: 15,
            background: "#fff",
            color: "#1d4ed8",
            fontWeight: 700,
            fontSize: 17,
            borderRadius: 14,
            border: "none",
            cursor: "pointer",
            boxShadow: "0 6px 16px rgba(255,255,255,0.3)",
            marginTop: 10,
          }}
        >
          Login
        </button>

        {msg && (
          <p style={{ color: "#fff", marginTop: 12, textAlign: "center" }}>
            {msg}
          </p>
        )}
      </div>
    </div>
  );
}
