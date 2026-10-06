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
    path: 'como-funciona',
    title: 'Como funciona - Brandier',
    loadComponent: () => import('./pages/como-funciona/como-funciona.component').then((m) => m.ComoFuncionaComponent),
  },
  {
    path: 'verificar-email',
    title: 'Verificar e-mail - Brandier',
    loadComponent: () =>
      import('./pages/verificar-email/verificar-email.component').then((m) => m.VerificarEmailComponent),
  },
  {
    path: 'convite',
    title: 'Convite - Brandier',
    loadComponent: () => import('./pages/convite/convite.component').then((m) => m.ConviteComponent),
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
        path: 'marcas/:marcaId/resumo',
        title: 'Painel da marca - Brandier',
        loadComponent: () => import('./pages/painel-marca/painel-marca.component').then((m) => m.PainelMarcaComponent),
      },
      {
        path: 'marcas/:marcaId/lojas',
        title: 'Lojas - Brandier',
        loadComponent: () => import('./pages/lojas/lojas.component').then((m) => m.LojasComponent),
      },
      {
        path: 'marcas/:marcaId/lojas/nova',
        title: 'Nova loja - Brandier',
        loadComponent: () =>
          import('./pages/loja-formulario/loja-formulario.component').then((m) => m.LojaFormularioComponent),
      },
      {
        path: 'marcas/:marcaId/lojas/:id',
        title: 'Editar loja - Brandier',
        loadComponent: () =>
          import('./pages/loja-formulario/loja-formulario.component').then((m) => m.LojaFormularioComponent),
      },
      {
        path: 'marcas/:marcaId/produtos',
        title: 'Produtos - Brandier',
        loadComponent: () => import('./pages/produtos/produtos.component').then((m) => m.ProdutosComponent),
      },
      {
        path: 'marcas/:marcaId/produtos/novo',
        title: 'Novo produto - Brandier',
        loadComponent: () =>
          import('./pages/produto-formulario/produto-formulario.component').then((m) => m.ProdutoFormularioComponent),
      },
      {
        path: 'marcas/:marcaId/produtos/:id',
        title: 'Editar produto - Brandier',
        loadComponent: () =>
          import('./pages/produto-formulario/produto-formulario.component').then((m) => m.ProdutoFormularioComponent),
      },
      {
        path: 'marcas/:marcaId/promotores',
        title: 'Promotores - Brandier',
        loadComponent: () => import('./pages/promotores/promotores.component').then((m) => m.PromotoresComponent),
      },
      {
        path: 'marcas/:marcaId/reposicoes',
        title: 'Reposições da marca - Brandier',
        loadComponent: () => import('./pages/reposicoes/reposicoes.component').then((m) => m.ReposicoesComponent),
      },
      {
        path: 'reposicoes',
        title: 'Minhas reposições - Brandier',
        loadComponent: () => import('./pages/reposicoes/reposicoes.component').then((m) => m.ReposicoesComponent),
      },
      {
        path: 'reposicoes/nova',
        title: 'Nova reposição - Brandier',
        loadComponent: () =>
          import('./pages/reposicao-formulario/reposicao-formulario.component').then(
            (m) => m.ReposicaoFormularioComponent,
          ),
      },
      {
        path: 'reposicoes/:marcaId/:id',
        title: 'Editar reposição - Brandier',
        loadComponent: () =>
          import('./pages/reposicao-formulario/reposicao-formulario.component').then(
            (m) => m.ReposicaoFormularioComponent,
          ),
      },
      {
        path: 'relatorios',
        title: 'Relatórios - Brandier',
        loadComponent: () => import('./pages/relatorios/relatorios.component').then((m) => m.RelatoriosComponent),
      },
      {
        path: 'promotor',
        title: 'Como promotor - Brandier',
        loadComponent: () =>
          import('./pages/promotor-vinculos/promotor-vinculos.component').then((m) => m.PromotorVinculosComponent),
      },
      {
        path: 'conta',
        title: 'Minha conta - Brandier',
        loadComponent: () => import('./pages/conta/conta.component').then((m) => m.ContaComponent),
      },
      {
        path: 'como-funciona',
        title: 'Como funciona - Brandier',
        loadComponent: () =>
          import('./components/como-funciona-conteudo/como-funciona-conteudo.component').then(
            (m) => m.ComoFuncionaConteudoComponent,
          ),
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
