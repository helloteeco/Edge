import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";
import Stripe from "stripe";

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2023-10-16",
});

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

// Credit amounts for each product
const PRODUCT_CREDITS: Record<string, number> = {
  // Current active products (Feb 3, 2026)
  "prod_TufSWvaZZDzaXk": 5,    // 5 Analysis Credits - Starter Pack ($4.99)
  "prod_TufY8I7l7RceCQ": 25,   // 25 Analysis Credits - Pro Pack ($19.99)
  "prod_TueedpsdbnL8qL": 100,  // 100 Analysis Credits - Power Pack ($69.99)
  
  // Legacy products (keep for existing purchases)
  "prod_TuHyUGcl0kVMMT": 5,    // Old 5 Credits Pack
  "prod_TuHyWbVIQO6qfC": 25,   // Old 25 Credits Pack
  "prod_TuHy40OPqZCfrL": 999,  // Unlimited Monthly
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
      
      // IDEMPOTENCY CHECK: Prevent duplicate processing of the same session
      const { data: existingPurchase } = await supabase
        .from("credit_purchases")
        .select("id")
        .eq("stripe_session_id", session.id)
        .single();
      
      if (existingPurchase) {
        console.log(`[Stripe Webhook] Duplicate event ignored - session ${session.id} already processed`);
        return NextResponse.json({ success: true, message: "Already processed" });
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
        if (amountTotal === 499) creditsToAdd = 5;           // $4.99 = 5 credits
        else if (amountTotal === 1999) creditsToAdd = 25;    // $19.99 = 25 credits
        else if (amountTotal === 6999) creditsToAdd = 100;   // $69.99 = 100 credits
        else if (amountTotal === 2999) {
          creditsToAdd = 999;                                 // $29.99 = Unlimited
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
      
      // Log the purchase in both tables
      await supabase
        .from("credit_purchases")
        .insert({
          user_email: customerEmail,
          credits_added: creditsToAdd,
          amount_paid: session.amount_total,
          stripe_session_id: session.id,
          purchased_at: new Date().toISOString()
        });
      
      // Also log in unified audit trail
      await supabase.from("credit_transactions").insert({
        user_email: customerEmail,
        action: 'add',
        amount: creditsToAdd,
        credits_before: userData ? ((userData.credits_limit || 3) - (userData.credits_used || 0)) : 3,
        credits_after: userData ? (((userData.credits_limit || 3) + creditsToAdd) - (userData.credits_used || 0)) : 3 + creditsToAdd,
        reason: `Stripe purchase: ${session.id} ($${((session.amount_total || 0) / 100).toFixed(2)})`,
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
    
    // Handle Stripe refunds — claw back credits
    if (event.type === "charge.refunded") {
      const charge = event.data.object as Stripe.Charge;
      
      // Get customer email from the charge
      let customerEmail: string | null = charge.receipt_email || null;
      if (!customerEmail && typeof charge.customer === "string") {
        try {
          const customer = await stripe.customers.retrieve(charge.customer);
          if (!("deleted" in customer)) {
            customerEmail = customer.email;
          }
        } catch (e) {
          console.error("[Stripe Webhook] Error fetching customer for refund:", e);
        }
      }
      
      if (customerEmail) {
        // Determine how many credits to claw back based on refund amount
        const refundedAmount = charge.amount_refunded; // in cents
        let creditsToRemove = 0;
        
        if (refundedAmount >= 6999) creditsToRemove = 100;       // Power Pack
        else if (refundedAmount >= 1999) creditsToRemove = 25;   // Pro Pack
        else if (refundedAmount >= 499) creditsToRemove = 5;     // Starter Pack
        
        if (creditsToRemove > 0) {
          const { data: userData } = await supabase
            .from("users")
            .select("credits_used, credits_limit")
            .eq("email", customerEmail)
            .single();
          
          if (userData) {
            const currentLimit = userData.credits_limit || 3;
            // Don't go below base 3 credits
            const newLimit = Math.max(3, currentLimit - creditsToRemove);
            const creditsBefore = currentLimit - (userData.credits_used || 0);
            const creditsAfter = newLimit - (userData.credits_used || 0);
            
            await supabase
              .from("users")
              .update({ credits_limit: newLimit })
              .eq("email", customerEmail);
            
            await supabase.from("credit_transactions").insert({
              user_email: customerEmail,
              action: 'deduct' as const,
              amount: creditsToRemove,
              credits_before: Math.max(0, creditsBefore),
              credits_after: Math.max(0, creditsAfter),
              reason: `Stripe refund clawback: ${charge.id} (-${creditsToRemove} credits, $${(refundedAmount / 100).toFixed(2)} refunded)`,
            });
            
            console.log(`[Stripe Webhook] Refund clawback: removed ${creditsToRemove} credits from ${customerEmail}. New limit: ${newLimit}`);
          }
        }
      }
      
      return NextResponse.json({ success: true, event: "charge.refunded" });
    }
    
    // Handle chargebacks/disputes — claw back credits immediately
    if (event.type === "charge.dispute.created") {
      const dispute = event.data.object as Stripe.Dispute;
      const charge = typeof dispute.charge === "string"
        ? await stripe.charges.retrieve(dispute.charge)
        : dispute.charge as Stripe.Charge;
      
      let customerEmail: string | null = charge?.receipt_email || null;
      if (!customerEmail && charge && typeof charge.customer === "string") {
        try {
          const customer = await stripe.customers.retrieve(charge.customer);
          if (!("deleted" in customer)) {
            customerEmail = customer.email;
          }
        } catch (e) {
          console.error("[Stripe Webhook] Error fetching customer for dispute:", e);
        }
      }
      
      if (customerEmail) {
        // On dispute, remove ALL purchased credits (reset to base 3)
        const { data: userData } = await supabase
          .from("users")
          .select("credits_used, credits_limit, is_unlimited")
          .eq("email", customerEmail)
          .single();
        
        if (userData) {
          const creditsBefore = (userData.credits_limit || 3) - (userData.credits_used || 0);
          
          await supabase
            .from("users")
            .update({ credits_limit: 3, is_unlimited: false })
            .eq("email", customerEmail);
          
          const creditsAfter = Math.max(0, 3 - (userData.credits_used || 0));
          
          await supabase.from("credit_transactions").insert({
            user_email: customerEmail,
            action: 'deduct' as const,
            amount: (userData.credits_limit || 3) - 3,
            credits_before: Math.max(0, creditsBefore),
            credits_after: Math.max(0, creditsAfter),
            reason: `Stripe dispute/chargeback: ${dispute.id} — all purchased credits revoked`,
          });
          
          console.log(`[Stripe Webhook] Dispute clawback: reset ${customerEmail} to base 3 credits (was ${userData.credits_limit})`);
        }
      }
      
      return NextResponse.json({ success: true, event: "charge.dispute.created" });
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
        // Get current user data to preserve purchased credits
        const { data: userData } = await supabase
          .from("users")
          .select("credits_used, credits_limit")
          .eq("email", customerEmail)
          .single();
        
        // When cancelling unlimited subscription, revert to base 3 credits
        // but preserve any separately purchased credit packs
        // (Unlimited sets credits_limit to 999, so we can't preserve that)
        // The fairest approach: set to base 3 + any unused credits_used headroom
        // In practice, unlimited users have 999 limit, so just reset to 3
        const newLimit = 3;
        
        console.log(`[Stripe Webhook] Subscription cancelled for ${customerEmail}. Reverting to ${newLimit} credits.`);
        
        await supabase
          .from("users")
          .update({
            credits_limit: newLimit,
            is_unlimited: false
          })
          .eq("email", customerEmail);
        
        // Log the cancellation
        await supabase.from("credit_transactions").insert({
          user_email: customerEmail,
          action: 'add',
          amount: 0,
          credits_before: userData?.credits_limit ?? 999,
          credits_after: newLimit,
          reason: 'Subscription cancelled - reverted to base credits',
        });
      }
    }
    
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("[Stripe Webhook] Error:", error);
    return NextResponse.json({ error: "Webhook error" }, { status: 500 });
  }
}

