import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  { path: 'entrar', renderMode: RenderMode.Prerender },
  { path: 'cadastro', renderMode: RenderMode.Prerender },
  { path: '**', renderMode: RenderMode.Client },
];
