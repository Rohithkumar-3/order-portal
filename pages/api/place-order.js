import supabase from "./supabase-client";
import PDFDocument from "pdfkit";
import streamBuffers from "stream-buffers";
import products from "../../data/products.json";

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  try {
    const { cart, from_email, from_name } = req.body;

    let items = [];
    let grand_total = 0;

    // Build order
    for (const p of products) {
      const qty = Number(cart[p.id] || 0);
      if (qty > 0) {
        const total = +(qty * p.rate).toFixed(2);
        grand_total += total;

        items.push({
          id: p.id,
          name: p.name,
          rate: p.rate,
          qty,
          total,
        });
      }
    }

    if (items.length === 0)
      return res.json({ ok: false, error: "No items selected" });

    // ========== CREATE PDF ==========
    const doc = new PDFDocument({ margin: 40 });
    const buffer = new streamBuffers.WritableStreamBuffer();
    doc.pipe(buffer);

    doc.fontSize(18).text("V FIVE ENTERPRISES", { align: "center" });
    doc.fontSize(14).text("Order Invoice", { align: "center" });
    doc.moveDown();

    doc.fontSize(11).text(`Distributor: ${from_name}`);
    doc.text(`Email: ${from_email}`);
    doc.text(`Date: ${new Date().toLocaleString()}`);
    doc.moveDown();

    doc.text("-------------------------------------------------------");
    doc.text("Product          Qty   Rate    Total");
    doc.text("-------------------------------------------------------");

    items.forEach((i) => {
      doc.text(
        `${i.name.padEnd(16)} ${i.qty.toString().padEnd(5)} ₹${i.rate
          .toString()
          .padEnd(6)} ₹${i.total}`
      );
    });

    doc.text("-------------------------------------------------------");
    doc.moveDown();
    doc.fontSize(14).text(`GRAND TOTAL: ₹ ${grand_total}`, { align: "right" });

    doc.moveDown(2);
    doc.fontSize(11).text("Signature _____________________");

    doc.end();
    await new Promise((r) => doc.on("end", r));

    const pdfBuffer = buffer.getContents();
    const fileName = `order_${Date.now()}.pdf`;

    let publicUrl = null;

    // Upload PDF
    if (pdfBuffer) {
      const { error: upErr } = await supabase.storage
        .from("orders")
        .upload(fileName, pdfBuffer, {
          contentType: "application/pdf",
        });

      if (!upErr) {
        const { data } = supabase.storage.from("orders").getPublicUrl(fileName);
        publicUrl = data.publicUrl;
      }
    }

    // Insert into orders table
    const { error: orderErr } = await supabase.from("orders").insert([
      {
        from_email,
        from_name,
        pdf_path: fileName,
        pdf_url: publicUrl,
        items,
        grand_total,
      },
    ]);

    if (orderErr) throw orderErr;

    // Increase outstanding
    const { error: incErr } = await supabase.rpc("increment_outstanding", {
      email_input: from_email,
      amount: grand_total,
    });

    if (incErr) console.log("Outstanding Error:", incErr);

    return res.json({
      ok: true,
      total: grand_total,
      pdf: publicUrl,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err.message });
  }
}
