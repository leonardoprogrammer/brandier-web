import { Component } from '@angular/core';

import { PublicLayoutComponent } from '../../components/public-layout/public-layout.component';
import { SobreConteudoComponent } from '../../components/sobre-conteudo/sobre-conteudo.component';

@Component({
  selector: 'app-sobre',
  imports: [PublicLayoutComponent, SobreConteudoComponent],
  templateUrl: './sobre.component.html',
})
export class SobreComponent {}
