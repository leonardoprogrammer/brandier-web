import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-painel',
  templateUrl: './painel.component.html',
})
export class PainelComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly usuario = this.auth.usuario;
  protected readonly saindo = signal(false);

  protected sair(): void {
    this.saindo.set(true);
    this.auth
      .sair()
      .pipe(finalize(() => this.saindo.set(false)))
      .subscribe({
        next: () => void this.router.navigate(['/entrar']),
        error: () => void this.router.navigate(['/entrar']),
      });
  }
}
