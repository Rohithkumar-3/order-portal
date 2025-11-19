import supabase from "./supabase-client";
import PDFDocument from "pdfkit";
import streamBuffers from "stream-buffers";
import products from "../../data/products.json";

export default async function handler(req, res) {
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  try {
    const { cart, from_email, from_name } = req.body;

    console.log("API RECEIVED NAME:", from_name, "EMAIL:", from_email);

    let items = [];
    let grand_total = 0;

    // Build order items
    for (const p of products) {
      const qty = Number(cart[p.id] || 0);
      if (qty > 0) {
        const total = qty * p.rate;
        grand_total += total;

        items.push({
          id: p.id,
          name: p.name,
          qty,
          rate: p.rate,
          total,
        });
      }
    }

    // Generate PDF
    const doc = new PDFDocument({ margin: 40 });
    const bufferStream = new streamBuffers.WritableStreamBuffer();
    doc.pipe(bufferStream);

    doc.fontSize(18).text("Order Notification", { align: "center" });
    doc.moveDown();

    doc.fontSize(14).text(`Distributor Name : ${from_name}`);
    doc.text(`Distributor Email : ${from_email}`);
    doc.text(`Date : ${new Date().toLocaleString()}`);
    doc.moveDown();

    items.forEach((it) =>
      doc.text(`${it.name} — Qty: ${it.qty} — Rate: ₹${it.rate} — Total: ₹${it.total}`)
    );

    doc.moveDown();
    doc.fontSize(14).text(`Grand Total: ₹${grand_total}`, { underline: true });

    doc.end();
    await new Promise((resolve) => doc.on("end", resolve));

    const pdfBuffer = bufferStream.getContents();

    const fileName = `order_${Date.now()}.pdf`;

    await supabase.storage
      .from("orders")
      .upload(fileName, pdfBuffer, {
        contentType: "application/pdf",
      });

    const { data: urlData } = supabase
      .storage
      .from("orders")
      .getPublicUrl(fileName);

    const pdf_url = urlData.publicUrl;

    // Insert order record
    await supabase.from("orders").insert([
      {
        from_email,
        from_name,
        pdf_path: fileName,
        pdf_url,
        items,
        grand_total,
      },
    ]);

    // Update outstanding amount
    await supabase.rpc("increment_outstanding", {
      email_input: from_email,
      amount: grand_total,
    });

    return res.json({ ok: true });
  } catch (err) {
    console.error("ORDER ERROR:", err);
    return res.status(500).json({ error: err.message || String(err) });
  }
}
