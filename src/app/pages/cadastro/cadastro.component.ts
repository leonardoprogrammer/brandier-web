import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthLayoutComponent } from '../../components/auth-layout/auth-layout.component';
import { extrairProblema, mensagemDeErro } from '../../core/api-error';
import { AuthService } from '../../services/auth.service';
import {
  SENHA_TAMANHO_MAXIMO,
  SENHA_TAMANHO_MINIMO,
  senhaComLetraENumero,
  senhaDentroDoLimiteDeBytes,
  senhasIguais,
} from '../../validators/senha.validator';

type CampoCadastro = 'nome' | 'email' | 'senha' | 'confirmarSenha' | 'aceitouTermos';

const SEGUNDOS_ENTRE_REENVIOS = 60;

@Component({
  selector: 'app-cadastro',
  imports: [ReactiveFormsModule, RouterLink, AuthLayoutComponent],
  templateUrl: './cadastro.component.html',
})
export class CadastroComponent {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly auth = inject(AuthService);
  private temporizador: ReturnType<typeof setInterval> | null = null;

  protected readonly form = this.formBuilder.group(
    {
      nome: ['', [Validators.required, Validators.maxLength(120)]],
      email: ['', [Validators.required, Validators.email, Validators.maxLength(254)]],
      senha: [
        '',
        [
          Validators.required,
          Validators.minLength(SENHA_TAMANHO_MINIMO),
          Validators.maxLength(SENHA_TAMANHO_MAXIMO),
          senhaComLetraENumero,
          senhaDentroDoLimiteDeBytes,
        ],
      ],
      confirmarSenha: ['', [Validators.required]],
      aceitouTermos: [false, [Validators.requiredTrue]],
    },
    { validators: senhasIguais('senha', 'confirmarSenha') },
  );

  private readonly senhaDigitada = toSignal(this.form.controls.senha.valueChanges, { initialValue: '' });

  protected readonly requisitosDaSenha = computed(() => {
    const senha = this.senhaDigitada();
    return [
      { descricao: `Mínimo de ${SENHA_TAMANHO_MINIMO} caracteres`, atendido: senha.length >= SENHA_TAMANHO_MINIMO },
      { descricao: 'Pelo menos uma letra', atendido: /\p{L}/u.test(senha) },
      { descricao: 'Pelo menos um número', atendido: /\d/.test(senha) },
    ];
  });

  protected readonly enviando = signal(false);
  protected readonly erro = signal<string | null>(null);
  protected readonly mostrarSenha = signal(false);
  protected readonly concluido = signal(false);
  protected readonly emailCadastrado = signal('');
  protected readonly reenviando = signal(false);
  protected readonly reenvioConfirmado = signal(false);
  protected readonly segundosParaReenviar = signal(0);

  constructor() {
    inject(DestroyRef).onDestroy(() => this.pararContagem());
  }

  protected cadastrar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.enviando.set(true);
    this.erro.set(null);

    const { nome, email, senha, aceitouTermos } = this.form.getRawValue();
    const emailInformado = email.trim();
    this.auth
      .cadastrar({ nome: nome.trim(), email: emailInformado, senha, aceitouTermos })
      .pipe(finalize(() => this.enviando.set(false)))
      .subscribe({
        next: () => {
          this.emailCadastrado.set(emailInformado);
          this.concluido.set(true);
          this.iniciarContagem();
        },
        error: (erro: unknown) => this.tratarErro(erro),
      });
  }

  protected reenviar(): void {
    if (this.segundosParaReenviar() > 0 || this.reenviando()) {
      return;
    }

    this.reenviando.set(true);
    this.erro.set(null);
    this.auth
      .reenviarVerificacao(this.emailCadastrado())
      .pipe(finalize(() => this.reenviando.set(false)))
      .subscribe({
        next: () => {
          this.reenvioConfirmado.set(true);
          this.iniciarContagem();
        },
        error: (erro: unknown) => this.erro.set(mensagemDeErro(extrairProblema(erro))),
      });
  }

  protected alternarSenha(): void {
    this.mostrarSenha.update((visivel) => !visivel);
  }

  protected mensagemDoCampo(campo: CampoCadastro): string | null {
    const controle = this.form.controls[campo];
    const mensagemDoServidor = controle.getError('servidor') as string | null;
    if (mensagemDoServidor) {
      return mensagemDoServidor;
    }
    if (!controle.touched) {
      return null;
    }
    if (campo === 'confirmarSenha' && controle.valid && this.form.hasError('senhasDiferentes')) {
      return 'As senhas não conferem.';
    }
    if (controle.valid) {
      return null;
    }
    return this.mensagemDeValidacao(campo);
  }

  private mensagemDeValidacao(campo: CampoCadastro): string {
    const controle = this.form.controls[campo];
    if (controle.hasError('required') || controle.hasError('requiredTrue')) {
      return {
        nome: 'Informe seu nome.',
        email: 'Informe seu e-mail.',
        senha: 'Informe uma senha.',
        confirmarSenha: 'Confirme sua senha.',
        aceitouTermos: 'É necessário aceitar os termos para criar a conta.',
      }[campo];
    }
    if (controle.hasError('email')) {
      return 'Informe um e-mail válido.';
    }
    if (controle.hasError('minlength')) {
      return `A senha deve ter no mínimo ${SENHA_TAMANHO_MINIMO} caracteres.`;
    }
    if (controle.hasError('maxlength')) {
      return campo === 'senha'
        ? `A senha deve ter no máximo ${SENHA_TAMANHO_MAXIMO} caracteres.`
        : 'O texto informado é longo demais.';
    }
    if (controle.hasError('bytesExcedidos')) {
      return 'A senha é longa demais. Use menos caracteres acentuados ou especiais.';
    }
    if (controle.hasError('letraENumero')) {
      return 'A senha deve conter letras e números.';
    }
    return 'Valor inválido.';
  }

  private tratarErro(erro: unknown): void {
    const problema = extrairProblema(erro);
    const camposNaoMapeados: string[] = [];

    for (const erroCampo of problema.erros) {
      const controle = this.form.get(erroCampo.campo);
      if (controle) {
        controle.setErrors({ servidor: erroCampo.mensagem });
        controle.markAsTouched();
      } else {
        camposNaoMapeados.push(erroCampo.mensagem);
      }
    }

    if (problema.codigo !== 'VALIDACAO_INVALIDA' || camposNaoMapeados.length > 0 || problema.erros.length === 0) {
      this.erro.set(camposNaoMapeados[0] ?? mensagemDeErro(problema));
    }
  }

  private iniciarContagem(): void {
    this.pararContagem();
    this.segundosParaReenviar.set(SEGUNDOS_ENTRE_REENVIOS);
    this.temporizador = setInterval(() => {
      this.segundosParaReenviar.update((segundos) => Math.max(segundos - 1, 0));
      if (this.segundosParaReenviar() === 0) {
        this.pararContagem();
      }
    }, 1000);
  }

  private pararContagem(): void {
    if (this.temporizador !== null) {
      clearInterval(this.temporizador);
      this.temporizador = null;
    }
  }
}
