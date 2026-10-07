import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';

import { extrairProblema, mensagemDeErro } from '../../core/api-error';
import { Produto } from '../../models/produto.model';
import { MarcaService } from '../../services/marca.service';
import { ProdutoService } from '../../services/produto.service';

@Component({
  selector: 'app-produtos',
  imports: [RouterLink],
  templateUrl: './produtos.component.html',
})
export class ProdutosComponent implements OnInit {
  private readonly produtoService = inject(ProdutoService);
  private readonly marcaService = inject(MarcaService);

  protected readonly marcaId = inject(ActivatedRoute).snapshot.paramMap.get('marcaId') ?? '';

  protected readonly marcaNome = signal('');
  protected readonly produtos = signal<Produto[]>([]);
  protected readonly limite = signal(0);
  protected readonly carregando = signal(true);
  protected readonly falhou = signal(false);
  protected readonly naoEncontrada = signal(false);
  protected readonly confirmandoExclusao = signal<string | null>(null);
  protected readonly excluindo = signal<string | null>(null);
  protected readonly reativando = signal<string | null>(null);
  protected readonly erroExclusao = signal<string | null>(null);
  protected readonly avisoInativacao = signal<string | null>(null);

  protected readonly ativos = computed(() => this.produtos().filter((produto) => produto.ativo).length);
  protected readonly atingiuLimite = computed(() => this.ativos() >= this.limite());

  ngOnInit(): void {
    this.carregar();
  }

  protected carregar(): void {
    this.carregando.set(true);
    this.falhou.set(false);
    this.naoEncontrada.set(false);
    forkJoin({ marca: this.marcaService.buscar(this.marcaId), resumo: this.produtoService.listar(this.marcaId) })
      .pipe(finalize(() => this.carregando.set(false)))
      .subscribe({
        next: ({ marca, resumo }) => {
          this.marcaNome.set(marca.nome);
          this.produtos.set(resumo.produtos);
          this.limite.set(resumo.limite);
        },
        error: (erro: unknown) => {
          if (extrairProblema(erro).status === 404) {
            this.naoEncontrada.set(true);
          } else {
            this.falhou.set(true);
          }
        },
      });
  }

  protected pedirConfirmacao(id: string): void {
    this.erroExclusao.set(null);
    this.avisoInativacao.set(null);
    this.confirmandoExclusao.set(id);
  }

  protected cancelarExclusao(): void {
    this.confirmandoExclusao.set(null);
  }

  protected excluir(produto: Produto): void {
    this.excluindo.set(produto.id);
    this.erroExclusao.set(null);
    this.avisoInativacao.set(null);
    this.produtoService
      .excluir(this.marcaId, produto.id)
      .pipe(finalize(() => this.excluindo.set(null)))
      .subscribe({
        next: (inativado) => {
          if (inativado) {
            this.substituir(inativado);
            this.avisoInativacao.set(
              `O produto ${inativado.nome} já tem reposições registradas e foi inativado em vez de excluído.`,
            );
          } else {
            this.produtos.update((lista) => lista.filter((item) => item.id !== produto.id));
          }
          this.confirmandoExclusao.set(null);
        },
        error: (erro: unknown) => this.erroExclusao.set(mensagemDeErro(extrairProblema(erro))),
      });
  }

  protected reativar(produto: Produto): void {
    this.reativando.set(produto.id);
    this.erroExclusao.set(null);
    this.avisoInativacao.set(null);
    this.produtoService
      .atualizar(this.marcaId, produto.id, { nome: produto.nome, codigo: produto.codigo ?? '', cor: produto.cor, ativo: true })
      .pipe(finalize(() => this.reativando.set(null)))
      .subscribe({
        next: (reativado) => this.substituir(reativado),
        error: (erro: unknown) => this.erroExclusao.set(mensagemDeErro(extrairProblema(erro))),
      });
  }

  private substituir(atualizado: Produto): void {
    this.produtos.update((lista) => lista.map((item) => (item.id === atualizado.id ? atualizado : item)));
  }
}
