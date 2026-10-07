import { Component, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthLayoutComponent } from '../../components/auth-layout/auth-layout.component';
import { extrairProblema, mensagemDeErro } from '../../core/api-error';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-entrar',
  imports: [ReactiveFormsModule, RouterLink, AuthLayoutComponent],
  templateUrl: './entrar.component.html',
})
export class EntrarComponent {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  private readonly parametros = inject(ActivatedRoute).snapshot.queryParamMap;

  protected readonly sessaoExpirada = this.parametros.has('sessaoExpirada');
  protected readonly contaExcluida = this.parametros.has('contaExcluida');
  protected readonly senhaAlterada = this.parametros.has('senhaAlterada');

  protected readonly form = this.formBuilder.group({
    email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
    senha: ['', [Validators.required]],
  });

  protected readonly enviando = signal(false);
  protected readonly erro = signal<string | null>(null);
  protected readonly mostrarSenha = signal(false);
  protected readonly emailNaoVerificado = signal(false);
  protected readonly reenviando = signal(false);
  protected readonly reenvioConfirmado = signal(false);

  protected entrar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.enviando.set(true);
    this.erro.set(null);
    this.emailNaoVerificado.set(false);
    this.reenvioConfirmado.set(false);

    const { email, senha } = this.form.getRawValue();
    this.auth
      .entrar(email, senha)
      .pipe(finalize(() => this.enviando.set(false)))
      .subscribe({
        next: () => void this.router.navigate(['/painel']),
        error: (erro: unknown) => this.tratarErro(erro),
      });
  }

  protected reenviarVerificacao(): void {
    this.reenviando.set(true);
    this.auth
      .reenviarVerificacao(this.form.getRawValue().email)
      .pipe(finalize(() => this.reenviando.set(false)))
      .subscribe({
        next: () => this.reenvioConfirmado.set(true),
        error: (erro: unknown) => this.erro.set(mensagemDeErro(extrairProblema(erro))),
      });
  }

  protected alternarSenha(): void {
    this.mostrarSenha.update((visivel) => !visivel);
  }

  protected mensagemDoCampo(campo: 'email' | 'senha'): string | null {
    const controle = this.form.controls[campo];
    if (!controle.touched || controle.valid) {
      return null;
    }
    if (controle.hasError('required')) {
      return campo === 'email' ? 'Informe seu e-mail.' : 'Informe sua senha.';
    }
    return 'Informe um e-mail válido.';
  }

  private tratarErro(erro: unknown): void {
    const problema = extrairProblema(erro);
    if (problema.codigo === 'EMAIL_NAO_VERIFICADO') {
      this.emailNaoVerificado.set(true);
      return;
    }
    this.erro.set(mensagemDeErro(problema));
  }
}
