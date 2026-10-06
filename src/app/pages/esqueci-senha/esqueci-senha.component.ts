import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthLayoutComponent } from '../../components/auth-layout/auth-layout.component';
import { extrairProblema, mensagemDeErro } from '../../core/api-error';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-esqueci-senha',
  imports: [ReactiveFormsModule, RouterLink, AuthLayoutComponent],
  templateUrl: './esqueci-senha.component.html',
})
export class EsqueciSenhaComponent {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly auth = inject(AuthService);

  protected readonly form = this.formBuilder.group({
    email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
  });

  protected readonly enviando = signal(false);
  protected readonly erro = signal<string | null>(null);
  protected readonly concluido = signal(false);
  protected readonly emailInformado = signal('');

  protected solicitar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const email = this.form.getRawValue().email.trim();
    this.enviando.set(true);
    this.erro.set(null);
    this.auth
      .solicitarRedefinicaoSenha(email)
      .pipe(finalize(() => this.enviando.set(false)))
      .subscribe({
        next: () => {
          this.emailInformado.set(email);
          this.concluido.set(true);
        },
        error: (erro: unknown) => this.erro.set(mensagemDeErro(extrairProblema(erro))),
      });
  }

  protected tentarOutroEmail(): void {
    this.concluido.set(false);
    this.erro.set(null);
    this.form.reset();
  }

  protected mensagemDoEmail(): string | null {
    const controle = this.form.controls.email;
    if (!controle.touched || controle.valid) {
      return null;
    }
    return controle.hasError('required') ? 'Informe seu e-mail.' : 'Informe um e-mail válido.';
  }
}
