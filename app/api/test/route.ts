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
    to: ["zobayerhossain.official26@gmail.com"],
    subject: `Product Purchased: ${product.title}`,
    html: `<div><p>${product.title} purchased.
    
    </p></div>`,
  });


  return new Response("OK", { status: 200 });
}

// import crypto from "crypto";
// import nodemailer from "nodemailer";

// const transporter = nodemailer.createTransport({
//   service: "gmail",
//   auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_PASS,
//   },
// });

// function verifyShopifyWebhook(rawBody:any, hmacHeader:any) {
//   if (!hmacHeader) return false;

//   const generated = crypto
//     .createHmac("sha256", process.env.SHOPIFY_WEBHOOK_SECRET as any)
//     .update(rawBody, "utf8")
//     .digest("base64");

//   return crypto.timingSafeEqual(
//     Buffer.from(generated),
//     Buffer.from(hmacHeader)
//   );
// }

// export async function POST(req:Request) {
//   console.log("🔥 Webhook hit");

//   const rawBody = await req.text();
//   const hmacHeader = req.headers.get("x-shopify-hmac-sha256");

//   if (!verifyShopifyWebhook(rawBody, hmacHeader)) {
//     console.error("❌ Invalid signature");
//     return new Response("Invalid signature", { status: 401 });
//   }

//   const product = JSON.parse(rawBody);

//   // 🚀 Respond immediately to Shopify
//   const response = new Response("OK", { status: 200 });

//   // 📧 Send email in background (testing only)
//   transporter.sendMail({
//     from: `"Shopify Test" <${process.env.EMAIL_USER}>`,
//     to: "zobayerarif126@gmail.com",
//     subject: `Product Updated: ${product.title}`,
//     text: `Product "${product.title}" was updated.`,
//   }).catch(console.error);

//   return response;
// }

// import crypto from "crypto";

// export async function POST(req: Request) {
//   const rawBody = await req.text();

//   const hmacHeader = req.headers.get("x-shopify-hmac-sha256");
//   const isDev =
//     process.env.NODE_ENV !== "production" ||
//     !hmacHeader; // Postman won't have this

//   if (!isDev) {
//     const generated = crypto
//       .createHmac("sha256", process.env.SHOPIFY_WEBHOOK_SECRET!)
//       .update(rawBody, "utf8")
//       .digest("base64");

//     if (generated !== hmacHeader) {
//       return new Response("Invalid signature", { status: 401 });
//     }
//   } else {
//     console.log("✅ HMAC skipped (local / Postman)");
//   }

//   // Parse AFTER HMAC check
//   const data = JSON.parse(rawBody);

//   console.log("Webhook received:", data.id);

//   return new Response("OK", { status: 200 });
// }
