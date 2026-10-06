import { Component, computed, input } from '@angular/core';

export interface ItemDoRanking {
  id: string;
  nome: string;
  valor: number;
  detalhe?: string;
}

@Component({
  selector: 'app-ranking',
  templateUrl: './ranking.component.html',
})
export class RankingComponent {
  readonly titulo = input.required<string>();
  readonly itens = input.required<ItemDoRanking[]>();
  readonly unidade = input<string>('un.');
  readonly limite = input<number>(5);

  protected readonly visiveis = computed(() => this.itens().slice(0, this.limite()));
  protected readonly maximo = computed(() => Math.max(1, ...this.visiveis().map((item) => item.valor)));

  protected largura(valor: number): number {
    return Math.max(2, Math.round((valor / this.maximo()) * 100));
  }
}
