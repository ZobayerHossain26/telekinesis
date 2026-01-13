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
  console.log("Shopify Webhook Hit");

  const rawBody = await req.text();
  const hmacHeader = req.headers.get("x-shopify-hmac-sha256");
  const topic = req.headers.get("x-shopify-topic");

  if (!verifyShopifyWebhook(rawBody, hmacHeader)) {
    console.error(" Invalid signature");
    return new Response("Invalid signature", { status: 401 });
  }

  const data = JSON.parse(rawBody);

  const customerEmail =
    data.email || data.customer?.email || process.env.TO_EMAIL;

  if (!customerEmail) {
    console.warn(" No customer email found");
    return new Response("No email", { status: 200 });
  }

  const msg = {
    to: customerEmail,
    from: process.env.FROM_SENDER_EMAIL!,
    subject: "Thanks for your order!",
    html: `
    <style>
            .license-box {
                background: #667eea;
                border-radius: 8px;
                padding: 30px;
                margin: 25px 0;
                text-align: center;
            }
            .license-label {
                color: #ffffff;
                font-size: 14px;
                margin: 0 0 10px 0;
                opacity: 0.9;
            }
            .license-key {
                font-family: 'Courier New', monospace;
                font-size: 22px;
                font-weight: bold;
                color: #ffffff;
                letter-spacing: 2px;
                margin: 15px 0;
                word-break: break-all;
                background: rgba(255,255,255,0.1);
                padding: 15px;
                border-radius: 5px;
            }
            .order-id {
                color: #ffffff;
                font-size: 12px;
                margin: 10px 0 0 0;
                opacity: 0.8;
            }
            .instructions {
                background: #e3f2fd;
                border-left: 4px solid #2196F3;
                padding: 20px;
                margin: 25px 0;
                border-radius: 4px;
            }
            .instructions h3 {
                margin-top: 0;
                color: #1976D2;
            }
            .instructions ol {
                margin: 10px 0;
                padding-left: 20px;
            }
            .instructions li {
                margin: 8px 0;
            }
           
            .warning {
                background: #fff3cd;
                border-left: 4px solid #ffc107;
                padding: 15px 20px;
                margin: 25px 0;
                border-radius: 4px;
            }
            .warning-title {
                font-weight: bold;
                color: #856404;
            }
            .warning ul {
                margin: 10px 0;
                padding-left: 20px;
            }
        </style>

 <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif;
                line-height: 1.6;
                color: #333;
                max-width: 600px;
                margin: 0 auto;
                padding: 20px;
                background-color: #f5f5f5;">
        <div style="background: #ffffff;
                border: 1px solid #e0e0e0;
                border-radius: 8px;
                padding: 40px;
                margin: 20px 0;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <div style="text-align: center;
                padding-bottom: 30px;
                border-bottom: 2px solid #f0f0f0;">
                <h1 style="color: #2c3e50;
                margin: 0;
                font-size: 28px;"> Thank You For Your Purchase!</h1>
            </div>
            
            <div style="padding:30px 0;">
                <p>Hello There,</p>
                
                <p>Thank you for purchasing our software! Your license key has been generated and is ready to use.</p>
                
                <div class="license-box">
                    <p class="license-label">YOUR LICENSE KEY</p>
                    <div class="license-key">{formatted_key}</div>
                    <p class="order-id">Order #{order_id}</p>
                </div>
                
                <div class="instructions">
                    <h3> Activation Instructions</h3>
                    <ol>
                        <li>Download and install the software from our website</li>
                        <li>Launch the application</li>
                        <li>When prompted, enter your license key exactly as shown above</li>
                        <li>Click "Activate" to unlock all features</li>
                    </ol>
                </div>
                
                <div class="warning">
                    <p class="warning-title">Important Information:</p>
                    <ul>
                        <li>This license allows activation on <strong>1 device</strong></li>
                        <li>Keep this email safe - you'll need it if you reinstall</li>
                        <li>Do not share your license key with others</li>
                        <li>The key is case-sensitive - copy it exactly as shown</li>
                    </ul>
                </div>
                
                <p><strong>Need Help?</strong></p>
                <p>If you have any questions or issues with activation, please reply to this email or contact our support team at ${process.env.FROM_SENDER_EMAIL}</p>
                
                <p>Best regards,<br><strong>${process.env.FROM_SENDER_EMAIL} Team</strong></p>
            </div>
            
            <div style="text-align: center
                padding-top: 30px;
                border-top: 2px solid #f0f0f0;
                color: #666;
                font-size: 14px;">
                <p>This email was sent to ${customerEmail} </p>
                <p>© 2026 ${process.env.FROM_SENDER_EMAIL} . All rights reserved.</p>
            </div>
        </div>

 </div>
    `,
  };

  try {
    await sgMail.send(msg);
    console.log(" Email sent to customer:", customerEmail);
  } catch (error: any) {
    console.error(" SendGrid error:", error.response?.body || error);
  }

  return new Response("OK", { status: 200 });
}
