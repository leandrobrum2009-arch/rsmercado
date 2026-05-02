 import { Link } from "@tanstack/react-router";
 
 const categories = [
   { name: "Hortifruti", icon: "🍎", slug: "hortifruti" },
   { name: "Padaria", icon: "🥖", slug: "padaria" },
   { name: "Carnes", icon: "🥩", slug: "acougue" },
   { name: "Bebidas", icon: "🥤", slug: "bebidas" },
   { name: "Laticínios", icon: "🧀", slug: "laticinios" },
   { name: "Limpeza", icon: "🧼", slug: "limpeza" },
   { name: "Pet Shop", icon: "🐾", slug: "pet-shop" },
   { name: "Higiene", icon: "🪥", slug: "higiene" },
 ];
 
 export const CategoryBar = () => {
   return (
     <div className="py-6 overflow-x-auto no-scrollbar">
       <div className="flex gap-4 px-4 min-w-max">
         {categories.map((cat) => (
           <Link
             key={cat.slug}
             to={`/category/${cat.slug}`}
             className="flex flex-col items-center gap-2 group"
           >
             <div className="w-16 h-16 rounded-2xl bg-white shadow-sm border flex items-center justify-center text-3xl group-hover:border-green-500 group-hover:bg-green-50 transition-all duration-300">
               {cat.icon}
             </div>
             <span className="text-xs font-medium text-gray-600 group-hover:text-green-600">
               {cat.name}
             </span>
           </Link>
         ))}
       </div>
     </div>
   );
 };