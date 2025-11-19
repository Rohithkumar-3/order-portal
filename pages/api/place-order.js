import supabase from './supabase-client'
import PDFDocument from 'pdfkit'
import streamBuffers from 'stream-buffers'
import products from '../../data/products.json'

export default async function handler(req, res) {
  if (req.method !== 'POST')
    return res.status(405).json({ error: 'Method not allowed' })

  try {
    const { cart, from_email } = req.body

    const items = []
    let grandTotal = 0

    // Build items list with totals
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
          total: lineTotal
        })
      }
    }

    // CREATE PDF
    const doc = new PDFDocument({ margin: 40 })
    const bufferStream = new streamBuffers.WritableStreamBuffer()
    doc.pipe(bufferStream)

    // PDF Header
    doc.fontSize(18).text('Order Notification', { align: 'center' })
    doc.moveDown()
    doc.fontSize(11).text(`From: ${from_email || 'Distributor'}`)
    doc.text('Date: ' + new Date().toLocaleString())
    doc.moveDown()

    doc.fontSize(12).text('Items Ordered:')
    doc.moveDown(0.5)

    // Items in PDF
    items.forEach(it => {
      doc.fontSize(11).text(
        `${it.name} — Qty: ${it.qty} × ₹${it.rate} = ₹${it.total.toFixed(2)}`
      )
    })

    doc.moveDown(1)

    // GRAND TOTAL
    doc.fontSize(14).text(`Grand Total: ₹${grandTotal.toFixed(2)}`, {
      align: 'right'
    })

    doc.end()
    await new Promise(r => doc.on('end', r))

    const pdfBuffer = bufferStream.getContents()

    // File name
    const fileName = `order_${Date.now()}.pdf`

    // UPLOAD PDF
    const { error: upErr } = await supabase.storage
      .from('orders')
      .upload(fileName, pdfBuffer, {
        contentType: 'application/pdf',
      })

    if (upErr) throw upErr

    // PUBLIC URL
    const { data: urlData } = supabase.storage
      .from('orders')
      .getPublicUrl(fileName)

    const publicUrl = urlData.publicUrl

    // SAVE IN DATABASE
    const { error: insErr } = await supabase
      .from('orders')
      .insert([
        {
          from_email,
          pdf_path: fileName,
          pdf_url: publicUrl,
          items,               // clean JSON
          grand_total: grandTotal  // number only
        },
      ])

    if (insErr) throw insErr

    return res.json({ ok: true })

  } catch (err) {
    console.error(err)
    return res.status(500).json({ error: String(err) })
  }
}
