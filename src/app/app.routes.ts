import { Routes } from '@angular/router';

import { authGuard, guestGuard } from './guards/auth.guard';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'entrar' },
  {
    path: 'entrar',
    title: 'Entrar - Brandier',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/entrar/entrar.component').then((m) => m.EntrarComponent),
  },
  {
    path: 'cadastro',
    title: 'Criar conta - Brandier',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/cadastro/cadastro.component').then((m) => m.CadastroComponent),
  },
  {
    path: 'esqueci-senha',
    title: 'Esqueci minha senha - Brandier',
    canActivate: [guestGuard],
    loadComponent: () =>
      import('./pages/esqueci-senha/esqueci-senha.component').then((m) => m.EsqueciSenhaComponent),
  },
  {
    path: 'redefinir-senha',
    title: 'Redefinir senha - Brandier',
    loadComponent: () =>
      import('./pages/redefinir-senha/redefinir-senha.component').then((m) => m.RedefinirSenhaComponent),
  },
  {
    path: 'sobre',
    title: 'Sobre o projeto - Brandier',
    loadComponent: () => import('./pages/sobre/sobre.component').then((m) => m.SobreComponent),
  },
  {
    path: 'verificar-email',
    title: 'Verificar e-mail - Brandier',
    loadComponent: () =>
      import('./pages/verificar-email/verificar-email.component').then((m) => m.VerificarEmailComponent),
  },
  {
    path: 'painel',
    title: 'Painel - Brandier',
    canActivate: [authGuard],
    loadComponent: () => import('./pages/painel/painel.component').then((m) => m.PainelComponent),
  },
  { path: '**', redirectTo: 'entrar' },
];
