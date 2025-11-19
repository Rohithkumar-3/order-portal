// pages/manufacturer.js
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/router";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// create client (same as before)
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON);

export default function Manufacturer() {
  const router = useRouter();
  const [statusLines, setStatusLines] = useState([]);
  const addStatus = (t) => setStatusLines((s) => [...s, ${new Date().toLocaleTimeString()} — ${t}]);

  const [email, setEmail] = useState("");
  const [accounts, setAccounts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [payments, setPayments] = useState([]);
  const [ready, setReady] = useState(false);
  const [loadingPaymentsClient, setLoadingPaymentsClient] = useState(false);
  const [loadingPaymentsREST, setLoadingPaymentsREST] = useState(false);

  const manufacturerAllowed = "manu@vfive.com";

  // helper: safe console + status
  function log(...args) {
    console.log(...args);
    try {
      addStatus(JSON.stringify(args.map(a => (typeof a === "object" ? (a && a.message) || JSON.stringify(a) : a)).join(" ")).slice(0,300));
    } catch {}
  }

  useEffect(() => {
    async function init() {
      log("INIT start");
      // 1) get session
      const { data: getSessionData, error: sessErr } = await supabase.auth.getSession();
      if (sessErr) {
        log("getSession error", sessErr);
        router.push("/");
        return;
      }
      const session = getSessionData?.session ?? null;
      if (!session) {
        log("no session -> redirect");
        router.push("/");
        return;
      }
      const userEmail = session.user?.email?.toLowerCase?.() ?? "";
      log("logged userEmail:", userEmail);
      setEmail(userEmail);

      // check allowed
      if (userEmail !== manufacturerAllowed) {
        log("User not authorized as manufacturer:", userEmail);
        router.push("/");
        return;
      }
      log("authorized manufacturer");

      // load accounts & orders
      try {
        const { data: acc } = await supabase.from("accounts").select("*");
        log("accounts loaded:", acc?.length ?? 0);
        setAccounts(acc ?? []);
      } catch (err) {
        log("accounts error", err);
      }

      try {
        const { data: ord } = await supabase.from("orders").select("*").order("id", { ascending: false });
        log("orders loaded:", ord?.length ?? 0);
        setOrders(ord ?? []);
      } catch (err) {
        log("orders error", err);
      }

      // 1) Load payments with Supabase client
      await loadPaymentsWithClient();

      // 2) Also load payments using REST (fallback) to check SDK vs API
      await loadPaymentsWithREST();

      setReady(true);
      log("INIT done");
    }
    init();
  }, []); // run only once

  // SUPABASE CLIENT method
  async function loadPaymentsWithClient() {
    setLoadingPaymentsClient(true);
    try {
      log("client: requesting payments via supabase client...");
      const { data, error } = await supabase
        .from("payments")
        .select("*")
        .order("created_at", { ascending: false });

      log("client: error ->", error);
      log("client: data length ->", data?.length ?? 0);
      if (error) {
        // show error in UI and console
        addStatus("client error: " + (error.message || JSON.stringify(error)));
      }
      setPayments(data ?? []);
    } catch (err) {
      log("client exception", err);
      addStatus("client exception: " + (err.message || String(err)));
    } finally {
      setLoadingPaymentsClient(false);
    }
  }

  // REST fetch method (bypasses SDK) -- used for debugging only
  async function loadPaymentsWithREST() {
    setLoadingPaymentsREST(true);
    try {
      log("rest: requesting payments via REST endpoint...");
      const url = ${SUPABASE_URL}/rest/v1/payments?select=*&order=created_at.desc;
      const res = await fetch(url, {
        headers: {
          apikey: SUPABASE_ANON,
          Authorization: Bearer ${SUPABASE_ANON},
        },
      });
      const text = await res.text();
      log("rest: status", res.status);
      // try parse
      try {
        const json = JSON.parse(text || "[]");
        log("rest: parsed length ->", (Array.isArray(json) && json.length) || 0);
        // show REST results in console but do NOT replace client payments
        // We'll display both: client payments and restPayments (we reuse payments var for simplicity)
        // setPayments(json); // don't overwrite, but store in status
        addStatus("rest length: " + (Array.isArray(json) ? json.length : "not-array"));
      } catch (err) {
        log("rest parse error", err);
        addStatus("rest parse error: " + err.message);
      }
    } catch (err) {
      log("rest exception", err);
      addStatus("rest exception: " + (err.message || String(err)));
    } finally {
      setLoadingPaymentsREST(false);
    }
  }

  // UI helper: show payments in small table
  function PaymentsBox() {
    return (
      <div style={{}}>
        <h3 style={{ margin: 0 }}>Payments</h3>
        <div style={{ fontSize: 12, color: "#666", marginBottom: 8 }}>
          Client load: {loadingPaymentsClient ? "loading..." : "done"} — REST probe: {loadingPaymentsREST ? "loading..." : "done"}
        </div>

        {payments.length === 0 ? (
          <div style={{ color: "#666" }}>No payments returned by client</div>
        ) : (
          <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
            {payments.map((p) => (
              <div key={p.id} style={{ padding: 10, borderBottom: "1px solid #eee" }}>
                <div style={{ fontWeight: 700 }}>{p.name} — ₹ {p.amount}</div>
                <div style={{ fontSize: 12, color: "#666" }}>{p.email} — {new Date(p.created_at).toLocaleString()}</div>
                <div style={{ fontSize: 13 }}>{p.note}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  // small debug status panel at top-right
  function StatusPanel() {
    return (
      <div style={{
        position: "fixed",
        right: 18,
        bottom: 18,
        width: 420,
        maxHeight: "38vh",
        overflowY: "auto",
        background: "#fff",
        padding: 12,
        borderRadius: 8,
        boxShadow: "0 6px 20px rgba(0,0,0,0.12)",
        zIndex: 9999,
        border: "1px solid #eee"
      }}>
        <div style={{ fontWeight: 700, marginBottom: 6 }}>Debug Status</div>
        <div style={{ fontSize: 13, color: "#555" }}>
          <div><b>Session email:</b> {email || "—"}</div>
          <div><b>Payments (client):</b> {payments.length}</div>
          <div style={{ marginTop: 8, fontWeight: 600 }}>Recent console:</div>
          <div style={{ fontSize: 12, color: "#333" }}>
            {statusLines.slice().reverse().slice(0, 8).map((s, i) => <div key={i} style={{ padding: "4px 0", borderBottom: "1px dashed #f0f0f0" }}>{s}</div>)}
          </div>
        </div>
      </div>
    );
  }

  if (!ready) {
    return (
      <div style={{ padding: 24 }}>
        <h1>Manufacturer Dashboard (debug)</h1>
        <p>Initializing… check console and Debug Status panel (bottom-right)</p>
        <StatusPanel />
      </div>
    );
  }

  // Normal UI (left content + fixed payments on right)
  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: "auto", display: "grid", gridTemplateColumns: "1fr 380px", gap: 20 }}>
      <div>
        <div style={{ marginBottom: 16 }}>
          <h1>Manufacturer Dashboard</h1>
          <div style={{ color: "#666" }}>Logged in as: <b>{email}</b></div>
        </div>

        <div style={{ background: "#fff", padding: 16, borderRadius: 8, marginBottom: 16 }}>
          <h2 style={{ marginTop: 0 }}>Distributor Outstanding</h2>
          {accounts.map(a => (
            <div key={a.email} style={{ padding: 10, borderRadius: 8, background: "#fafafa", marginBottom: 8 }}>
              <div style={{ fontWeight: 700 }}>{a.name}</div>
              <div style={{ color: "#666", fontSize: 13 }}>{a.email}</div>
              <div style={{ color: "red", marginTop: 6 }}>Outstanding: ₹ {a.outstanding}</div>
            </div>
          ))}
        </div>

        <div style={{ background: "#fff", padding: 16, borderRadius: 8 }}>
          <h2 style={{ marginTop: 0 }}>Orders</h2>
          {orders.map(o => (
            <div key={o.id} style={{ padding: 10, borderBottom: "1px solid #eee" }}>
              <div style={{ fontWeight: 700 }}>{o.from_name} ({o.from_email})</div>
              <div style={{ color: "#666" }}>₹ {o.grand_total} — {new Date(o.created_at).toLocaleString()}</div>
              <a href={o.pdf_url} target="_blank" rel="noreferrer">View PDF</a>
            </div>
          ))}
        </div>
      </div>

      {/* RIGHT COLUMN — always-visible payments */}
      <div style={{ position: "sticky", top: 20, alignSelf: "start" }}>
        <div style={{ background: "#fff", padding: 16, borderRadius: 8 }}>
          <PaymentsBox />
        </div>
      </div>

      <StatusPanel />
    </div>
  );
}
