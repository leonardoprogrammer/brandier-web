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
    canActivate: [authGuard],
    loadComponent: () =>
      import('./components/painel-layout/painel-layout.component').then((m) => m.PainelLayoutComponent),
    children: [
      {
        path: '',
        title: 'Painel - Brandier',
        loadComponent: () =>
          import('./pages/painel-inicio/painel-inicio.component').then((m) => m.PainelInicioComponent),
      },
      {
        path: 'marcas',
        title: 'Marcas - Brandier',
        loadComponent: () => import('./pages/marcas/marcas.component').then((m) => m.MarcasComponent),
      },
      {
        path: 'marcas/nova',
        title: 'Nova marca - Brandier',
        loadComponent: () =>
          import('./pages/marca-formulario/marca-formulario.component').then((m) => m.MarcaFormularioComponent),
      },
      {
        path: 'marcas/:id',
        title: 'Editar marca - Brandier',
        loadComponent: () =>
          import('./pages/marca-formulario/marca-formulario.component').then((m) => m.MarcaFormularioComponent),
      },
      {
        path: 'sobre',
        title: 'Sobre o projeto - Brandier',
        loadComponent: () =>
          import('./components/sobre-conteudo/sobre-conteudo.component').then((m) => m.SobreConteudoComponent),
      },
    ],
  },
  { path: '**', redirectTo: 'entrar' },
];
