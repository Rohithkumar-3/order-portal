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

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) return setMsg(error.message);

    // Redirect based on role
    const lower = email.toLowerCase();

    if (lower === "manu@vfive.com") {
      router.push("/manufacturer");
    } else if (
      lower === "dist1@vfive.com" ||
      lower === "dist2@vfive.com"
    ) {
      router.push("/distributor");
    } else {
      setMsg("Unauthorized login.");
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "#f5f7fb",
        padding: 20,
      }}
    >
      <form
        onSubmit={login}
        style={{
          width: "100%",
          maxWidth: 420,
          background: "#fff",
          padding: 32,
          borderRadius: 16,
          boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
          border: "1px solid #eee",
        }}
      >
        <h2
          style={{
            fontSize: 28,
            fontWeight: 700,
            textAlign: "center",
            marginBottom: 20,
            color: "#1e293b",
          }}
        >
          V-Five Login
        </h2>

        <div style={{ marginBottom: 14 }}>
          <label
            style={{ fontSize: 14, fontWeight: 500, color: "#475569" }}
          >
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{
              width: "100%",
              padding: 12,
              marginTop: 6,
              borderRadius: 10,
              border: "1px solid #d1d5db",
              fontSize: 15,
            }}
          />
        </div>

        <div style={{ marginBottom: 18 }}>
          <label
            style={{ fontSize: 14, fontWeight: 500, color: "#475569" }}
          >
            Password
          </label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{
              width: "100%",
              padding: 12,
              marginTop: 6,
              borderRadius: 10,
              border: "1px solid #d1d5db",
              fontSize: 15,
            }}
          />
        </div>

        <button
          type="submit"
          style={{
            width: "100%",
            padding: 14,
            background: "#2563eb",
            color: "#fff",
            borderRadius: 10,
            fontWeight: 600,
            fontSize: 17,
            border: "none",
            cursor: "pointer",
            boxShadow: "0 4px 12px rgba(37,99,235,0.3)",
          }}
        >
          Login
        </button>

        {msg && (
          <p
            style={{
              marginTop: 12,
              textAlign: "center",
              color: "red",
              fontSize: 14,
            }}
          >
            {msg}
          </p>
        )}
      </form>
    </div>
  );
}
