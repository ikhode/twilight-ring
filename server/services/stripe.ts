import Stripe from 'stripe';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

if (!STRIPE_SECRET_KEY) {
    console.warn("⚠️ STRIPE_SECRET_KEY missing. Payments will fail.");
}

export const stripe = new Stripe(STRIPE_SECRET_KEY || 'sk_test_placeholder', {
    apiVersion: '2025-01-27.acacia' as any, // Use latest stable
});

// Plan prices (In a real app, these would come from Stripe Dashboard as Price IDs)
// For this demo, we can use these as internal identifiers or let Stripe handle them
export const PLANS = {
    starter: {
        name: 'Starter',
        price: 4900, // $49.00
        interval: 'month',
        features: ['Up to 5 terminals', 'Basic AI Guardian', 'Standard Support'],
    },
    professional: {
        name: 'Professional',
        price: 12900, // $129.00
        interval: 'month',
        features: ['Unlimited terminals', 'Full AI Suite', 'Priority Support'],
    },
    enterprise: {
        name: 'Enterprise',
        price: 49900, // $499.00
        interval: 'month',
        features: ['Custom AI Training', 'Dedicated Account Manager', '24/7 Support'],
    },
};

export async function createStripeCustomer(email: string, name: string) {
    return await stripe.customers.create({
        email,
        name,
    });
}

export async function createSubscriptionCheckout(customerId: string, tier: keyof typeof PLANS, successUrl: string, cancelUrl: string) {
    const plan = PLANS[tier];

    return await stripe.checkout.sessions.create({
        customer: customerId,
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [
            {
                price_data: {
                    currency: 'usd',
                    product_data: {
                        name: `Cognitive ERP - Plan ${plan.name}`,
                        description: plan.features.join(', '),
                    },
                    unit_amount: plan.price,
                    recurring: {
                        interval: 'month',
                    },
                },
                quantity: 1,
            },
        ],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
            tier: tier,
        },
    });
}

export async function getPortalSession(customerId: string, returnUrl: string) {
    return await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
    });
}
