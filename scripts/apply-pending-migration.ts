import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
    process.env.SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function applyMigration() {
    console.log('Applying missing migration: add bank_account_id to purchases...');

    const { data, error } = await supabase.rpc('exec_sql', {
        sql: 'ALTER TABLE purchases ADD COLUMN IF NOT EXISTS bank_account_id varchar;'
    });

    if (error) {
        console.error('Error applying migration:', error);
        // Try alternative method - direct SQL execution
        const { error: error2 } = await supabase
            .from('purchases')
            .select('bank_account_id')
            .limit(1);

        if (error2?.message?.includes('does not exist')) {
            console.log('Column still missing. Manual intervention needed.');
            console.log('Please run this SQL in Supabase SQL Editor:');
            console.log('ALTER TABLE purchases ADD COLUMN IF NOT EXISTS bank_account_id varchar;');
            process.exit(1);
        }
    } else {
        console.log('✅ Migration applied successfully!');
    }
}

applyMigration();
