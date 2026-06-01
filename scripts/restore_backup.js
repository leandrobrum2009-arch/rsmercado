
import { createClient } from '@supabase/supabase-js';

const OLD_PROJECT_URL = 'https://woelvkuxkkhvausaoudk.supabase.co';
const OLD_PROJECT_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndvZWx2a3V4a2todmF1c2FvdWRrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc2OTIwNDgsImV4cCI6MjA5MzI2ODA0OH0.iHYGTa13pGmmtkVNce6JIKCWgQrUUnuruilOffM_oSo';

const NEW_PROJECT_URL = process.env.VITE_SUPABASE_URL;
const NEW_PROJECT_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

const oldSupabase = createClient(OLD_PROJECT_URL, OLD_PROJECT_KEY);
const newSupabase = createClient(NEW_PROJECT_URL, NEW_PROJECT_KEY);

async function migrateTable(tableName, options = {}) {
  console.log(`Migrating ${tableName}...`);
  const { limit = 1000, orderBy = 'created_at' } = options;
  
  const { data: oldData, error: fetchError } = await oldSupabase
    .from(tableName)
    .select('*')
    .order(orderBy, { ascending: false })
    .limit(limit);

  if (fetchError) {
    console.error(`Error fetching ${tableName}:`, fetchError);
    return;
  }

  if (!oldData || oldData.length === 0) {
    console.log(`No data found for ${tableName}`);
    return;
  }

  console.log(`Found ${oldData.length} records in ${tableName}. Inserting...`);
  
  // Clean data (remove fields that might cause foreign key issues if not migrated yet)
  const cleanedData = oldData.map(item => {
      const newItem = { ...item };
      // You can add logic here to map IDs or handle specific constraints
      return newItem;
  });

  const { error: insertError } = await newSupabase
    .from(tableName)
    .upsert(cleanedData, { onConflict: 'id' });

  if (insertError) {
    console.error(`Error inserting into ${tableName}:`, insertError);
  } else {
    console.log(`Successfully migrated ${tableName}`);
  }
}

async function run() {
  // Profiles first (to avoid FK issues in orders/recipes)
  await migrateTable('profiles', { orderBy: 'id' });
  
  // Then others
  await migrateTable('loyalty_rewards', { orderBy: 'id' });
  await migrateTable('banners', { orderBy: 'id' });
  await migrateTable('recipes', { orderBy: 'id' });
  await migrateTable('orders', { orderBy: 'id' });
  
  // Flyers (only last 50 to avoid timeout/size issues with base64)
  await migrateTable('flyers', { limit: 50, orderBy: 'created_at' });

  console.log('Migration complete!');
}

run();
