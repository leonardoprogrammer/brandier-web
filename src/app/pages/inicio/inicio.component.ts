import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PublicLayoutComponent } from '../../components/public-layout/public-layout.component';

@Component({
  selector: 'app-inicio',
  imports: [PublicLayoutComponent, RouterLink],
  templateUrl: './inicio.component.html',
})
export class InicioComponent {
  protected readonly funcionalidades = [
    {
      titulo: 'Marcas, lojas e produtos',
      descricao: 'Cadastre suas marcas, as lojas onde atuam e o catálogo de produtos de cada uma.',
    },
    {
      titulo: 'Promotores',
      descricao: 'Convide promotores por e-mail e acompanhe quem está vinculado a cada marca.',
    },
    {
      titulo: 'Reposições',
      descricao: 'Registre as reposições feitas nos pontos de venda, com produtos e quantidades.',
    },
    {
      titulo: 'Painel',
      descricao: 'Acompanhe indicadores de marcas e reposições em um único lugar.',
    },
    {
      titulo: 'Relatórios',
      descricao: 'Filtre por loja, promotor, produto e período, com exportação em CSV.',
    },
    {
      titulo: 'Conta segura',
      descricao: 'Login com e-mail e senha ou com Google, verificação de e-mail e redefinição de senha.',
    },
  ];
}
