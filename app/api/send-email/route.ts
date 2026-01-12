import crypto from "crypto";
import sgMail from "@sendgrid/mail";

sgMail.setApiKey(process.env.SENDGRID_API_KEY!);

/**
 * Verify Shopify Webhook Signature
 */
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

  console.log("📌 Topic:", topic);

  if (!verifyShopifyWebhook(rawBody, hmacHeader)) {
    console.error("❌ Invalid signature");
    return new Response("Invalid signature", { status: 401 });
  }

  const data = JSON.parse(rawBody);

  const msg = {
    to: process.env.TO_EMAIL!,
    from: process.env.FROM_SENDER_EMAIL!,
    subject: `Shopify Event: ${topic}`,
    html: `
      <h3>Shopify Webhook Received</h3>
      <p><strong>Topic:</strong> ${topic}</p>
      <p><strong>Title:</strong> ${data.title ?? "N/A"}</p>
    `,
  };

  try {
    await sgMail.send(msg);
    console.log("📧 Email sent via SendGrid");
  } catch (error: any) {
    console.error("❌ SendGrid error:", error.response?.body || error);
  }

  return new Response("OK", { status: 200 });
}
