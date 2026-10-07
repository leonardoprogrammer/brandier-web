import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { TemaToggleComponent } from '../tema-toggle/tema-toggle.component';

@Component({
  selector: 'app-public-layout',
  imports: [RouterLink, TemaToggleComponent],
  templateUrl: './public-layout.component.html',
})
export class PublicLayoutComponent {}
