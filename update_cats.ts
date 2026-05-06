import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.VITE_SUPABASE_URL!, process.env.VITE_SUPABASE_ANON_KEY!);

const icons = {
  'Hortifruti': 'https://cdn-icons-png.flaticon.com/512/2329/2329865.png',
  'Açougue': 'https://cdn-icons-png.flaticon.com/512/1046/1046769.png',
  'Padaria': 'https://cdn-icons-png.flaticon.com/512/992/992743.png',
  'Bebidas': 'https://cdn-icons-png.flaticon.com/512/3122/3122040.png',
  'Mercearia': 'https://cdn-icons-png.flaticon.com/512/3081/3081840.png',
  'Higiene': 'https://cdn-icons-png.flaticon.com/512/2553/2553642.png',
  'Limpeza': 'https://cdn-icons-png.flaticon.com/512/995/995016.png',
  'Pet Shop': 'https://cdn-icons-png.flaticon.com/512/616/616408.png',
  'Doces e Biscoitos': 'https://cdn-icons-png.flaticon.com/512/1904/1904425.png',
  'Laticínios': 'https://cdn-icons-png.flaticon.com/512/2674/2674486.png',
  'Frios': 'https://cdn-icons-png.flaticon.com/512/1154/1154625.png',
  'Congelados': 'https://cdn-icons-png.flaticon.com/512/2210/2210565.png'
};

for (const [name, url] of Object.entries(icons)) {
  const { error } = await supabase
    .from('categories')
    .update({ icon_url: url })
    .eq('name', name);
  if (error) console.error('Error updating ' + name + ':', error);
  else console.log('Updated ' + name);
}
