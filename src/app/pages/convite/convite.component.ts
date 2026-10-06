import { isPlatformBrowser } from '@angular/common';
import { Component, OnInit, PLATFORM_ID, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { AuthLayoutComponent } from '../../components/auth-layout/auth-layout.component';
import { extrairProblema, mensagemDeErro } from '../../core/api-error';
import { ConviteRecebido, VinculoPromotor } from '../../models/promotor.model';
import { AuthService } from '../../services/auth.service';
import { ConviteService } from '../../services/convite.service';

type EstadoConvite = 'carregando' | 'sem-sessao' | 'pronto' | 'aceito' | 'recusado' | 'erro';

@Component({
  selector: 'app-convite',
  imports: [RouterLink, AuthLayoutComponent],
  templateUrl: './convite.component.html',
})
export class ConviteComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly conviteService = inject(ConviteService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly navegador = isPlatformBrowser(inject(PLATFORM_ID));

  private token = '';

  protected readonly estado = signal<EstadoConvite>('carregando');
  protected readonly convite = signal<ConviteRecebido | null>(null);
  protected readonly vinculo = signal<VinculoPromotor | null>(null);
  protected readonly erro = signal<string | null>(null);
  protected readonly respondendo = signal(false);

  ngOnInit(): void {
    if (!this.navegador) {
      return;
    }

    this.token = this.route.snapshot.queryParamMap.get('token') ?? '';
    if (!this.token) {
      this.falhar('O link do convite está incompleto.');
      return;
    }

    if (!this.auth.autenticado()) {
      this.estado.set('sem-sessao');
      return;
    }

    void this.router.navigate([], { queryParams: { token: null }, queryParamsHandling: 'merge', replaceUrl: true });
    this.conviteService.consultar(this.token).subscribe({
      next: (recebido) => {
        this.convite.set(recebido);
        this.estado.set('pronto');
      },
      error: (erro: unknown) => this.falhar(mensagemDeErro(extrairProblema(erro))),
    });
  }

  protected aceitar(): void {
    this.respondendo.set(true);
    this.conviteService
      .aceitar(this.token)
      .pipe(finalize(() => this.respondendo.set(false)))
      .subscribe({
        next: (vinculo) => {
          this.vinculo.set(vinculo);
          this.estado.set('aceito');
        },
        error: (erro: unknown) => this.falhar(mensagemDeErro(extrairProblema(erro))),
      });
  }

  protected recusar(): void {
    this.respondendo.set(true);
    this.conviteService
      .recusar(this.token)
      .pipe(finalize(() => this.respondendo.set(false)))
      .subscribe({
        next: () => this.estado.set('recusado'),
        error: (erro: unknown) => this.falhar(mensagemDeErro(extrairProblema(erro))),
      });
  }

  protected formatarData(iso: string): string {
    return new Date(iso).toLocaleDateString('pt-BR');
  }

  protected titulo(): string {
    switch (this.estado()) {
      case 'pronto':
        return 'Convite para ser promotor';
      case 'aceito':
        return 'Convite aceito';
      case 'recusado':
        return 'Convite recusado';
      case 'sem-sessao':
        return 'Convite para ser promotor';
      case 'erro':
        return 'Não foi possível abrir o convite';
      default:
        return 'Abrindo o convite';
    }
  }

  private falhar(mensagem: string): void {
    this.erro.set(mensagem);
    this.estado.set('erro');
  }
}
