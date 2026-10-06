import { Component, OnInit, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';

import { extrairProblema, mensagemDeErro } from '../../core/api-error';
import { VinculoPromotor } from '../../models/promotor.model';
import { PromotorService } from '../../services/promotor.service';

@Component({
  selector: 'app-promotor-vinculos',
  templateUrl: './promotor-vinculos.component.html',
})
export class PromotorVinculosComponent implements OnInit {
  private readonly promotorService = inject(PromotorService);

  protected readonly vinculos = signal<VinculoPromotor[]>([]);
  protected readonly carregando = signal(true);
  protected readonly falhou = signal(false);
  protected readonly confirmando = signal<string | null>(null);
  protected readonly saindo = signal<string | null>(null);
  protected readonly erroSaida = signal<string | null>(null);

  ngOnInit(): void {
    this.carregar();
  }

  protected carregar(): void {
    this.carregando.set(true);
    this.falhou.set(false);
    this.promotorService
      .meusVinculos()
      .pipe(finalize(() => this.carregando.set(false)))
      .subscribe({
        next: (resposta) => this.vinculos.set(resposta.vinculos),
        error: () => this.falhou.set(true),
      });
  }

  protected pedirConfirmacao(marcaId: string): void {
    this.erroSaida.set(null);
    this.confirmando.set(marcaId);
  }

  protected cancelarConfirmacao(): void {
    this.confirmando.set(null);
  }

  protected sair(vinculo: VinculoPromotor): void {
    this.saindo.set(vinculo.marcaId);
    this.erroSaida.set(null);
    this.promotorService
      .sair(vinculo.marcaId)
      .pipe(finalize(() => this.saindo.set(null)))
      .subscribe({
        next: () => {
          this.vinculos.update((lista) => lista.filter((item) => item.marcaId !== vinculo.marcaId));
          this.confirmando.set(null);
        },
        error: (erro: unknown) => this.erroSaida.set(mensagemDeErro(extrairProblema(erro))),
      });
  }

  protected formatarData(iso: string): string {
    return new Date(iso).toLocaleDateString('pt-BR');
  }
}
