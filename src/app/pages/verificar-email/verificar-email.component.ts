import { isPlatformBrowser } from '@angular/common';
import { Component, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthLayoutComponent } from '../../components/auth-layout/auth-layout.component';
import { extrairProblema, mensagemDeErro } from '../../core/api-error';
import { AuthService } from '../../services/auth.service';

type EstadoVerificacao = 'verificando' | 'sucesso' | 'erro';

@Component({
  selector: 'app-verificar-email',
  imports: [ReactiveFormsModule, RouterLink, AuthLayoutComponent],
  templateUrl: './verificar-email.component.html',
})
export class VerificarEmailComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly navegador = isPlatformBrowser(inject(PLATFORM_ID));

  protected readonly estado = signal<EstadoVerificacao>('verificando');
  protected readonly mensagem = signal<string | null>(null);
  protected readonly email = new FormControl('', {
    nonNullable: true,
    validators: [Validators.required, Validators.email, Validators.maxLength(254)],
  });
  protected readonly reenviando = signal(false);
  protected readonly reenvioConfirmado = signal(false);
  protected readonly erroReenvio = signal<string | null>(null);

  ngOnInit(): void {
    if (!this.navegador) {
      return;
    }

    const token = this.route.snapshot.queryParamMap.get('token');
    void this.router.navigate([], { queryParams: { token: null }, queryParamsHandling: 'merge', replaceUrl: true });

    if (!token) {
      this.estado.set('erro');
      this.mensagem.set('O link de verificação está incompleto.');
      return;
    }

    this.auth.verificarEmail(token).subscribe({
      next: (resposta) => {
        this.mensagem.set(resposta.message);
        this.estado.set('sucesso');
      },
      error: (erro: unknown) => {
        this.mensagem.set(mensagemDeErro(extrairProblema(erro)));
        this.estado.set('erro');
      },
    });
  }

  protected reenviar(evento: Event): void {
    evento.preventDefault();
    if (this.email.invalid) {
      this.email.markAsTouched();
      return;
    }

    this.reenviando.set(true);
    this.erroReenvio.set(null);
    this.auth
      .reenviarVerificacao(this.email.value.trim())
      .pipe(finalize(() => this.reenviando.set(false)))
      .subscribe({
        next: () => this.reenvioConfirmado.set(true),
        error: (erro: unknown) => this.erroReenvio.set(mensagemDeErro(extrairProblema(erro))),
      });
  }

  protected mensagemDoEmail(): string | null {
    if (!this.email.touched || this.email.valid) {
      return null;
    }
    return this.email.hasError('required') ? 'Informe seu e-mail.' : 'Informe um e-mail válido.';
  }
}
