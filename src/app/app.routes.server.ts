import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  { path: '', renderMode: RenderMode.Prerender },
  { path: 'entrar', renderMode: RenderMode.Prerender },
  { path: 'cadastro', renderMode: RenderMode.Prerender },
  { path: 'esqueci-senha', renderMode: RenderMode.Prerender },
  { path: 'sobre', renderMode: RenderMode.Prerender },
  { path: 'como-funciona', renderMode: RenderMode.Prerender },
  { path: '**', renderMode: RenderMode.Client },
];
