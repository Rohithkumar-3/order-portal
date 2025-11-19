import supabase from './supabase-client'
import PDFDocument from 'pdfkit'
import streamBuffers from 'stream-buffers'
import products from '../../data/products.json'

export default async function handler(req,res){
  if(req.method !== 'POST') return res.status(405).json({error:'Method not allowed'})
  try {
    const { cart } = req.body
    const items = []
    for(const p of products){
      const qty = Number(cart[p.id]||0)
      if(qty>0) items.push({ id:p.id, name:p.name, rate:p.rate, qty })
    }
    // create PDF into buffer
    const doc = new PDFDocument({ margin: 40 })
    const writableStreamBuffer = new streamBuffers.WritableStreamBuffer()
    doc.pipe(writableStreamBuffer)

    doc.fontSize(18).text('Order Notification', { align: 'center' })
    doc.moveDown()
    doc.fontSize(11).text('From: Distributor (web portal)')
    doc.text('Date: ' + new Date().toLocaleString())
    doc.moveDown()
    doc.text('Items:')
    doc.moveDown(0.5)
    items.forEach(it => doc.text(`${it.name} — Qty: ${it.qty} — Rate: ${it.rate}`))
    doc.end()
    await new Promise(r => doc.on('end', r))
    const pdfBuffer = writableStreamBuffer.getContents()

    const fileName = `orders/order_${Date.now()}.pdf`
    const { error: upErr } = await supabase.storage.from('orders').upload(fileName, pdfBuffer, { contentType: 'application/pdf' })
    if(upErr) throw upErr

    const { publicURL } = supabase.storage.from('orders').getPublicUrl(fileName)
    // insert into orders table
    const { error: insErr } = await supabase.from('orders').insert([{ from_email: 'distributor@demo.com', pdf_path: fileName, pdf_url: publicURL, items }])
    if(insErr) throw insErr

    return res.json({ ok: true })
  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: String(err) })
  }
}
