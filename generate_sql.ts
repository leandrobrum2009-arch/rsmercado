
import { readFile } from 'node:fs/promises';

async function migrate() {
  const products = JSON.parse(await readFile('products_old.json', 'utf8'));
  const categories = JSON.parse(await readFile('categories_old.json', 'utf8'));
  const banners = JSON.parse(await readFile('banners_old.json', 'utf8'));

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

  // 2. Banners
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

  // 3. Products
  for (const prod of products) {
    const columns = [
      'id', 'name', 'description', 'price', 'old_price', 'category_id', 
      'image_url', 'stock', 'points_value', 'is_featured', 'brand', 
      'size', 'tags', 'is_available', 'is_approved', 'unit', 'is_weight_based', 'sku'
    ];
    
    const catExists = categories.some(c => c.id === prod.category_id);
    let categoryId = catExists ? prod.category_id : null;

    const values = columns.map(col => {
      if (col === 'category_id') {
         if (!categoryId) return 'NULL';
         return `'${categoryId}'`;
      }
      
      let val = prod[col];
      if (val === null || val === undefined) return 'NULL';
      
      if (Array.isArray(val)) {
        return `'{${val.map(v => `"${String(v).replace(/"/g, '\\"')}"`).join(',')}}'`;
      }
      
      if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
      if (typeof val === 'number') return val;
      
      return `'${String(val).replace(/'/g, "''")}'`;
    });

    sql += `INSERT INTO public.products (${columns.join(', ')}) VALUES (${values.join(', ')}) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, price = EXCLUDED.price, stock = EXCLUDED.stock, category_id = EXCLUDED.category_id, image_url = EXCLUDED.image_url, brand = EXCLUDED.brand, tags = EXCLUDED.tags;\n`;
  }

  sql += 'COMMIT;';
  process.stdout.write(sql);
}

migrate();
