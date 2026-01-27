import Stripe from 'stripe';

const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

if (!STRIPE_SECRET_KEY) {
    console.warn("⚠️ STRIPE_SECRET_KEY missing. Payments will fail. Set this in your .env file.");
}

export const stripe = new Stripe(STRIPE_SECRET_KEY || 'sk_test_placeholder', {
    apiVersion: '2025-01-27.acacia' as any, // User preferred
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

export async function createSubscriptionCheckout(
    customerId: string,
    tier: keyof typeof PLANS,
    successUrl: string,
    cancelUrl: string,
    interval: 'weekly' | 'monthly' | 'quarterly' | 'yearly' | 'lifetime' = 'monthly'
) {
    const plan = PLANS[tier];
    let price = plan.price;
    let recurring: any = { interval: 'month' };
    let mode: Stripe.Checkout.Session.Mode = 'subscription';

    switch (interval) {
        case 'weekly':
            price = Math.round(plan.price / 4);
            recurring = { interval: 'week' };
            break;
        case 'monthly':
            price = plan.price;
            recurring = { interval: 'month' };
            break;
        case 'quarterly':
            price = plan.price * 3;
            recurring = { interval: 'month', interval_count: 3 };
            break;
        case 'yearly':
            price = plan.price * 12; // In real app apply discount
            recurring = { interval: 'year' };
            break;
        case 'lifetime':
            price = plan.price * 24; // ~2 years
            mode = 'payment'; // One-time
            recurring = undefined;
            break;
    }

    const lineItem: Stripe.Checkout.SessionCreateParams.LineItem = {
        price_data: {
            currency: 'usd',
            product_data: {
                name: `Cognitive ERP - ${plan.name} (${interval})`,
                description: plan.features.join(', '),
            },
            unit_amount: price,
        },
        quantity: 1,
    };

    if (recurring) {
        (lineItem.price_data as any).recurring = recurring;
    }

    return await stripe.checkout.sessions.create({
        customer: customerId,
        mode: mode,
        payment_method_types: ['card'],
        line_items: [lineItem],
        success_url: successUrl,
        cancel_url: cancelUrl,
        metadata: {
            tier: tier,
            interval: interval
        },
    });
}

export async function getPortalSession(customerId: string, returnUrl: string) {
    return await stripe.billingPortal.sessions.create({
        customer: customerId,
        return_url: returnUrl,
    });
}
