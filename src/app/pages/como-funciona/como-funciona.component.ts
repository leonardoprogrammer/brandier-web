import { Component } from '@angular/core';

import { ComoFuncionaConteudoComponent } from '../../components/como-funciona-conteudo/como-funciona-conteudo.component';
import { PublicLayoutComponent } from '../../components/public-layout/public-layout.component';

@Component({
  selector: 'app-como-funciona',
  imports: [PublicLayoutComponent, ComoFuncionaConteudoComponent],
  template: '<app-public-layout><app-como-funciona-conteudo /></app-public-layout>',
})
export class ComoFuncionaComponent {}
