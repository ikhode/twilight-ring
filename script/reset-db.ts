import "dotenv/config";
import pg from "pg";

const { Pool } = pg;

async function resetDatabase() {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
        throw new Error("DATABASE_URL not set");
    }

    console.log("🔌 Connecting to database...");
    const pool = new Pool({ connectionString: databaseUrl });

    try {
        // Test connection
        await pool.query("SELECT 1");
        console.log("✅ Connected to database");

        console.log("🗑️  Dropping all tables in public schema...");

        // Drop all tables
        await pool.query(`
            DO $$ 
            DECLARE 
                r RECORD;
            BEGIN
                FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
                    EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
                END LOOP;
            END $$;
        `);

        console.log("🗑️  Dropping all enums...");

        // Drop all enums
        await pool.query(`
            DO $$ 
            DECLARE 
                r RECORD;
            BEGIN
                FOR r IN (SELECT typname FROM pg_type WHERE typcategory = 'E' AND typnamespace = 'public'::regnamespace) LOOP
                    EXECUTE 'DROP TYPE IF EXISTS public.' || quote_ident(r.typname) || ' CASCADE';
                END LOOP;
            END $$;
        `);

        console.log("✅ Database cleaned successfully!");
        console.log("📦 Now run: npm run db:push");

    } catch (error) {
        console.error("❌ Error:", error);
        throw error;
    } finally {
        await pool.end();
    }
}

resetDatabase();
