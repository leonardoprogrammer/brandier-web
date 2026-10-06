import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { extrairProblema, mensagemDeErro } from '../../core/api-error';
import { formatarDataHora } from '../../core/data-hora';
import { Pagina, Reposicao } from '../../models/reposicao.model';
import { ReposicaoService } from '../../services/reposicao.service';

const TAMANHO_DA_PAGINA = 10;

@Component({
  selector: 'app-reposicoes',
  imports: [RouterLink],
  templateUrl: './reposicoes.component.html',
})
export class ReposicoesComponent implements OnInit {
  private readonly reposicaoService = inject(ReposicaoService);

  protected readonly marcaId = inject(ActivatedRoute).snapshot.paramMap.get('marcaId');
  protected readonly daMarca = this.marcaId !== null;

  protected readonly dados = signal<Pagina<Reposicao> | null>(null);
  protected readonly carregando = signal(true);
  protected readonly falhou = signal(false);
  protected readonly naoEncontrada = signal(false);
  protected readonly confirmando = signal<string | null>(null);
  protected readonly excluindo = signal<string | null>(null);
  protected readonly erroExclusao = signal<string | null>(null);

  protected readonly marcaNome = computed(() => this.dados()?.conteudo[0]?.marcaNome ?? '');
  protected readonly linkNova = computed(() => (this.marcaId ? { marca: this.marcaId } : {}));
  protected readonly formatarDataHora = formatarDataHora;

  ngOnInit(): void {
    this.carregar(0);
  }

  protected carregar(pagina: number): void {
    this.carregando.set(true);
    this.falhou.set(false);
    this.naoEncontrada.set(false);
    const requisicao =
      this.marcaId === null
        ? this.reposicaoService.listarMinhas(pagina, TAMANHO_DA_PAGINA)
        : this.reposicaoService.listarDaMarca(this.marcaId, pagina, TAMANHO_DA_PAGINA);

    requisicao.pipe(finalize(() => this.carregando.set(false))).subscribe({
      next: (resultado) => this.dados.set(resultado),
      error: (erro: unknown) => {
        if (extrairProblema(erro).status === 404) {
          this.naoEncontrada.set(true);
        } else {
          this.falhou.set(true);
        }
      },
    });
  }

  protected paginaAnterior(): void {
    const atual = this.dados();
    if (atual && atual.pagina > 0) {
      this.carregar(atual.pagina - 1);
    }
  }

  protected proximaPagina(): void {
    const atual = this.dados();
    if (atual && atual.pagina + 1 < atual.totalPaginas) {
      this.carregar(atual.pagina + 1);
    }
  }

  protected pedirConfirmacao(id: string): void {
    this.erroExclusao.set(null);
    this.confirmando.set(id);
  }

  protected cancelarExclusao(): void {
    this.confirmando.set(null);
  }

  protected excluir(reposicao: Reposicao): void {
    this.excluindo.set(reposicao.id);
    this.erroExclusao.set(null);
    this.reposicaoService
      .excluir(reposicao.marcaId, reposicao.id)
      .pipe(finalize(() => this.excluindo.set(null)))
      .subscribe({
        next: () => {
          this.confirmando.set(null);
          const atual = this.dados();
          const ultimaDaPagina = atual !== null && atual.conteudo.length === 1 && atual.pagina > 0;
          this.carregar(ultimaDaPagina ? atual.pagina - 1 : (atual?.pagina ?? 0));
        },
        error: (erro: unknown) => this.erroExclusao.set(mensagemDeErro(extrairProblema(erro))),
      });
  }

  protected resumoDosItens(reposicao: Reposicao): string {
    return reposicao.itens.map((item) => `${item.produtoNome} × ${item.quantidade}`).join(', ');
  }

  protected prazoEncerrado(reposicao: Reposicao): boolean {
    return !reposicao.podeEditar && reposicao.editavelAte !== null;
  }
}
