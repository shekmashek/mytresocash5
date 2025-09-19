import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@11.1.0?target=deno'

const stripe = Stripe(Deno.env.get('STRIPE_SECRET_KEY'))
const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SIGNING_SECRET')

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL'),
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
)

serve(async (req) => {
  const signature = req.headers.get('stripe-signature')
  const body = await req.text()

  let event
  try {
    event = await stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (err) {
    console.error(`Webhook signature verification failed: ${err.message}`)
    return new Response(err.message, { status: 400 })
  }

  try {
    const session = event.data.object
    const customerId = session.customer
    
    switch (event.type) {
      case 'checkout.session.completed': {
        if (session.mode === 'subscription') {
          const subscriptionId = session.subscription
          const subscription = await stripe.subscriptions.retrieve(subscriptionId)
          
          await supabaseAdmin
            .from('profiles')
            .update({
              subscription_id: subscription.id,
              subscription_status: subscription.status,
              plan_id: subscription.items.data[0].price.id,
            })
            .eq('stripe_customer_id', customerId)
        } else if (session.mode === 'payment') {
          // Handle one-time payment (Lifetime access)
          const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 1 });
          if (lineItems.data.length > 0) {
            await supabaseAdmin
              .from('profiles')
              .update({
                subscription_status: 'lifetime',
                plan_id: lineItems.data[0].price.id,
              })
              .eq('stripe_customer_id', customerId)
          }
        }
        break
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object
        await supabaseAdmin
          .from('profiles')
          .update({
            subscription_status: subscription.status,
            plan_id: subscription.items.data[0].price.id,
          })
          .eq('stripe_customer_id', customerId)
        break
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500 })
  }
})
