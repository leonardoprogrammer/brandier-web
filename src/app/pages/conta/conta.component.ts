import { Component, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';

import { extrairProblema } from '../../core/api-error';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-conta',
  imports: [ReactiveFormsModule],
  templateUrl: './conta.component.html',
})
export class ContaComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly usuario = this.auth.usuario;
  protected readonly confirmando = signal(false);
  protected readonly excluindo = signal(false);
  protected readonly erroSenha = signal<string | null>(null);
  protected readonly erro = signal<string | null>(null);

  protected readonly senha = new FormControl('', { nonNullable: true, validators: [Validators.required] });
  protected readonly entendi = new FormControl(false, { nonNullable: true, validators: [Validators.requiredTrue] });

  protected abrirConfirmacao(): void {
    this.confirmando.set(true);
  }

  protected cancelar(): void {
    this.confirmando.set(false);
    this.senha.reset('');
    this.entendi.reset(false);
    this.erroSenha.set(null);
    this.erro.set(null);
  }

  protected excluir(evento: Event): void {
    evento.preventDefault();
    this.erroSenha.set(null);
    this.erro.set(null);
    if (this.senha.invalid || this.entendi.invalid) {
      this.senha.markAsTouched();
      this.entendi.markAsTouched();
      return;
    }

    this.excluindo.set(true);
    this.auth
      .excluirConta(this.senha.value)
      .pipe(finalize(() => this.excluindo.set(false)))
      .subscribe({
        next: () => void this.router.navigate(['/entrar'], { queryParams: { contaExcluida: true } }),
        error: (erro: unknown) => this.tratarErro(erro),
      });
  }

  protected mensagemDaSenha(): string | null {
    const servidor = this.erroSenha();
    if (servidor) {
      return servidor;
    }
    return this.senha.touched && this.senha.hasError('required') ? 'Informe sua senha para confirmar.' : null;
  }

  protected mensagemDoAviso(): string | null {
    return this.entendi.touched && this.entendi.invalid ? 'Marque a confirmação para continuar.' : null;
  }

  private tratarErro(erro: unknown): void {
    const problema = extrairProblema(erro);
    if (problema.codigo === 'SENHA_INCORRETA') {
      this.erroSenha.set('A senha informada está incorreta.');
      return;
    }
    if (problema.status === 429) {
      this.erro.set(problema.mensagem ?? 'Muitas tentativas. Tente novamente mais tarde.');
      return;
    }
    this.erro.set(
      problema.status === 0
        ? 'Não foi possível conectar ao servidor. Tente novamente em instantes.'
        : (problema.mensagem ?? 'Não foi possível excluir a conta. Tente novamente.'),
    );
  }
}
