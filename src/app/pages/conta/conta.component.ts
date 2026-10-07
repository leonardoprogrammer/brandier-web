import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormControl, NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';

import { SenhaRequisitosComponent } from '../../components/senha-requisitos/senha-requisitos.component';
import { extrairProblema, mensagemDeErro } from '../../core/api-error';
import { AuthService } from '../../services/auth.service';
import {
  SENHA_TAMANHO_MAXIMO,
  SENHA_TAMANHO_MINIMO,
  senhaComLetraENumero,
  senhaDentroDoLimiteDeBytes,
  senhasIguais,
} from '../../validators/senha.validator';
import { semSoEspacos } from '../../validators/texto.validator';

type CampoSenha = 'senhaAtual' | 'novaSenha' | 'confirmarNovaSenha';

@Component({
  selector: 'app-conta',
  imports: [ReactiveFormsModule, SenhaRequisitosComponent],
  templateUrl: './conta.component.html',
})
export class ContaComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly formBuilder = inject(NonNullableFormBuilder);

  protected readonly usuario = this.auth.usuario;
  protected readonly temSenhaDefinida = computed(() => this.usuario()?.temSenha ?? true);

  protected readonly expandirExclusao = signal(false);
  protected readonly confirmando = signal(false);
  protected readonly excluindo = signal(false);
  protected readonly erroSenha = signal<string | null>(null);
  protected readonly erro = signal<string | null>(null);

  protected readonly senha = new FormControl('', { nonNullable: true, validators: [Validators.required] });
  protected readonly entendi = new FormControl(false, { nonNullable: true, validators: [Validators.requiredTrue] });

  protected readonly editandoNome = signal(false);
  protected readonly salvandoNome = signal(false);
  protected readonly erroNome = signal<string | null>(null);
  protected readonly nome = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.maxLength(120), semSoEspacos],
  });

  protected readonly alterandoSenha = signal(false);
  protected readonly enviandoSenha = signal(false);
  protected readonly erroSenhaAtual = signal<string | null>(null);
  protected readonly erroAlterarSenha = signal<string | null>(null);
  protected readonly mostrarSenhas = signal(false);

  protected readonly formSenha = this.formBuilder.group(
    {
      senhaAtual: ['', [Validators.required]],
      novaSenha: [
        '',
        [
          Validators.required,
          Validators.minLength(SENHA_TAMANHO_MINIMO),
          Validators.maxLength(SENHA_TAMANHO_MAXIMO),
          senhaComLetraENumero,
          senhaDentroDoLimiteDeBytes,
        ],
      ],
      confirmarNovaSenha: ['', [Validators.required]],
    },
    { validators: senhasIguais('novaSenha', 'confirmarNovaSenha') },
  );
  protected readonly novaSenhaDigitada = toSignal(this.formSenha.controls.novaSenha.valueChanges, { initialValue: '' });

  protected alternarExclusao(): void {
    this.expandirExclusao.update((aberto) => !aberto);
  }

  protected abrirConfirmacao(): void {
    this.senha.setValidators(this.temSenhaDefinida() ? [Validators.required] : []);
    this.senha.updateValueAndValidity();
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
      .excluirConta(this.temSenhaDefinida() ? this.senha.value : '')
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

  protected iniciarEdicaoNome(): void {
    this.nome.setValue(this.usuario()?.nome ?? '');
    this.erroNome.set(null);
    this.editandoNome.set(true);
  }

  protected cancelarEdicaoNome(): void {
    this.editandoNome.set(false);
    this.erroNome.set(null);
  }

  protected salvarNome(evento: Event): void {
    evento.preventDefault();
    this.erroNome.set(null);
    if (this.nome.invalid) {
      this.nome.markAsTouched();
      return;
    }

    this.salvandoNome.set(true);
    this.auth
      .atualizarNome(this.nome.value.trim())
      .pipe(finalize(() => this.salvandoNome.set(false)))
      .subscribe({
        next: () => this.editandoNome.set(false),
        error: (erro: unknown) => this.erroNome.set(mensagemDeErro(extrairProblema(erro))),
      });
  }

  protected mensagemDoNome(): string | null {
    if (!this.nome.touched || this.nome.valid) {
      return null;
    }
    if (this.nome.hasError('required') || this.nome.hasError('semSoEspacos')) {
      return 'Informe seu nome.';
    }
    return 'O nome deve ter no máximo 120 caracteres.';
  }

  protected iniciarAlteracaoDeSenha(): void {
    const controleSenhaAtual = this.formSenha.controls.senhaAtual;
    controleSenhaAtual.setValidators(this.temSenhaDefinida() ? [Validators.required] : []);
    controleSenhaAtual.updateValueAndValidity();
    this.alterandoSenha.set(true);
  }

  protected cancelarAlteracaoDeSenha(): void {
    this.alterandoSenha.set(false);
    this.formSenha.reset({ senhaAtual: '', novaSenha: '', confirmarNovaSenha: '' });
    this.erroSenhaAtual.set(null);
    this.erroAlterarSenha.set(null);
  }

  protected alternarMostrarSenhas(): void {
    this.mostrarSenhas.update((visivel) => !visivel);
  }

  protected alterarSenha(evento: Event): void {
    evento.preventDefault();
    this.erroSenhaAtual.set(null);
    this.erroAlterarSenha.set(null);
    if (this.formSenha.invalid) {
      this.formSenha.markAllAsTouched();
      return;
    }

    this.enviandoSenha.set(true);
    const { senhaAtual, novaSenha } = this.formSenha.getRawValue();
    this.auth
      .alterarSenha(this.temSenhaDefinida() ? senhaAtual : '', novaSenha)
      .pipe(finalize(() => this.enviandoSenha.set(false)))
      .subscribe({
        next: () => void this.router.navigate(['/entrar'], { queryParams: { senhaAlterada: true } }),
        error: (erro: unknown) => this.tratarErroDeSenha(erro),
      });
  }

  protected mensagemDoCampoDeSenha(campo: CampoSenha): string | null {
    const controle = this.formSenha.controls[campo];
    if (campo === 'senhaAtual' && this.erroSenhaAtual()) {
      return this.erroSenhaAtual();
    }
    if (!controle.touched) {
      return null;
    }
    if (campo === 'confirmarNovaSenha' && controle.valid && this.formSenha.hasError('senhasDiferentes')) {
      return 'As senhas não conferem.';
    }
    if (controle.valid) {
      return null;
    }
    return this.mensagemDeValidacaoDeSenha(campo);
  }

  private mensagemDeValidacaoDeSenha(campo: CampoSenha): string {
    const controle = this.formSenha.controls[campo];
    if (controle.hasError('required')) {
      return campo === 'senhaAtual' ? 'Informe sua senha atual.' : campo === 'novaSenha' ? 'Informe a nova senha.' : 'Confirme a nova senha.';
    }
    if (controle.hasError('minlength')) {
      return `A senha deve ter no mínimo ${SENHA_TAMANHO_MINIMO} caracteres.`;
    }
    if (controle.hasError('maxlength')) {
      return `A senha deve ter no máximo ${SENHA_TAMANHO_MAXIMO} caracteres.`;
    }
    if (controle.hasError('bytesExcedidos')) {
      return 'A senha é longa demais. Use menos caracteres acentuados ou especiais.';
    }
    if (controle.hasError('letraENumero')) {
      return 'A senha deve conter letras e números.';
    }
    return 'Valor inválido.';
  }

  private tratarErroDeSenha(erro: unknown): void {
    const problema = extrairProblema(erro);
    if (problema.codigo === 'SENHA_INCORRETA') {
      this.erroSenhaAtual.set('A senha atual informada está incorreta.');
      return;
    }
    this.erroAlterarSenha.set(mensagemDeErro(problema));
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
