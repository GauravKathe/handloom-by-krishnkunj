import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

// Security: Restrict CORS to specific origins
const getAllowedOrigin = (origin: string | null): string => {
  const allowedOrigins = [
    Deno.env.get('SITE_URL') || '',
    'https://lovable.dev',
    'https://lqhvsafeatkgaxxvyeje.supabase.co'
  ].filter(Boolean);
  
  if (origin && allowedOrigins.some(allowed => origin.startsWith(allowed))) {
    return origin;
  }
  return allowedOrigins[0] || '*';
};

const getCorsHeaders = (origin: string | null) => ({
  'Access-Control-Allow-Origin': getAllowedOrigin(origin),
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
});

interface OrderConfirmationRequest {
  email: string;
  name: string;
  orderId: string;
  totalAmount: number;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
  }>;
  shippingAddress: {
    houseNo?: string;
    street?: string;
    landmark?: string;
    city?: string;
    state?: string;
    pincode?: string;
  };
}

// Sanitize HTML to prevent XSS in email
const escapeHtml = (text: string): string => {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

serve(async (req) => {
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Only allow POST method
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Verify user authentication
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.error('User authentication failed');
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { email, name, orderId, totalAmount, items, shippingAddress }: OrderConfirmationRequest = await req.json();

    // Validate email
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return new Response(
        JSON.stringify({ error: "Invalid email" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sanitize all user inputs
    const safeName = escapeHtml(name || 'Customer');
    const safeOrderId = escapeHtml(orderId?.slice(0, 8) || '');
    
    const itemsHtml = (items || []).map(item => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${escapeHtml(item.name)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${Number(item.quantity) || 0}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">₹${Number(item.price).toLocaleString()}</td>
      </tr>
    `).join('');

    const safeAddress = shippingAddress || {};

    const emailResponse = await resend.emails.send({
      from: "HandloomByKrishnKunj <onboarding@resend.dev>",
      to: [email],
      subject: `Order Confirmation - ${safeOrderId}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #F4D9B5 0%, #E8C4A0 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
            <h1 style="color: #8B4513; margin: 0;">Order Confirmed!</h1>
          </div>
          
          <div style="background: #fff; padding: 30px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px;">Dear ${safeName},</p>
            
            <p>Thank you for your order! We're excited to prepare your handcrafted saree(s) for delivery.</p>
            
            <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h2 style="color: #8B4513; margin-top: 0;">Order Details</h2>
              <p><strong>Order ID:</strong> ${safeOrderId}</p>
              <p><strong>Total Amount:</strong> ₹${Number(totalAmount).toLocaleString()}</p>
            </div>

            <h3 style="color: #8B4513;">Items Ordered:</h3>
            <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
              <thead>
                <tr style="background: #f4f4f4;">
                  <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Item</th>
                  <th style="padding: 10px; text-align: center; border-bottom: 2px solid #ddd;">Quantity</th>
                  <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd;">Price</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
              <tfoot>
                <tr>
                  <td colspan="2" style="padding: 10px; text-align: right; font-weight: bold; border-top: 2px solid #ddd;">Total:</td>
                  <td style="padding: 10px; text-align: right; font-weight: bold; border-top: 2px solid #ddd;">₹${Number(totalAmount).toLocaleString()}</td>
                </tr>
              </tfoot>
            </table>

            <h3 style="color: #8B4513;">Shipping Address:</h3>
            <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 5px 0;">${escapeHtml(safeAddress.houseNo || '')}, ${escapeHtml(safeAddress.street || '')}</p>
              ${safeAddress.landmark ? `<p style="margin: 5px 0;">Near ${escapeHtml(safeAddress.landmark)}</p>` : ''}
              <p style="margin: 5px 0;">${escapeHtml(safeAddress.city || '')}, ${escapeHtml(safeAddress.state || '')} - ${escapeHtml(safeAddress.pincode || '')}</p>
            </div>

            <div style="background: #FFF9E6; border-left: 4px solid #F4D9B5; padding: 15px; margin: 20px 0;">
              <p style="margin: 0;"><strong>What's Next?</strong></p>
              <p style="margin: 10px 0 0 0;">We'll send you a shipping notification with tracking details once your order is dispatched.</p>
            </div>

            <p style="margin-top: 30px;">If you have any questions, feel free to reply to this email.</p>
            
            <p style="margin-top: 30px;">
              With love and tradition,<br>
              <strong>HandloomByKrishnKunj Team</strong>
            </p>
          </div>

          <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
            <p>This is an automated email. Please do not reply directly to this message.</p>
          </div>
        </body>
        </html>
      `,
    });

    console.log("Order confirmation email sent for order:", safeOrderId);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error sending order confirmation:", error instanceof Error ? error.message : 'Unknown error');
    return new Response(
      JSON.stringify({ error: "Failed to send email" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
