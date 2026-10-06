import { Component, OnInit, inject, output, signal } from '@angular/core';
import { Observable, finalize } from 'rxjs';

import { extrairProblema, mensagemDeErro } from '../../core/api-error';
import { ConvitePendente } from '../../models/promotor.model';
import { ConviteService } from '../../services/convite.service';

export type RespostaAoConvite = 'aceito' | 'recusado';

@Component({
  selector: 'app-convites-recebidos',
  templateUrl: './convites-recebidos.component.html',
})
export class ConvitesRecebidosComponent implements OnInit {
  private readonly conviteService = inject(ConviteService);

  readonly respondido = output<RespostaAoConvite>();

  protected readonly convites = signal<ConvitePendente[]>([]);
  protected readonly falhou = signal(false);
  protected readonly respondendo = signal<string | null>(null);
  protected readonly erro = signal<string | null>(null);
  protected readonly confirmacao = signal<string | null>(null);

  ngOnInit(): void {
    this.carregar();
  }

  protected carregar(): void {
    this.falhou.set(false);
    this.conviteService.recebidos().subscribe({
      next: (resposta) => this.convites.set(resposta.convites),
      error: () => this.falhou.set(true),
    });
  }

  protected aceitar(convite: ConvitePendente): void {
    this.responder(convite, this.conviteService.aceitarPorId(convite.id), 'aceito', `Você agora é promotor da marca ${convite.marcaNome}.`);
  }

  protected recusar(convite: ConvitePendente): void {
    this.responder(convite, this.conviteService.recusarPorId(convite.id), 'recusado', `Convite da marca ${convite.marcaNome} recusado.`);
  }

  protected formatarData(iso: string): string {
    return new Date(iso).toLocaleDateString('pt-BR');
  }

  private responder(
    convite: ConvitePendente,
    requisicao: Observable<unknown>,
    resposta: RespostaAoConvite,
    mensagem: string,
  ): void {
    this.respondendo.set(convite.id);
    this.erro.set(null);
    this.confirmacao.set(null);
    requisicao.pipe(finalize(() => this.respondendo.set(null))).subscribe({
      next: () => {
        this.convites.update((lista) => lista.filter((item) => item.id !== convite.id));
        this.confirmacao.set(mensagem);
        this.respondido.emit(resposta);
      },
      error: (erro: unknown) => {
        this.erro.set(mensagemDeErro(extrairProblema(erro)));
        this.carregar();
      },
    });
  }
}
