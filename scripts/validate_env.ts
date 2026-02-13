import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
    DATABASE_URL: z.string().url(),
    SUPABASE_URL: z.string().url(),
    SUPABASE_ANON_KEY: z.string().min(1),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
    PORT: z.string().optional().default("5000"),
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),
});

try {
    envSchema.parse(process.env);
    console.log("✅ Environment validation successful.");
} catch (error) {
    if (error instanceof z.ZodError) {
        console.error("❌ Environment validation failed:");
        error.errors.forEach((err) => {
            console.error(`  - ${err.path.join(".")}: ${err.message}`);
        });
    } else {
        console.error("❌ An unknown error occurred during environment validation.");
    }
    process.exit(1);
}
