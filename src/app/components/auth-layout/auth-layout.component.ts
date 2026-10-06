import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-auth-layout',
  imports: [RouterLink],
  templateUrl: './auth-layout.component.html',
})
export class AuthLayoutComponent {
  readonly titulo = input.required<string>();
  readonly subtitulo = input<string>('');
}
