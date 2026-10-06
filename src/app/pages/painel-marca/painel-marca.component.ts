import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { ItemDoRanking, RankingComponent } from '../../components/ranking/ranking.component';
import { SeletorPeriodoComponent } from '../../components/seletor-periodo/seletor-periodo.component';
import { extrairProblema } from '../../core/api-error';
import { DIAS_PADRAO_DO_PERIODO, ultimosDias } from '../../core/periodo';
import { Agregado, PainelMarca, Periodo } from '../../models/painel.model';
import { PainelService } from '../../services/painel.service';

@Component({
  selector: 'app-painel-marca',
  imports: [RouterLink, RankingComponent, SeletorPeriodoComponent],
  templateUrl: './painel-marca.component.html',
})
export class PainelMarcaComponent implements OnInit {
  private readonly painelService = inject(PainelService);

  protected readonly marcaId = inject(ActivatedRoute).snapshot.paramMap.get('marcaId') ?? '';

  protected readonly periodo = signal<Periodo>(ultimosDias(DIAS_PADRAO_DO_PERIODO));
  protected readonly painel = signal<PainelMarca | null>(null);
  protected readonly carregando = signal(true);
  protected readonly falhou = signal(false);
  protected readonly naoEncontrada = signal(false);

  ngOnInit(): void {
    this.carregar();
  }

  protected alterarPeriodo(periodo: Periodo): void {
    this.periodo.set(periodo);
    this.carregar();
  }

  protected carregar(): void {
    this.carregando.set(true);
    this.falhou.set(false);
    this.naoEncontrada.set(false);
    this.painelService
      .marca(this.marcaId, this.periodo())
      .pipe(finalize(() => this.carregando.set(false)))
      .subscribe({
        next: (resultado) => this.painel.set(resultado),
        error: (erro: unknown) => {
          if (extrairProblema(erro).status === 404) {
            this.naoEncontrada.set(true);
          } else {
            this.falhou.set(true);
          }
        },
      });
  }

  protected ranking(agregados: Agregado[]): ItemDoRanking[] {
    return agregados.map((item) => ({
      id: item.id,
      nome: item.nome,
      valor: item.unidades,
      detalhe: `${item.reposicoes} ${item.reposicoes === 1 ? 'reposição' : 'reposições'}`,
    }));
  }

  protected formatarData(iso: string): string {
    return new Date(iso).toLocaleDateString('pt-BR');
  }
}
