import express, { Express, Request, Response } from "express";
import { db } from "../storage";
import { organizations, userOrganizations } from "../../shared/schema";
import { eq } from "drizzle-orm";
import { stripe, createSubscriptionCheckout, getPortalSession, createStripeCustomer } from "../services/stripe";
import { supabaseAdmin } from "../supabase";
import { getAuthenticatedUser } from "../auth_util";

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_placeholder';

export function registerSubscriptionRoutes(app: Express) {

    // Helper to get organization from token
    async function getOrgFromRequest(req: Request) {
        const user = await getAuthenticatedUser(req);
        if (!user) return null;

        const userOrg = await db.query.userOrganizations.findFirst({
            where: eq(userOrganizations.userId, user.id),
            with: { organization: true },
        });

        if (userOrg?.organization) {
            const org = userOrg.organization;
            // Check for Free Starter Expiration
            if (org.subscriptionStatus === 'active' && org.subscriptionExpiresAt && new Date() > new Date(org.subscriptionExpiresAt)) {
                // If no Stripe Subscription (Internal Free Plan), suspend it
                if (!org.stripeSubscriptionId) {
                    console.log(`[Subscription] Suspending organization ${org.id} due to expired free plan.`);
                    await db.update(organizations)
                        .set({ subscriptionStatus: 'suspended' })
                        .where(eq(organizations.id, org.id));
                    org.subscriptionStatus = 'suspended';
                }
            }
        }

        return userOrg?.organization || null;
    }

    // POST /api/subscriptions/checkout
    app.post("/api/subscriptions/checkout", async (req: Request, res: Response) => {
        try {
            const org = await getOrgFromRequest(req);
            if (!org) return res.status(401).json({ message: "No autorizado" });

            const { tier, interval } = req.body;
            if (!tier) return res.status(400).json({ message: "Plan no especificado" });

            // Ensure customer exists
            let customerId = org.stripeCustomerId;
            if (!customerId) {
                const customer = await createStripeCustomer(
                    `org_${org.id}@nexus.internal`, // Dummy email if not available
                    org.name
                );
                customerId = customer.id;

                // Update org with customer ID
                await db.update(organizations)
                    .set({ stripeCustomerId: customerId })
                    .where(eq(organizations.id, org.id));
            }

            const successUrl = `${req.headers.origin}/subscription-success?session_id={CHECKOUT_SESSION_ID}`;
            const cancelUrl = `${req.headers.origin}/settings?tab=subscription`;

            const session = await createSubscriptionCheckout(
                customerId,
                tier as any,
                successUrl,
                cancelUrl,
                interval as any
            );

            res.json({ url: session.url });
        } catch (error: any) {
            console.error("Stripe Checkout Error:", error);
            res.status(500).json({ message: error.message });
        }
    });

    // POST /api/subscriptions/portal
    app.post("/api/subscriptions/portal", async (req: Request, res: Response) => {
        try {
            const org = await getOrgFromRequest(req);
            if (!org || !org.stripeCustomerId) return res.status(400).json({ message: "No tiene suscripción activa" });

            const portalSession = await getPortalSession(
                org.stripeCustomerId,
                `${req.headers.origin}/settings?tab=subscription`
            );

            res.json({ url: portalSession.url });
        } catch (error: any) {
            res.status(500).json({ message: error.message });
        }
    });

    // POST /api/subscriptions/webhook
    // Stripe requires raw body for verification
    app.post("/api/subscriptions/webhook", express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
        const sig = req.headers['stripe-signature'];
        let event;

        try {
            if (STRIPE_WEBHOOK_SECRET !== 'whsec_placeholder') {
                event = stripe.webhooks.constructEvent(
                    req.rawBody as Buffer,
                    sig!,
                    STRIPE_WEBHOOK_SECRET
                );
            } else {
                // Fallback for development if secret is not set
                event = req.body;
                console.warn("⚠️ Webhook received without signature verification (STRIPE_WEBHOOK_SECRET missing)");
            }
        } catch (err: any) {
            console.error(`Webhook Error: ${err.message}`);
            return res.status(400).send(`Webhook Error: ${err.message}`);
        }

        // Handle the event
        switch (event.type) {
            case 'checkout.session.completed':
                const session = event.data.object;
                const customerId = session.customer;
                const tier = session.metadata?.tier;
                const interval = session.metadata?.interval; // 'monthly', 'lifetime', etc.
                const subscriptionId = session.subscription;
                const mode = session.mode;

                if (customerId && tier) {
                    const updates: any = {
                        subscriptionTier: tier as any,
                        subscriptionStatus: 'active',
                        subscriptionInterval: interval || 'monthly'
                    };

                    if (mode === 'subscription' && subscriptionId) {
                        updates.stripeSubscriptionId = subscriptionId;
                        // Expiration will be handled by 'customer.subscription.updated'
                    } else if (mode === 'payment') {
                        // Lifetime
                        updates.stripeSubscriptionId = null; // No recurring sub
                        updates.subscriptionExpiresAt = null; // Never expires
                    }

                    await db.update(organizations)
                        .set(updates)
                        .where(eq(organizations.stripeCustomerId, customerId as string));

                    console.log(`✅ Organization updated to tier ${tier} (${interval}) for customer ${customerId}`);
                }
                break;

            case 'customer.subscription.updated':
            case 'customer.subscription.created':
                const sub = event.data.object;
                await db.update(organizations)
                    .set({
                        subscriptionStatus: sub.status,
                        subscriptionExpiresAt: new Date(sub.current_period_end * 1000),
                        stripeSubscriptionId: sub.id
                    })
                    .where(eq(organizations.stripeCustomerId, sub.customer as string));
                break;

            case 'customer.subscription.deleted':
                const deletedSub = event.data.object;
                await db.update(organizations)
                    .set({
                        subscriptionStatus: 'canceled', // Or 'suspended'
                        subscriptionExpiresAt: new Date() // Expired now
                    })
                    .where(eq(organizations.stripeSubscriptionId, deletedSub.id));
                break;

            default:
                console.log(`Unhandled event type ${event.type}`);
        }

        res.json({ received: true });
    });
}
