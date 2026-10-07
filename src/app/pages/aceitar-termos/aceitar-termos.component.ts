import { Component, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthLayoutComponent } from '../../components/auth-layout/auth-layout.component';
import { extrairProblema, mensagemDeErro } from '../../core/api-error';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-aceitar-termos',
  imports: [ReactiveFormsModule, RouterLink, AuthLayoutComponent],
  templateUrl: './aceitar-termos.component.html',
})
export class AceitarTermosComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly usuario = this.auth.usuario;
  protected readonly aceitouTermos = new FormControl(false, { nonNullable: true, validators: [Validators.requiredTrue] });

  protected readonly enviando = signal(false);
  protected readonly saindo = signal(false);
  protected readonly erro = signal<string | null>(null);

  protected prosseguir(): void {
    if (this.aceitouTermos.invalid) {
      return;
    }

    this.enviando.set(true);
    this.erro.set(null);
    this.auth
      .aceitarTermos()
      .pipe(finalize(() => this.enviando.set(false)))
      .subscribe({
        next: () => void this.router.navigate(['/painel']),
        error: (erro: unknown) => this.erro.set(mensagemDeErro(extrairProblema(erro))),
      });
  }

  protected sair(): void {
    this.saindo.set(true);
    this.auth
      .sair()
      .pipe(finalize(() => this.saindo.set(false)))
      .subscribe(() => void this.router.navigate(['/entrar']));
  }
}
