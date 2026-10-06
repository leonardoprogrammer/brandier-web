import { isPlatformBrowser } from '@angular/common';
import { Component, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthLayoutComponent } from '../../components/auth-layout/auth-layout.component';
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

type CampoRedefinicao = 'senha' | 'confirmarSenha';

@Component({
  selector: 'app-redefinir-senha',
  imports: [ReactiveFormsModule, RouterLink, AuthLayoutComponent, SenhaRequisitosComponent],
  templateUrl: './redefinir-senha.component.html',
})
export class RedefinirSenhaComponent implements OnInit {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly navegador = isPlatformBrowser(inject(PLATFORM_ID));
  private token: string | null = null;

  protected readonly form = this.formBuilder.group(
    {
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
    },
    { validators: senhasIguais('senha', 'confirmarSenha') },
  );

  protected readonly senhaDigitada = toSignal(this.form.controls.senha.valueChanges, { initialValue: '' });
  protected readonly linkIncompleto = signal(false);
  protected readonly linkInvalido = signal(false);
  protected readonly enviando = signal(false);
  protected readonly erro = signal<string | null>(null);
  protected readonly mostrarSenha = signal(false);
  protected readonly concluido = signal(false);

  ngOnInit(): void {
    if (!this.navegador) {
      return;
    }

    this.token = this.route.snapshot.queryParamMap.get('token');
    void this.router.navigate([], { queryParams: { token: null }, queryParamsHandling: 'merge', replaceUrl: true });

    if (!this.token) {
      this.linkIncompleto.set(true);
    }
  }

  protected redefinir(): void {
    if (this.form.invalid || this.token === null) {
      this.form.markAllAsTouched();
      return;
    }

    this.enviando.set(true);
    this.erro.set(null);
    this.auth
      .redefinirSenha(this.token, this.form.getRawValue().senha)
      .pipe(finalize(() => this.enviando.set(false)))
      .subscribe({
        next: () => this.concluido.set(true),
        error: (erro: unknown) => this.tratarErro(erro),
      });
  }

  protected alternarSenha(): void {
    this.mostrarSenha.update((visivel) => !visivel);
  }

  protected mensagemDoCampo(campo: CampoRedefinicao): string | null {
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

  private mensagemDeValidacao(campo: CampoRedefinicao): string {
    const controle = this.form.controls[campo];
    if (controle.hasError('required')) {
      return campo === 'senha' ? 'Informe a nova senha.' : 'Confirme a nova senha.';
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

  private tratarErro(erro: unknown): void {
    const problema = extrairProblema(erro);

    if (problema.codigo === 'TOKEN_REDEFINICAO_INVALIDO') {
      this.linkInvalido.set(true);
      this.erro.set(problema.mensagem);
      return;
    }

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
}
