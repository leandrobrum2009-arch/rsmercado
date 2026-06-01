
import { readFile } from 'node:fs/promises';

async function migrate() {
  try {
    const products = JSON.parse(await readFile('products_migration.json', 'utf8'));
    const categories = JSON.parse(await readFile('categories_migration.json', 'utf8'));
    const banners = JSON.parse(await readFile('banners_migration.json', 'utf8'));

    console.log(`Migrating ${categories.length} categories, ${products.length} products, and ${banners.length} banners...`);

    let sql = 'BEGIN;\n';

    // 1. Categories
    for (const cat of categories) {
      const columns = ['id', 'name', 'slug', 'icon_url', 'icon_name', 'banner_url'];
      const values = columns.map(col => {
        const val = cat[col];
        if (val === null || val === undefined) return 'NULL';
        return `'${String(val).replace(/'/g, "''")}'`;
      });
      sql += `INSERT INTO public.categories (${columns.join(', ')}) VALUES (${values.join(', ')}) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, slug = EXCLUDED.slug, icon_url = EXCLUDED.icon_url, icon_name = EXCLUDED.icon_name, banner_url = EXCLUDED.banner_url;\n`;
    }

    // 2. Products
    for (const prod of products) {
      const columns = [
        'id', 'name', 'description', 'price', 'old_price', 'category_id', 
        'image_url', 'stock', 'points_value', 'is_featured', 'brand', 
        'size', 'tags', 'is_available', 'is_approved', 'unit', 'is_weight_based', 'sku'
      ];
      const values = columns.map(col => {
        let val = prod[col];
        if (val === null || val === undefined) return 'NULL';
        if (Array.isArray(val)) {
          return `'{${val.map(v => `"${String(v).replace(/"/g, '\\"')}"`).join(',')}}'`;
        }
        if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
        if (typeof val === 'number') return val;
        return `'${String(val).replace(/'/g, "''")}'`;
      });
      sql += `INSERT INTO public.products (${columns.join(', ')}) VALUES (${values.join(', ')}) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, price = EXCLUDED.price, old_price = EXCLUDED.old_price, category_id = EXCLUDED.category_id, image_url = EXCLUDED.image_url, stock = EXCLUDED.stock, points_value = EXCLUDED.points_value, is_featured = EXCLUDED.is_featured, brand = EXCLUDED.brand, size = EXCLUDED.size, tags = EXCLUDED.tags, is_available = EXCLUDED.is_available, is_approved = EXCLUDED.is_approved, unit = EXCLUDED.unit, is_weight_based = EXCLUDED.is_weight_based, sku = EXCLUDED.sku;\n`;
    }

    // 3. Banners
    for (const banner of banners) {
      const columns = ['id', 'image_url', 'link_url', 'category_id', 'is_active'];
      const values = columns.map(col => {
        let val = banner[col];
        if (val === null || val === undefined) return 'NULL';
        if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
        return `'${String(val).replace(/'/g, "''")}'`;
      });
      sql += `INSERT INTO public.banners (${columns.join(', ')}) VALUES (${values.join(', ')}) ON CONFLICT (id) DO UPDATE SET image_url = EXCLUDED.image_url, link_url = EXCLUDED.link_url, category_id = EXCLUDED.category_id, is_active = EXCLUDED.is_active;\n`;
    }

    sql += 'COMMIT;';
    console.log(sql);
  } catch (err) {
    console.error('Migration script error:', err);
  }
}

migrate();
