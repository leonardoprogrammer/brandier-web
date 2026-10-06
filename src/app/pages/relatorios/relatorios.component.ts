import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize, forkJoin, of } from 'rxjs';

import { SeletorPeriodoComponent } from '../../components/seletor-periodo/seletor-periodo.component';
import { formatarDataHora } from '../../core/data-hora';
import { DIAS_PADRAO_DO_PERIODO, ultimosDias } from '../../core/periodo';
import { Loja } from '../../models/loja.model';
import { Periodo } from '../../models/painel.model';
import { Produto } from '../../models/produto.model';
import { CampoDeOrdenacao, FiltroDoRelatorio, Relatorio, Reposicao } from '../../models/reposicao.model';
import { AuthService } from '../../services/auth.service';
import { LojaService } from '../../services/loja.service';
import { MarcaService } from '../../services/marca.service';
import { ProdutoService } from '../../services/produto.service';
import { PromotorService } from '../../services/promotor.service';
import { MAXIMO_DE_REPOSICOES_NO_CSV, RelatorioService } from '../../services/relatorio.service';

const TAMANHO_DA_PAGINA = 20;

export interface OpcaoDeMarca {
  id: string;
  nome: string;
  gestor: boolean;
}

export interface OpcaoDeAutor {
  id: string;
  nome: string;
}

