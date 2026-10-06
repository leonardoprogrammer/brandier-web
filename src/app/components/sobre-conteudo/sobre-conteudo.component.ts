import { Component } from '@angular/core';

import { AUTOR } from '../../core/links-autor';

@Component({
  selector: 'app-sobre-conteudo',
  templateUrl: './sobre-conteudo.component.html',
})
export class SobreConteudoComponent {
  protected readonly autor = AUTOR;
}
