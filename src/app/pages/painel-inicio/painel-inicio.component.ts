import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { ConvitesRecebidosComponent } from '../../components/convites-recebidos/convites-recebidos.component';
import { ItemDoRanking, RankingComponent } from '../../components/ranking/ranking.component';
import { SeletorPeriodoComponent } from '../../components/seletor-periodo/seletor-periodo.component';
import { formatarDataHora } from '../../core/data-hora';
import { DIAS_PADRAO_DO_PERIODO, ultimosDias } from '../../core/periodo';
import { Agregado, PainelAutor, PainelGestor, Periodo } from '../../models/painel.model';
import { AuthService } from '../../services/auth.service';
import { PainelService } from '../../services/painel.service';

@Component({
  selector: 'app-painel-inicio',
  imports: [RouterLink, ConvitesRecebidosComponent, RankingComponent, SeletorPeriodoComponent],
  templateUrl: './painel-inicio.component.html',
})
export class PainelInicioComponent implements OnInit {
  private readonly auth = inject(AuthService);
  private readonly painelService = inject(PainelService);

  protected readonly usuario = this.auth.usuario;
  protected readonly formatarDataHora = formatarDataHora;

  protected readonly periodo = signal<Periodo>(ultimosDias(DIAS_PADRAO_DO_PERIODO));
  protected readonly autor = signal<PainelAutor | null>(null);
  protected readonly gestor = signal<PainelGestor | null>(null);
  protected readonly carregandoAutor = signal(true);
  protected readonly carregandoGestor = signal(true);
  protected readonly falhouAutor = signal(false);
  protected readonly falhouGestor = signal(false);

  protected readonly temReposicoes = computed(() => this.autor()?.possuiReposicoes === true);
  protected readonly temMarcas = computed(() => (this.gestor()?.marcas.length ?? 0) > 0);
  protected readonly primeiraCarga = computed(
    () => (this.carregandoAutor() && !this.autor() && !this.falhouAutor()) || (this.carregandoGestor() && !this.gestor() && !this.falhouGestor()),
  );
  protected readonly marcasComoPromotor = computed(() => this.autor()?.marcasComoPromotor ?? 0);
  protected readonly semVinculos = computed(
    () => this.autor() !== null && this.gestor() !== null && !this.temReposicoes() && !this.temMarcas(),
  );
  protected readonly semNada = computed(() => this.semVinculos() && this.marcasComoPromotor() === 0);
  protected readonly soPromotor = computed(() => this.semVinculos() && this.marcasComoPromotor() > 0);
  protected readonly mostrarAutor = computed(() => this.temReposicoes() || this.falhouAutor());
  protected readonly mostrarGestor = computed(() => this.temMarcas() || this.falhouGestor());

  ngOnInit(): void {
    this.carregar();
  }

  protected alterarPeriodo(periodo: Periodo): void {
    this.periodo.set(periodo);
    this.carregar();
  }

  protected carregar(): void {
    this.carregarAutor();
    this.carregarGestor();
  }

  protected carregarAutor(): void {
    this.carregandoAutor.set(true);
    this.falhouAutor.set(false);
    this.painelService
      .minhasReposicoes(this.periodo())
      .pipe(finalize(() => this.carregandoAutor.set(false)))
      .subscribe({
        next: (painel) => this.autor.set(painel),
        error: () => this.falhouAutor.set(true),
      });
  }

  protected carregarGestor(): void {
    this.carregandoGestor.set(true);
    this.falhouGestor.set(false);
    this.painelService
      .gestor(this.periodo())
      .pipe(finalize(() => this.carregandoGestor.set(false)))
      .subscribe({
        next: (painel) => this.gestor.set(painel),
        error: () => this.falhouGestor.set(true),
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
}
