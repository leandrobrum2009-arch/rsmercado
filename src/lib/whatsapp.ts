 export const sendWhatsAppMessage = (phone: string, message: string) => {
   const formattedPhone = phone.replace(/\D/g, '');
   const encodedMessage = encodeURIComponent(message);
   window.open(`https://wa.me/${formattedPhone}?text=${encodedMessage}`, '_blank');
 };
 
 export const formatCurrency = (value: number) => {
   return new Intl.NumberFormat('pt-BR', {
     style: 'currency',
     currency: 'BRL',
   }).format(value);
 };