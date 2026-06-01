
import { readFile } from 'node:fs/promises';

async function migrate() {
  try {
    const profiles = JSON.parse(await readFile('profiles_migration.json', 'utf8'));
    console.log(`Migrating ${profiles.length} profiles...`);

    let sql = 'SET search_path = public;\nBEGIN;\n';

    for (const profile of profiles) {
      const columns = ['id', 'full_name', 'whatsapp', 'household_status', 'points_balance', 'avatar_url'];
      const values = columns.map(col => {
        const val = profile[col];
        if (val === null || val === undefined) return 'NULL';
        if (typeof val === 'number') return val;
        return `'${String(val).replace(/'/g, "''")}'`;
      });
      sql += `INSERT INTO public.profiles (${columns.join(', ')}) VALUES (${values.join(', ')}) ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name, whatsapp = EXCLUDED.whatsapp, points_balance = EXCLUDED.points_balance;\n`;
    }

    sql += 'COMMIT;';
    process.stdout.write(sql);
  } catch (err) {
    console.error('Profile migration script error:', err);
  }
}

migrate();
