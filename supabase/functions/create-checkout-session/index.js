import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import Stripe from 'https://esm.sh/stripe@11.1.0?target=deno'

const stripe = Stripe(Deno.env.get('STRIPE_SECRET_KEY'))

serve(async (req) => {
  // Handle CORS preflight request
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: { 
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    }})
  }

  try {
    const { priceId } = await req.json()
    if (!priceId) {
      throw new Error("Price ID is required.");
    }

    // Create a Supabase client with the user's auth token
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
        throw new Error("Missing authorization header");
    }
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL'),
      Deno.env.get('SUPABASE_ANON_KEY'),
      { global: { headers: { Authorization: authHeader } } }
    )

    // Get user data from Supabase
    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) {
      return new Response(JSON.stringify({ error: 'User not found' }), { status: 401, headers: { 'Content-Type': 'application/json' } })
    }

    // Get user profile to check for existing Stripe customer ID
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', user.id)
      .single()

    if (profileError) throw profileError

    let customerId = profile.stripe_customer_id
    if (!customerId) {
      // Create a new Stripe customer
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { supabase_user_id: user.id },
      })
      customerId = customer.id

      // Update the user's profile with the new Stripe customer ID
      const { error: updateError } = await supabaseClient
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', user.id)
      if (updateError) throw updateError
    }

    // Determine if the price is for a one-time payment or a subscription
    const price = await stripe.prices.retrieve(priceId);
    const mode = price.type === 'recurring' ? 'subscription' : 'payment';

    // Create a Stripe Checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: mode,
      success_url: `${Deno.env.get('SITE_URL')}/app/abonnement?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${Deno.env.get('SITE_URL')}/app/abonnement`,
      // For subscriptions, allow trial if the user is eligible
      ...(mode === 'subscription' && {
        subscription_data: {
          trial_period_days: 14
        }
      })
    })

    return new Response(JSON.stringify({ sessionId: session.id, url: session.url }), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
  } catch (error) {
    console.error('Error creating checkout session:', error)
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } })
  }
})
