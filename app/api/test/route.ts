import crypto from "crypto";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY!);

// ✅ Verify Shopify webhook signature
function verifyShopifyWebhook(rawBody: string, hmacHeader?: string | null) {
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
  const rawBody = await req.text();
  const hmacHeader = req.headers.get("x-shopify-hmac-sha256");
  const topic = req.headers.get("x-shopify-topic");

  // ✅ Only handle product update events
  if (topic !== "products/update") {
    return new Response("Ignored", { status: 200 });
  }

  // ✅ Verify signature
  if (!verifyShopifyWebhook(rawBody, hmacHeader)) {
    return new Response("Invalid signature", { status: 401 });
  }

  const product = JSON.parse(rawBody);

  const title = product.title;
  const productId = product.id;
  const updatedAt = product.updated_at;

  try {
    await resend.emails.send({
      from: process.env.FROM_EMAIL!,
      to: "zobayerarif126@gmail.com", // ✅ hard-coded email for testing
      subject: `Product Updated: ${title}`,
      html: `
        <h2>Product Updated</h2>
        <p><strong>ID:</strong> ${productId}</p>
        <p><strong>Title:</strong> ${title}</p>
        <p><strong>Updated At:</strong> ${updatedAt}</p>
      `,
    });
  } catch (error) {
    console.error("Email error:", error);
    return new Response("Email failed", { status: 500 });
  }

  return new Response("Product update webhook processed", { status: 200 });
}
