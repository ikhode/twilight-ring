import { db } from "../storage";
import { organizations, sales, customers, products } from "@shared/schema";
import { eq } from "drizzle-orm";

const FACTURAPI_BASE_URL = "https://www.facturapi.com/v1";

export class FacturapiService {
    /**
     * Retrieves Facturapi API Key for the organization.
     * Standardized to look in organization.settings.facturapiApiKey
     */
    private static async getApiKey(orgId: string): Promise<string> {
        const [org] = await db.select().from(organizations).where(eq(organizations.id, orgId)).limit(1);
        if (!org) throw new Error("Organization not found");

        const settings = (org.settings as any) || {};
        const apiKey = settings.facturapiApiKey;

        if (!apiKey) {
            throw new Error("Facturapi API Key not configured for this organization. Please add 'facturapiApiKey' to settings.");
        }

        return apiKey;
    }

    /**
     * Stamps a sale using Facturapi.
     */
    static async stampInvoice(saleId: string, organizationId: string) {
        const apiKey = await this.getApiKey(organizationId);

        // Fetch Sale with related data
        const [sale] = await db.select().from(sales).where(eq(sales.id, saleId)).limit(1);
        if (!sale) throw new Error("Sale not found");

        const [customer] = await db.select().from(customers).where(eq(customers.id, sale.customerId!)).limit(1);
        const [product] = await db.select().from(products).where(eq(products.id, sale.productId!)).limit(1);

        if (!customer) throw new Error("Customer not found for this sale");
        if (!product) throw new Error("Product not found for this sale");

        if (!customer.rfc || !customer.taxRegimeId || !customer.zipCode) {
            throw new Error(`Customer [${customer.name}] missing mandatory fiscal data (RFC, Tax Regime, or Zip Code)`);
        }

        // Map to Facturapi Invoice Object
        const invoiceData = {
            customer: {
                legal_name: customer.legalName || customer.name,
                tax_id: customer.rfc,
                tax_system: customer.taxRegimeId,
                address: {
                    zip: customer.zipCode
                }
            },
            items: [
                {
                    quantity: sale.quantity,
                    product: {
                        description: product.name,
                        product_key: (product.attributes as any)?.satProductCode || "01010101", // Default to 'Not in catalog' if missing
                        unit_key: (product.attributes as any)?.satUnitCode || "H87", // Default to 'Piece' if missing
                        price: sale.totalPrice / sale.quantity / 100 // Convert cents to decimal
                    }
                }
            ],
            use: sale.cfdiUsage || "G03", // Defaults to Gastos en general
            payment_form: sale.paymentForm || "01", // Defaults to Efectivo
            payment_method: sale.fiscalPaymentMethod || "PUE" // Defaults to Pago en una sola exhibición
        };

        const response = await fetch(`${FACTURAPI_BASE_URL}/invoices`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Basic ${Buffer.from(apiKey + ":").toString("base64")}`
            },
            body: JSON.stringify(invoiceData)
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ message: response.statusText }));
            throw new Error(`Facturapi Error: ${errorData.message || response.statusText}`);
        }

        const facturapiInvoice = await response.json();

        // Update Sale with fiscal metadata
        await db.update(sales)
            .set({
                fiscalUuid: facturapiInvoice.uuid,
                fiscalStatus: "stamped",
                fiscalPaymentMethod: invoiceData.payment_method,
                paymentForm: invoiceData.payment_form,
                cfdiUsage: invoiceData.use
            })
            .where(eq(sales.id, saleId));

        return facturapiInvoice;
    }

    /**
     * Download Invoice PDF as Stream/Buffer
     */
    static async downloadPdf(invoiceId: string, organizationId: string) {
        const apiKey = await this.getApiKey(organizationId);
        const response = await fetch(`${FACTURAPI_BASE_URL}/invoices/${invoiceId}/pdf`, {
            headers: {
                "Authorization": `Basic ${Buffer.from(apiKey + ":").toString("base64")}`
            }
        });

        if (!response.ok) throw new Error("Failed to download PDF from Facturapi");
        return response.arrayBuffer();
    }
}
