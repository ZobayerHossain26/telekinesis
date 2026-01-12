import crypto from "crypto";
import sgMail from "@sendgrid/mail";

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

function verifyShopifyWebhook(rawBody: string, hmacHeader: string | null) {
  if (!hmacHeader) return false;

  const generated = crypto
    .createHmac("sha256", process.env.SHOPIFY_WEBHOOK_SECRET!)
    .update(rawBody, "utf8")
    .digest("base64");

  return crypto.timingSafeEqual(
    Buffer.from(generated),
    Buffer.from(hmacHeader)
  );
}

export async function POST(req: Request) {
  console.log("🔥 Shopify Webhook Hit");

  const rawBody = await req.text();
  const hmacHeader = req.headers.get("x-shopify-hmac-sha256");
  const topic = req.headers.get("x-shopify-topic");

  if (!verifyShopifyWebhook(rawBody, hmacHeader)) {
    console.error("❌ Invalid signature");
    return new Response("Invalid signature", { status: 401 });
  }

  const data = JSON.parse(rawBody);

  /**
   * ✅ Get customer email safely
   */
  const customerEmail =
    data.email ||
    data.customer?.email ||
    process.env.TO_EMAIL; // fallback (admin)

  if (!customerEmail) {
    console.warn("⚠️ No customer email found");
    return new Response("No email", { status: 200 });
  }

  const msg = {
    to: customerEmail,
    from: process.env.FROM_SENDER_EMAIL!,
    subject: "Thanks for your order!",
    html: `
      <h2>Thank you for your order 🎉</h2>
      <p><strong>Order:</strong> ${data.name ?? "N/A"}</p>
      <p><strong>Total:</strong> ${data.total_price ?? "N/A"} ${data.currency ?? ""}</p>
      <p>We’re processing your order and will update you soon.</p>
    `,
  };

  try {
    await sgMail.send(msg);
    console.log("📧 Email sent to customer:", customerEmail);
  } catch (error: any) {
    console.error("❌ SendGrid error:", error.response?.body || error);
  }

  return new Response("OK", { status: 200 });
}
