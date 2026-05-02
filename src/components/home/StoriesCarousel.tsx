 export const StoriesCarousel = () => {
   const stories = [
     { id: 1, label: "Ofertas", image: "https://images.unsplash.com/photo-1607082348824-0a96f2a4b9da?q=80&w=150&auto=format&fit=crop" },
     { id: 2, label: "Carnes", image: "https://images.unsplash.com/photo-1607623273562-6338d8503cb6?q=80&w=150&auto=format&fit=crop" },
     { id: 3, label: "Receitas", image: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?q=80&w=150&auto=format&fit=crop" },
     { id: 4, label: "Dicas", image: "https://images.unsplash.com/photo-1542831371-29b0f74f9713?q=80&w=150&auto=format&fit=crop" },
     { id: 5, label: "Pet", image: "https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?q=80&w=150&auto=format&fit=crop" },
     { id: 6, label: "Limpeza", image: "https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=150&auto=format&fit=crop" },
   ];
 
   return (
     <div className="py-6 overflow-x-auto no-scrollbar border-b bg-white">
       <div className="flex gap-4 px-4 min-w-max">
         {stories.map((story) => (
           <button key={story.id} className="flex flex-col items-center gap-1">
             <div className="p-[3px] rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-purple-600">
               <div className="p-0.5 rounded-full bg-white">
                 <img 
                   src={story.image} 
                   alt={story.label}
                   className="w-16 h-16 rounded-full object-cover"
                 />
               </div>
             </div>
             <span className="text-[11px] font-medium text-gray-700">{story.label}</span>
           </button>
         ))}
       </div>
     </div>
   );
 };