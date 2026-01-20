import { Express, Request, Response } from "express";
import { db } from "../storage";
import { organizations, userOrganizations } from "../../shared/schema";
import { eq } from "drizzle-orm";
import { stripe, createSubscriptionCheckout, getPortalSession, createStripeCustomer } from "../services/stripe";
import { supabaseAdmin } from "../supabase";

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_placeholder';

export function registerSubscriptionRoutes(app: Express) {

    // Helper to get organization from token
    async function getOrgFromRequest(req: Request) {
        const authHeader = req.headers.authorization;
        if (!authHeader) return null;
        const token = authHeader.replace("Bearer ", "");

        const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
        if (error || !user) return null;

        const userOrg = await db.query.userOrganizations.findFirst({
            where: eq(userOrganizations.userId, user.id),
            with: { organization: true },
        });

        return userOrg?.organization || null;
    }

    // POST /api/subscriptions/checkout
    app.post("/api/subscriptions/checkout", async (req: Request, res: Response) => {
        try {
            const org = await getOrgFromRequest(req);
            if (!org) return res.status(401).json({ message: "No autorizado" });

            const { tier } = req.body;
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
                cancelUrl
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
                const subscriptionId = session.subscription;

                if (customerId && tier) {
                    await db.update(organizations)
                        .set({
                            subscriptionTier: tier as any,
                            stripeSubscriptionId: subscriptionId,
                            subscriptionStatus: 'active'
                        })
                        .where(eq(organizations.stripeCustomerId, customerId));

                    console.log(`✅ Organization updated to tier ${tier} for customer ${customerId}`);
                }
                break;

            case 'customer.subscription.deleted':
                const deletedSub = event.data.object;
                await db.update(organizations)
                    .set({
                        subscriptionTier: 'starter', // Downgrade or keep current?
                        subscriptionStatus: 'canceled'
                    })
                    .where(eq(organizations.stripeSubscriptionId, deletedSub.id));
                break;

            default:
                console.log(`Unhandled event type ${event.type}`);
        }

        res.json({ received: true });
    });
}
