import supabase from './supabase-client'
import PDFDocument from 'pdfkit'
import streamBuffers from 'stream-buffers'
import products from '../../data/products.json'

export default async function handler(req, res) {
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { cart, from_email } = req.body

    // BUILD ORDER ITEMS + TOTALS
    const items = []
    let grandTotal = 0

    for (const p of products) {
      const qty = Number(cart[p.id] || 0)
      if (qty > 0) {
        const lineTotal = qty * p.rate
        grandTotal += lineTotal

        items.push({
          id: p.id,
          name: p.name,
          rate: p.rate,
          qty,
          lineTotal
        })
      }
    }

    // GENERATE PDF
    const doc = new PDFDocument({ margin: 40 })
    const buffer = new streamBuffers.WritableStreamBuffer()
    doc.pipe(buffer)

    doc.fontSize(18).text("Order Notification", { align: "center" })
    doc.moveDown()

    doc.fontSize(12).text(`From Distributor: ${from_email}`)
    doc.text("Date: " + new Date().toLocaleString())
    doc.moveDown(1)

    doc.fontSize(14).text("Items Ordered:")
    doc.moveDown(0.5)

    items.forEach(it => {
      doc.fontSize(11).text(
        `${it.name} — Qty: ${it.qty} × Rate: ₹${it.rate} = ₹${it.lineTotal.toFixed(2)}`
      )
    })

    doc.moveDown(1)

    // GRAND TOTAL
    doc.fontSize(14).text(`Grand Total: ₹${grandTotal.toFixed(2)}`, {
      align: "right"
    })

    doc.end()

    await new Promise(r => doc.on("end", r))
    const pdfBuffer = buffer.getContents()

    // STORE PDF
    const fileName = `orders/order_${Date.now()}.pdf`
    const { error: upErr } = await supabase.storage
      .from("orders")
      .upload(fileName, pdfBuffer, { contentType: "application/pdf" })

    if (upErr) throw upErr

    const { publicURL } =
      supabase.storage.from("orders").getPublicUrl(fileName)

    // SAVE DB RECORD
    const { error: insErr } = await supabase
      .from("orders")
      .insert([
        {
          from_email,
          pdf_path: fileName,
          pdf_url: publicURL,
          items,
          grand_total: grandTotal
        }
      ])

    if (insErr) throw insErr

    return res.json({ ok: true })

  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: String(err) })
  }
}
