 import { toast as sonnerToast } from "sonner";
 
 export const toast = {
   success: (msg: any, options?: any) => { sonnerToast.success(msg, options); },
   error: (msg: any, options?: any) => { sonnerToast.error(msg, options); },
   info: (msg: any, options?: any) => { sonnerToast.info(msg, options); },
   warning: (msg: any, options?: any) => { sonnerToast.warning(msg, options); },
 };
