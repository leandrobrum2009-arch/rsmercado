import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const router = createRouter({
    routeTree,
    context: {},
    scrollRestoration: true,
    defaultPreload: 'intent',
    defaultPreloadStaleTime: 0,
    defaultNotFoundComponent: () => {
      if (typeof window !== 'undefined') {
        window.location.href = '/';
      }
      return null;
    },
  });

   return router;
 };
 
  declare module '@tanstack/react-router' {
   interface Register {
     router: ReturnType<typeof getRouter>
   }
 }