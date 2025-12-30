import crypto from "crypto";
import nodemailer from "nodemailer";

/**
 * ⚠️ TESTING ONLY
 * Nodemailer + Gmail is NOT recommended for production on Vercel.
 */

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS, // Gmail App Password
  },
});

/**
 * Verify Shopify Webhook Signature
 */
function verifyShopifyWebhook(
  rawBody: string,
  hmacHeader?: string | null
): boolean {
  if (!hmacHeader) return false;

  const generated = crypto
    .createHmac("sha256", process.env.SHOPIFY_WEBHOOK_SECRET!)
    .update(rawBody, "utf8")
    .digest("base64");

  const generatedBuffer = Buffer.from(generated, "utf8");
  const receivedBuffer = Buffer.from(hmacHeader, "utf8");

  // Prevent timingSafeEqual crash
  if (generatedBuffer.length !== receivedBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(generatedBuffer, receivedBuffer);
}

export async function POST(req: Request) {
  console.log("🔥 Shopify webhook hit");

  try {
    // 1️⃣ Read raw body
    const rawBody = await req.text();

    // 2️⃣ Get Shopify HMAC header
    const hmacHeader = req.headers.get("x-shopify-hmac-sha256");

    // 3️⃣ Verify webhook
    if (!verifyShopifyWebhook(rawBody, hmacHeader)) {
      console.error("❌ Invalid Shopify signature");
      return new Response("Invalid signature", { status: 401 });
    }

    // 4️⃣ Parse payload
    const payload = JSON.parse(rawBody);

    console.log("✅ Webhook verified");
    console.log("📦 Payload:", payload);

    // 5️⃣ Respond immediately to Shopify
    const response = new Response("OK", { status: 200 });

    // 6️⃣ Send test email (background – NOT guaranteed on Vercel)
    transporter
      .sendMail({
        from: `"Shopify Webhook Test" <${process.env.EMAIL_USER}>`,
        to: process.env.TEST_RECEIVER_EMAIL, // your email
        subject: "Shopify Webhook Received",
        text: `
Webhook received successfully!

Topic: ${req.headers.get("x-shopify-topic")}
Shop: ${req.headers.get("x-shopify-shop-domain")}

Payload:
${JSON.stringify(payload, null, 2)}
        `,
      })
      .then(() => console.log("📧 Test email sent"))
      .catch((err) => console.error("❌ Email error:", err));

    return response;
  } catch (error) {
    console.error("🔥 Webhook error:", error);
    return new Response("Server error", { status: 500 });
  }
}
