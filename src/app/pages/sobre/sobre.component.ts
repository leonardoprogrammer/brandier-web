import { Component } from '@angular/core';

import { PublicLayoutComponent } from '../../components/public-layout/public-layout.component';
import { AUTOR } from '../../core/links-autor';

@Component({
  selector: 'app-sobre',
  imports: [PublicLayoutComponent],
  templateUrl: './sobre.component.html',
})
export class SobreComponent {
  protected readonly autor = AUTOR;
}
