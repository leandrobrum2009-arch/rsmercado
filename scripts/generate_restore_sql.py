
import json
import os

def json_to_sql(table_name, json_file):
    if not os.path.exists(json_file):
        return ""
    
    with open(json_file, 'r') as f:
        data = json.load(f)
    
    if not data:
        return ""
    
    sql = []
    # Special handling for profiles and orders to avoid FK issues
    if table_name == 'profiles':
        sql.append("ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;")
    if table_name == 'orders':
        sql.append("ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_user_id_fkey;")
    if table_name == 'recipes':
        sql.append("ALTER TABLE public.recipes DROP CONSTRAINT IF EXISTS recipes_author_id_fkey;")

    for item in data:
        columns = []
        values = []
        for k, v in item.items():
            columns.append(f'"{k}"')
            if v is None:
                values.append("NULL")
            elif isinstance(v, (dict, list)):
                values.append(f"'{json.dumps(v)}'")
            elif isinstance(v, str):
                escaped_v = v.replace("'", "''")
                values.append(f"'{escaped_v}'")
            else:
                values.append(str(v))
        
        col_str = ", ".join(columns)
        val_str = ", ".join(values)
        sql.append(f"INSERT INTO public.{table_name} ({col_str}) VALUES ({val_str}) ON CONFLICT (id) DO NOTHING;")
    
    return "\n".join(sql)

tables = ['profiles', 'loyalty_rewards', 'banners', 'recipes', 'orders']
all_sql = []
for t in tables:
    sql = json_to_sql(t, f'temp/{t}.json')
    if sql:
        all_sql.append(f"-- Restore {t}\n{sql}")

with open('temp/restore.sql', 'w') as f:
    f.write("\n\n".join(all_sql))
