import crypto from "crypto";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);

function verifyShopifyWebhook(rawBody: string, hmacHeader?: string | null) {
  if (!hmacHeader) return false;

  const generated = crypto
    .createHmac("sha256", process.env.SHOPIFY_WEBHOOK_SECRET!)
    .update(rawBody, "utf8")
    .digest("base64");

  const generatedBuffer = Buffer.from(generated, "utf8");
  const receivedBuffer = Buffer.from(hmacHeader, "utf8");

  if (generatedBuffer.length !== receivedBuffer.length) return false;

  return crypto.timingSafeEqual(generatedBuffer, receivedBuffer);
}

function generateLicenseKey() {
  return crypto.randomBytes(16).toString("hex").toUpperCase();
}

export async function POST(req: Request) {
  const rawBody = await req.text();
  const hmacHeader = req.headers.get("x-shopify-hmac-sha256");

  if (!verifyShopifyWebhook(rawBody, hmacHeader)) {
    return new Response("Invalid signature", { status: 401 });
  }

  const payload = JSON.parse(rawBody);

  const customerEmail = payload.email;
  const orderId = payload.id;

  for (const item of payload.line_items || []) {
    const productName = item.title;
    const sku = item.sku;

    const licenseKey = generateLicenseKey();
    const downloadUrl = `${process.env.DOWNLOAD_BASE_URL}?sku=${sku}&order=${orderId}`;

    await resend.emails.send({
      from: process.env.FROM_EMAIL!,
      to: "zobayerarif126@gmail.com",
      subject: `Your ${productName} download & license key`,
      html: `
        <h2>Thanks for your purchase 🎉</h2>
        <p><strong>License Key:</strong></p>
        <pre>${licenseKey}</pre>
        <p><a href="${downloadUrl}">Download your software</a></p>
      `
    });
  }

  return new Response("Webhook processed", { status: 200 });
}
