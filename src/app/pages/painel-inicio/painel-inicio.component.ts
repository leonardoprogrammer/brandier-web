import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { ConvitesRecebidosComponent } from '../../components/convites-recebidos/convites-recebidos.component';
import { ItemDoRanking, RankingComponent } from '../../components/ranking/ranking.component';
import { SeletorPeriodoComponent } from '../../components/seletor-periodo/seletor-periodo.component';
import { formatarDataHora } from '../../core/data-hora';
import { ultimosDias } from '../../core/periodo';
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

  protected readonly periodo = signal<Periodo>(ultimosDias(30));
  protected readonly autor = signal<PainelAutor | null>(null);
  protected readonly gestor = signal<PainelGestor | null>(null);
  protected readonly carregandoAutor = signal(true);
  protected readonly carregandoGestor = signal(true);
  protected readonly falhouAutor = signal(false);
  protected readonly falhouGestor = signal(false);

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
