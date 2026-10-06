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
  protected readonly erroExclusao = signal<string | null>(null);

  protected readonly atingiuLimite = computed(() => this.produtos().length >= this.limite());

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
    this.confirmandoExclusao.set(id);
  }

  protected cancelarExclusao(): void {
    this.confirmandoExclusao.set(null);
  }

  protected excluir(produto: Produto): void {
    this.excluindo.set(produto.id);
    this.erroExclusao.set(null);
    this.produtoService
      .excluir(this.marcaId, produto.id)
      .pipe(finalize(() => this.excluindo.set(null)))
      .subscribe({
        next: () => {
          this.produtos.update((lista) => lista.filter((item) => item.id !== produto.id));
          this.confirmandoExclusao.set(null);
        },
        error: (erro: unknown) => this.erroExclusao.set(mensagemDeErro(extrairProblema(erro))),
      });
  }
}
