import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import Stripe from "stripe";

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-12-18.acacia",
});

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

// Credit amounts for each product
const PRODUCT_CREDITS: Record<string, number> = {
  "prod_TuHyUGcl0kVMMT": 5,   // 5 Credits Pack
  "prod_TuHyWbVIQO6qfC": 25,  // 25 Credits Pack
  "prod_TuHy40OPqZCfrL": 999, // Unlimited Monthly (set high number)
};

export async function POST(request: NextRequest) {
  try {
    // Get the raw body for signature verification
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    // SECURITY: Verify webhook signature
    if (!WEBHOOK_SECRET) {
      console.error("[Stripe Webhook] STRIPE_WEBHOOK_SECRET not configured");
      return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
    }

    if (!signature) {
      console.error("[Stripe Webhook] No signature provided");
      return NextResponse.json({ error: "No signature" }, { status: 401 });
    }

    let event: Stripe.Event;
    
    try {
      event = stripe.webhooks.constructEvent(body, signature, WEBHOOK_SECRET);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Unknown error";
      console.error(`[Stripe Webhook] Signature verification failed: ${errorMessage}`);
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    console.log(`[Stripe Webhook] Verified event: ${event.type}`);

    // Handle checkout.session.completed event
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const customerEmail = session.customer_details?.email;
      
      if (!customerEmail) {
        console.error("[Stripe Webhook] No customer email found in session");
        return NextResponse.json({ error: "No customer email" }, { status: 400 });
      }
      
      // Get line items from Stripe API (more reliable than webhook payload)
      let creditsToAdd = 0;
      let isUnlimited = false;
      
      try {
        const lineItems = await stripe.checkout.sessions.listLineItems(session.id);
        
        for (const item of lineItems.data) {
          const productId = typeof item.price?.product === "string" 
            ? item.price.product 
            : item.price?.product?.id;
          
          if (productId && PRODUCT_CREDITS[productId]) {
            creditsToAdd += PRODUCT_CREDITS[productId] * (item.quantity || 1);
            if (PRODUCT_CREDITS[productId] === 999) {
              isUnlimited = true;
            }
          }
        }
      } catch (lineItemError) {
        console.error("[Stripe Webhook] Error fetching line items:", lineItemError);
      }
      
      // Fallback: determine from amount if line items failed
      if (creditsToAdd === 0) {
        const amountTotal = session.amount_total;
        if (amountTotal === 499) creditsToAdd = 5;
        else if (amountTotal === 1999) creditsToAdd = 25;
        else if (amountTotal === 2999) {
          creditsToAdd = 999;
          isUnlimited = true;
        }
      }
      
      if (creditsToAdd === 0) {
        console.error("[Stripe Webhook] Could not determine credits to add");
        return NextResponse.json({ error: "Unknown product" }, { status: 400 });
      }
      
      console.log(`[Stripe Webhook] Adding ${creditsToAdd} credits for ${customerEmail}`);
      
      // Get current user by email
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("email, credits_used, credits_limit, is_unlimited")
        .eq("email", customerEmail)
        .single();
      
      if (userError && userError.code !== "PGRST116") {
        console.error("[Stripe Webhook] Error fetching user:", userError);
        return NextResponse.json({ error: "Database error" }, { status: 500 });
      }
      
      if (userData) {
        // Update existing user - increase credits_limit
        const newLimit = (userData.credits_limit || 3) + creditsToAdd;
        
        const { error: updateError } = await supabase
          .from("users")
          .update({ 
            credits_limit: newLimit,
            is_unlimited: isUnlimited || userData.is_unlimited
          })
          .eq("email", customerEmail);
        
        if (updateError) {
          console.error("[Stripe Webhook] Error updating credits:", updateError);
          return NextResponse.json({ error: "Failed to update credits" }, { status: 500 });
        }
        
        const creditsRemaining = newLimit - (userData.credits_used || 0);
        console.log(`[Stripe Webhook] Updated ${customerEmail}: ${creditsRemaining} credits remaining (limit: ${newLimit})`);
      } else {
        // Create new user with purchased credits + 3 free
        const newLimit = 3 + creditsToAdd;
        const { error: insertError } = await supabase
          .from("users")
          .insert({
            email: customerEmail,
            credits_used: 0,
            credits_limit: newLimit,
            is_unlimited: isUnlimited
          });
        
        if (insertError) {
          console.error("[Stripe Webhook] Error creating user:", insertError);
          return NextResponse.json({ error: "Failed to create user" }, { status: 500 });
        }
        
        console.log(`[Stripe Webhook] Created ${customerEmail} with ${newLimit} credits`);
      }
      
      // Log the purchase
      await supabase
        .from("credit_purchases")
        .insert({
          user_email: customerEmail,
          credits_added: creditsToAdd,
          amount_paid: session.amount_total,
          stripe_session_id: session.id,
          purchased_at: new Date().toISOString()
        });
      
      return NextResponse.json({ success: true, credits_added: creditsToAdd });
    }
    
    // Handle subscription events
    if (event.type === "customer.subscription.created" || event.type === "customer.subscription.updated") {
      const subscription = event.data.object as Stripe.Subscription;
      
      // Get customer email from Stripe
      let customerEmail: string | null = null;
      if (typeof subscription.customer === "string") {
        const customer = await stripe.customers.retrieve(subscription.customer);
        if (!("deleted" in customer)) {
          customerEmail = customer.email;
        }
      }
      
      if (customerEmail && subscription.status === "active") {
        const { data: existingUser } = await supabase
          .from("users")
          .select("email")
          .eq("email", customerEmail)
          .single();
        
        if (existingUser) {
          await supabase
            .from("users")
            .update({
              credits_limit: 999,
              is_unlimited: true
            })
            .eq("email", customerEmail);
        } else {
          await supabase
            .from("users")
            .insert({
              email: customerEmail,
              credits_used: 0,
              credits_limit: 999,
              is_unlimited: true
            });
        }
      }
    }
    
    // Handle subscription cancellation
    if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object as Stripe.Subscription;
      
      let customerEmail: string | null = null;
      if (typeof subscription.customer === "string") {
        const customer = await stripe.customers.retrieve(subscription.customer);
        if (!("deleted" in customer)) {
          customerEmail = customer.email;
        }
      }
      
      if (customerEmail) {
        await supabase
          .from("users")
          .update({
            credits_limit: 3,
            is_unlimited: false
          })
          .eq("email", customerEmail);
      }
    }
    
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[Stripe Webhook] Error:", error);
    return NextResponse.json({ error: "Webhook error" }, { status: 500 });
  }
}

// Disable body parsing for webhook signature verification
export const config = {
  api: {
    bodyParser: false,
  },
};