@Component({
  selector: 'app-relatorios',
  imports: [RouterLink, SeletorPeriodoComponent],
  templateUrl: './relatorios.component.html',
})
export class RelatoriosComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);
  private readonly marcaService = inject(MarcaService);
  private readonly promotorService = inject(PromotorService);
  private readonly lojaService = inject(LojaService);
  private readonly produtoService = inject(ProdutoService);
  private readonly relatorioService = inject(RelatorioService);

  protected readonly formatarDataHora = formatarDataHora;
  protected readonly maximoNoCsv = MAXIMO_DE_REPOSICOES_NO_CSV;

  protected readonly marcas = signal<OpcaoDeMarca[]>([]);
  protected readonly marcaId = signal('');
  protected readonly lojas = signal<Loja[]>([]);
  protected readonly produtos = signal<Produto[]>([]);
  protected readonly autores = signal<OpcaoDeAutor[]>([]);
  protected readonly filtro = signal<FiltroDoRelatorio>(this.filtroInicial());
  protected readonly dados = signal<Relatorio | null>(null);

  protected readonly carregandoMarcas = signal(true);
  protected readonly falhouMarcas = signal(false);
  protected readonly carregandoContexto = signal(false);
  protected readonly falhouContexto = signal(false);
  protected readonly carregando = signal(false);
  protected readonly falhou = signal(false);

  protected readonly ehGestor = computed(() => this.marcas().find((marca) => marca.id === this.marcaId())?.gestor ?? false);
  protected readonly urlDoCsv = computed(() =>
    this.marcaId() ? this.relatorioService.urlDoCsv(this.marcaId(), this.filtro()) : '',
  );
  protected readonly exportacaoPermitida = computed(() => {
    const atual = this.dados();
    return atual !== null && atual.totalElementos > 0 && atual.totalElementos <= MAXIMO_DE_REPOSICOES_NO_CSV;
  });
  protected readonly grandeDemaisParaExportar = computed(
    () => (this.dados()?.totalElementos ?? 0) > MAXIMO_DE_REPOSICOES_NO_CSV,
  );

  ngOnInit(): void {
    this.carregarMarcas();
  }

  protected carregarMarcas(): void {
    this.carregandoMarcas.set(true);
    this.falhouMarcas.set(false);
    forkJoin({ geridas: this.marcaService.listar(), vinculos: this.promotorService.meusVinculos() })
      .pipe(finalize(() => this.carregandoMarcas.set(false)))
      .subscribe({
        next: ({ geridas, vinculos }) => {
          const porId = new Map<string, OpcaoDeMarca>();
          vinculos.vinculos.forEach((vinculo) =>
            porId.set(vinculo.marcaId, { id: vinculo.marcaId, nome: vinculo.marcaNome, gestor: false }),
          );
          geridas.marcas.forEach((marca) => porId.set(marca.id, { id: marca.id, nome: marca.nome, gestor: true }));
          const opcoes = [...porId.values()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
          this.marcas.set(opcoes);

          const sugerida = this.route.snapshot.queryParamMap.get('marca');
          const inicial = opcoes.find((marca) => marca.id === sugerida) ?? (opcoes.length === 1 ? opcoes[0] : null);
          if (inicial) {
            this.selecionarMarca(inicial.id);
          }
        },
        error: () => this.falhouMarcas.set(true),
      });
  }

  protected selecionarMarca(marcaId: string): void {
    this.marcaId.set(marcaId);
    this.filtro.update((atual) => ({ ...atual, lojaId: '', autorId: '', produtoId: '' }));
    this.lojas.set([]);
    this.produtos.set([]);
    this.autores.set([]);
    this.dados.set(null);
    if (marcaId) {
      this.carregarContexto();
    }
  }

  protected carregarContexto(): void {
    const marcaId = this.marcaId();
    this.carregandoContexto.set(true);
    this.falhouContexto.set(false);
    forkJoin({
      lojas: this.lojaService.listar(marcaId),
      produtos: this.produtoService.listar(marcaId),
      promotores: this.ehGestor() ? this.promotorService.listar(marcaId) : of(null),
    })
      .pipe(finalize(() => this.carregandoContexto.set(false)))
      .subscribe({
        next: ({ lojas, produtos, promotores }) => {
          this.lojas.set(lojas.lojas);
          this.produtos.set(produtos.produtos);
          if (promotores) {
            const eu = this.auth.usuario();
            const lista: OpcaoDeAutor[] = promotores.promotores.map((promotor) => ({ id: promotor.usuarioId, nome: promotor.nome }));
            if (eu) {
              lista.unshift({ id: eu.id, nome: `${eu.nome} (você)` });
            }
            this.autores.set(lista);
          }
          this.consultar(0);
        },
        error: () => this.falhouContexto.set(true),
      });
  }

  protected alterarFiltro(campo: 'lojaId' | 'autorId' | 'produtoId', valor: string): void {
    this.filtro.update((atual) => ({ ...atual, [campo]: valor }));
    this.consultar(0);
  }

  protected alterarPeriodo(periodo: Periodo): void {
    this.filtro.update((atual) => ({ ...atual, de: periodo.de, ate: periodo.ate }));
    this.consultar(0);
  }

  protected removerPeriodo(): void {
    this.filtro.update((atual) => ({ ...atual, de: null, ate: null }));
    this.consultar(0);
  }

  protected ordenarPor(campo: CampoDeOrdenacao): void {
    this.filtro.update((atual) => ({
      ...atual,
      ordenar: campo,
      direcao: atual.ordenar === campo ? (atual.direcao === 'asc' ? 'desc' : 'asc') : campo === 'data' ? 'desc' : 'asc',
    }));
    this.consultar(0);
  }

  protected sentidoDe(campo: CampoDeOrdenacao): 'ascending' | 'descending' | 'none' {
    const atual = this.filtro();
    if (atual.ordenar !== campo) {
      return 'none';
    }
    return atual.direcao === 'asc' ? 'ascending' : 'descending';
  }

  protected consultar(pagina: number): void {
    this.carregando.set(true);
    this.falhou.set(false);
    this.relatorioService
      .consultar(this.marcaId(), this.filtro(), pagina, TAMANHO_DA_PAGINA)
      .pipe(finalize(() => this.carregando.set(false)))
      .subscribe({
        next: (relatorio) => this.dados.set(relatorio),
        error: () => this.falhou.set(true),
      });
  }

  protected paginaAnterior(): void {
    const atual = this.dados();
    if (atual && atual.pagina > 0) {
      this.consultar(atual.pagina - 1);
    }
  }

  protected proximaPagina(): void {
    const atual = this.dados();
    if (atual && atual.pagina + 1 < atual.totalPaginas) {
      this.consultar(atual.pagina + 1);
    }
  }

  protected resumoDosItens(reposicao: Reposicao): string {
    return reposicao.itens.map((item) => `${item.produtoNome} × ${item.quantidade}`).join(', ');
  }

  private filtroInicial(): FiltroDoRelatorio {
    const periodo = ultimosDias(DIAS_PADRAO_DO_PERIODO);
    return { lojaId: '', autorId: '', produtoId: '', de: periodo.de, ate: periodo.ate, ordenar: 'data', direcao: 'desc' };
  }
}
