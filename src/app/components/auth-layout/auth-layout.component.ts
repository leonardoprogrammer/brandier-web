import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

import { TemaToggleComponent } from '../tema-toggle/tema-toggle.component';

@Component({
  selector: 'app-auth-layout',
  imports: [RouterLink, TemaToggleComponent],
  templateUrl: './auth-layout.component.html',
})
export class AuthLayoutComponent {
  readonly titulo = input.required<string>();
  readonly subtitulo = input<string>('');
}
