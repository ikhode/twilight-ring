import 'dotenv/config';
import pg from 'pg';

async function setup() {
    console.log("🚀 Starting Supabase Automation Setup (Final Polish)...");

    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
        console.error("❌ DATABASE_URL missing in .env");
        return;
    }

    const pool = new pg.Pool({ connectionString });

    try {
        console.log("1. Checking extensions...");
        try {
            await pool.query('CREATE EXTENSION IF NOT EXISTS vector;');
            console.log("✅ Vector extension is active.");
        } catch (e: any) {
            console.log("ℹ️ Extension check skipped or handled (might need dashboard manual enable if not active).");
        }

        console.log("2. Configuring Realtime Replication...");
        // Ensure publication exists
        try {
            await pool.query("SELECT * FROM pg_publication WHERE pubname = 'supabase_realtime'");
        } catch (e) {
            await pool.query("CREATE PUBLICATION supabase_realtime;");
        }

        const tables = [
            'products', 'sales', 'purchases', 'employees', 'ai_insights',
            'processes', 'piecework_tickets', 'ai_configurations', 'process_instances',
            'inventory_movements', 'tickets'
        ];
        for (const table of tables) {
            try {
                // First check if already in publication
                const check = await pool.query(`
                    SELECT 1 FROM pg_publication_tables 
                    WHERE pubname = 'supabase_realtime' AND tablename = $1
                `, [table]);

                if (check.rows.length === 0) {
                    await pool.query(`ALTER PUBLICATION supabase_realtime ADD TABLE "${table}";`);
                    console.log(`✅ Realtime enabled for "${table}"`);
                } else {
                    console.log(`ℹ️ Realtime already enabled for "${table}"`);
                }
            } catch (e: any) {
                console.warn(`⚠️ Could not enable realtime for "${table}":`, e.message);
            }
        }

        console.log("\n✨ Supabase automation sequence finished!");

    } catch (error) {
        console.error("❌ Setup failed:", error);
    } finally {
        await pool.end();
    }
}

setup();
