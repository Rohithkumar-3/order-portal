import supabase from './supabase-client'

export default async function handler(req,res){
  try {
    const { data, error } = await supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(50)
    if(error) throw error
    return res.json({ orders: data })
  } catch(err) {
    console.error(err)
    return res.status(500).json({ error: String(err) })
  }
}
