import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function Admin() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [accounts, setAccounts] = useState([]);
  const [orders, setOrders] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  const ADMIN_ONLY = ["admin@vfive.com"];

  useEffect(() => {
    async function init() {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) return router.push("/");

      const userEmail = session.user.email.toLowerCase();

      if (!ADMIN_ONLY.includes(userEmail)) {
        alert("Access denied. Admin only.");
        return router.push("/");
      }

      setEmail(userEmail);
      await refreshAll();

      setLoading(false);
    }

    init();
  }, []);

  async function refreshAll() {
    const { data: acc } = await supabase.from("accounts").select("*");
    const { data: ord } = await supabase.from("orders").select("*").order("created_at",{ascending:false});
    const { data: pay } = await supabase.from("payments").select("*").order("created_at",{ascending:false});

    setAccounts(acc || []);
    setOrders(ord || []);
    setPayments(pay || []);
  }

  const totalSales = orders.reduce((a,b)=> a + Number(b.grand_total), 0);
  const totalPaid = payments.reduce((a,b)=> a + Number(b.amount), 0);

  function weeklyTotal() {
    const week = 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();

    return orders.filter(o => (now - new Date(o.created_at)) < week)
      .reduce((a,b)=>a + Number(b.grand_total),0);
  }

  function monthlyTotal() {
    const month = 30 * 24 * 60 * 60 * 1000;
    const now = Date.now();

    return orders.filter(o => (now - new Date(o.created_at)) < month)
      .reduce((a,b)=>a + Number(b.grand_total),0);
  }

  function topDistributors() {
    const totals = {};
    orders.forEach(o => {
      totals[o.from_name] = (totals[o.from_name] || 0) + Number(o.grand_total);
    });

    return Object.entries(totals)
      .sort((a,b)=>b[1]-a[1])
      .slice(0,5);
  }

  if (loading) return <p style={{padding:30}}>Loading Boss Panel...</p>;

  return (
    <div style={{padding:30, background:"#0f172a", minHeight:"100vh", color:"#fff"}}>

      {/* HEADER */}
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:30}}>
        <div>
          <h1>👑 ADMIN CONTROL PANEL</h1>
          <p style={{color:"#94a3b8"}}>Logged in as: {email}</p>
        </div>
        <button
          onClick={async ()=>{
            await supabase.auth.signOut();
            router.push("/");
          }}
          style={{background:"#ef4444",border:"none",padding:"10px 16px",borderRadius:10,color:"#fff"}}
        >
          Logout
        </button>
      </div>

      {/* SUMMARY CARDS */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:20,marginBottom:30}}>
        <Summary label="Total Sales" value={`₹ ${totalSales}`} />
        <Summary label="Total Payments" value={`₹ ${totalPaid}`} />
        <Summary label="Total Outstanding" value={`₹ ${accounts.reduce((a,b)=>a+Number(b.outstanding),0)}`} />
        <Summary label="This Week" value={`₹ ${weeklyTotal()}`} />
        <Summary label="This Month" value={`₹ ${monthlyTotal()}`} />
        <Summary label="Total Orders" value={orders.length} />
      </div>

      {/* MAIN GRID */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 420px",gap:20}}>

        {/* LEFT SIDE */}
        <div>

          {/* Top Distributors */}
          <div style={cardStyle}>
            <h2>🏆 Top Distributors</h2>
            {topDistributors().map(([name,val],i)=>(
              <div key={i} style={{padding:8}}>
                <b>{name}</b> — ₹ {val}
              </div>
            ))}
          </div>

          {/* ACCOUNT CONTROL */}
          <div style={cardStyle}>
            <h2>💼 Manage Outstanding</h2>
            {accounts.map(ac => (
              <DistributorControl key={ac.email} account={ac} refresh={refreshAll} />
            ))}
          </div>

          {/* ORDERS */}
          <div style={cardStyle}>
            <h2>📦 Orders</h2>
            {orders.map(o => (
              <div key={o.id} style={{padding:10,borderBottom:"1px solid #1e293b"}}>
                <b>{o.from_name}</b> — ₹ {o.grand_total}
                <div style={{fontSize:12,color:"#94a3b8"}}>{new Date(o.created_at).toLocaleString()}</div>
                <a href={o.pdf_url} target="_blank" style={{color:"#60a5fa"}}>View PDF</a>
              </div>
            ))}
          </div>

        </div>

        {/* RIGHT SIDE – PAYMENTS */}
        <div style={{position:"sticky",top:30}}>
          <div style={cardStyle}>
            <h2>💰 Payment History</h2>
            {payments.map(p=>(
              <div key={p.id} style={{padding:10,borderBottom:"1px solid #1e293b"}}>
                <b>{p.name}</b>
                <div>₹ {p.amount}</div>
                <div style={{fontSize:12}}>{p.note || "-"}</div>
                <div style={{fontSize:11,color:"#94a3b8"}}>{new Date(p.created_at).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}

function Summary({label,value}) {
  return (
    <div style={{
      background:"#1e293b",
      padding:20,
      borderRadius:16,
      textAlign:"center",
      boxShadow:"0 8px 20px rgba(0,0,0,0.4)"
    }}>
      <div style={{fontSize:14,color:"#94a3b8"}}>{label}</div>
      <div style={{fontSize:26,fontWeight:"bold",marginTop:6}}>{value}</div>
    </div>
  )
}

function DistributorControl({account, refresh}) {
  const [amt, setAmt] = useState("");

  async function add() {
    if (!amt) return;
    await supabase.rpc("increment_outstanding",{email_input:account.email,amount:Number(amt)});
    await supabase.from("payments").insert([{name:account.name,email:account.email,amount:Number(amt),note:"(ADMIN ADD)"}]);
    setAmt("");
    refresh();
  }

  async function subtract() {
    if (!amt) return;
    await supabase.rpc("decrement_outstanding",{email_input:account.email,amount:Number(amt)});
    await supabase.from("payments").insert([{name:account.name,email:account.email,amount:Number(amt),note:"(ADMIN REDUCE)"}]);
    setAmt("");
    refresh();
  }

  return (
    <div style={{borderBottom:"1px solid #1e293b",padding:"10px 0"}}>
      <b>{account.name}</b>
      <div style={{fontSize:13}}>₹ {account.outstanding}</div>
      <input
        value={amt}
        onChange={e=>setAmt(e.target.value)}
        placeholder="Amount"
        type="number"
        style={{width:"100%",padding:6,marginTop:6,borderRadius:6}}
      />
      <div style={{display:"flex",gap:6,marginTop:6}}>
        <button onClick={add} style={{flex:1,background:"#16a34a",color:"#fff",border:"none",padding:6,borderRadius:6}}>+ Add</button>
        <button onClick={subtract} style={{flex:1,background:"#dc2626",color:"#fff",border:"none",padding:6,borderRadius:6}}>- Reduce</button>
      </div>
    </div>
  )
}

const cardStyle = {
  background:"#020617",
  padding:20,
  borderRadius:18,
  marginBottom:20,
  boxShadow:"0 10px 30px rgba(0,0,0,0.5)"
}
