import crypto from "crypto";

export async function POST(req: Request) {
  const SHOPIFY_WEBHOOK_SECRET = process.env.SHOPIFY_WEBHOOK_SECRET;

  // 1️⃣ Get raw body
  const rawBody = await req.text();

  // 2️⃣ Get Shopify HMAC header
  const shopifyHmac = req.headers.get("x-shopify-hmac-sha256");

  // 3️⃣ Generate HMAC
  const generatedHmac = crypto
    .createHmac("sha256", SHOPIFY_WEBHOOK_SECRET as string)
    .update(rawBody, "utf8")
    .digest("base64");

  // 4️⃣ Compare HMACs
  if (!crypto.timingSafeEqual(
    Buffer.from(generatedHmac),
    Buffer.from(shopifyHmac || "")
  )) {
    return new Response("Invalid webhook signature", { status: 401 });
  }

  // 5️⃣ Parse JSON payload
  const payload = JSON.parse(rawBody);

  // ---- Example usage ----
  const customerEmail = payload.email;
  const orderId = payload.id;

  payload.line_items.forEach((item:any) => {
    const sku = item.sku;
    const title = item.title;

    console.log(
      `Order ${orderId} | ${customerEmail} | ${title} | ${sku}`
    );

    // 👉 Client logic here:
    // - Generate product key
    // - Send download link + key via email
  });

  // Shopify requires 200 OK
  return new Response("Webhook received", { status: 200 });
}
