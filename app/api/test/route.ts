import crypto from "crypto";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

function verifyShopifyWebhook(rawBody: string, hmacHeader: string | null) {
  if (!hmacHeader) return false;

  const generated = crypto
    .createHmac("sha256", process.env.SHOPIFY_WEBHOOK_SECRET as any)
    .update(rawBody, "utf8")
    .digest("base64");

  return crypto.timingSafeEqual(
    Buffer.from(generated),
    Buffer.from(hmacHeader)
  );
}

export async function POST(req: Request) {
  console.log("🔥 Webhook hit");

  const rawBody = await req.text();
  const hmacHeader = req.headers.get("x-shopify-hmac-sha256");
  const topic = req.headers.get("x-shopify-topic");

  console.log("📌 Topic:", topic);

  if (!verifyShopifyWebhook(rawBody, hmacHeader)) {
    console.error("❌ Invalid signature");
    return new Response("Invalid signature", { status: 401 });
  }

  const product = JSON.parse(rawBody);

  const from = process.env.FROM_EMAIL;
  if (!from) {
    throw new Error("FROM_EMAIL is not defined");
  }

  await resend.emails.send({
    from,
    to: ["your@email.com"],
    subject: `Product Updated: ${product.title}`,
    html: `<p>${product.title} updated</p>`,
  });


  return new Response("OK", { status: 200 });
}
