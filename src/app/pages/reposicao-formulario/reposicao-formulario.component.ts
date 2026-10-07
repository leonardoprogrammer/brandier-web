import { Component, DestroyRef, OnInit, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import {
  AbstractControl,
  FormArray,
  FormControl,
  FormGroup,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize, forkJoin } from 'rxjs';

import { extrairProblema, mensagemDeErro } from '../../core/api-error';
import { deCampoLocal, formatarDataHora, paraCampoLocal } from '../../core/data-hora';
import { Loja } from '../../models/loja.model';
import { Reposicao } from '../../models/reposicao.model';
import { LojaService } from '../../services/loja.service';
import { MarcaService } from '../../services/marca.service';
import { ProdutoService } from '../../services/produto.service';
import { PromotorService } from '../../services/promotor.service';
import { ReposicaoService } from '../../services/reposicao.service';

const OBSERVACOES_TAMANHO_MAXIMO = 1000;
const QUANTIDADE_MAXIMA = 1_000_000;
const TOLERANCIA_DE_RELOGIO_EM_MS = 60_000;

export interface OpcaoMarca {
  id: string;
  nome: string;
}

export interface OpcaoProduto {
  id: string;
  nome: string;
  cor: string | null;
}

type ItemForm = FormGroup<{ produtoId: FormControl<string>; quantidade: FormControl<number | null> }>;

function dataNaoFutura(controle: AbstractControl): ValidationErrors | null {
  const valor = controle.value as string;
  if (!valor) {
    return null;
  }
  const data = deCampoLocal(valor);
  if (data === null) {
    return { dataInvalida: true };
  }
  return data.getTime() > Date.now() + TOLERANCIA_DE_RELOGIO_EM_MS ? { dataFutura: true } : null;
}

function quantidadeInteira(controle: AbstractControl): ValidationErrors | null {
  const valor = controle.value as number | null;
  return valor !== null && !Number.isInteger(valor) ? { inteiro: true } : null;
}

function semProdutoRepetido(controle: AbstractControl): ValidationErrors | null {
  const ids = (controle as FormArray<ItemForm>).controls
    .map((item) => item.controls.produtoId.value)
    .filter((id) => id !== '');
  return new Set(ids).size === ids.length ? null : { produtoRepetido: true };
}

@Component({
  selector: 'app-reposicao-formulario',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './reposicao-formulario.component.html',
})
export class ReposicaoFormularioComponent implements OnInit {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly reposicaoService = inject(ReposicaoService);
  private readonly marcaService = inject(MarcaService);
  private readonly promotorService = inject(PromotorService);
  private readonly lojaService = inject(LojaService);
  private readonly produtoService = inject(ProdutoService);
  private readonly destroyRef = inject(DestroyRef);

  private readonly marcaIdDaRota = this.route.snapshot.paramMap.get('marcaId');
  private readonly id = this.route.snapshot.paramMap.get('id');

  protected readonly edicao = this.id !== null;
  protected readonly quantidadeMaxima = QUANTIDADE_MAXIMA;
  protected readonly observacoesTamanhoMaximo = OBSERVACOES_TAMANHO_MAXIMO;
  protected readonly formatarDataHora = formatarDataHora;

  protected readonly form = this.formBuilder.group({
    marcaId: ['', [Validators.required]],
    lojaId: ['', [Validators.required]],
    repostoEm: [paraCampoLocal(new Date()), [Validators.required, dataNaoFutura]],
    observacoes: ['', [Validators.maxLength(OBSERVACOES_TAMANHO_MAXIMO)]],
    itens: this.formBuilder.array<ItemForm>([], [Validators.required, semProdutoRepetido]),
  });

  protected readonly marcas = signal<OpcaoMarca[]>([]);
  protected readonly lojas = signal<Loja[]>([]);
  protected readonly produtos = signal<OpcaoProduto[]>([]);
  protected readonly reposicao = signal<Reposicao | null>(null);
  protected readonly carregando = signal(true);
  protected readonly carregandoContexto = signal(false);
  protected readonly falhou = signal(false);
  protected readonly falhouContexto = signal(false);
  protected readonly naoEncontrada = signal(false);
  protected readonly enviando = signal(false);
  protected readonly erro = signal<string | null>(null);
  protected readonly tentouEnviar = signal(false);

  protected readonly marcaSelecionada = signal('');
  protected readonly nomeDaMarca = computed(() => {
    const atual = this.reposicao();
    if (atual) {
      return atual.marcaNome;
    }
    return this.marcas().find((marca) => marca.id === this.marcaSelecionada())?.nome ?? '';
  });
  protected readonly prazoEncerrado = computed(() => {
    const atual = this.reposicao();
    return atual !== null && !atual.podeEditar;
  });

  protected get itens(): FormArray<ItemForm> {
    return this.form.controls.itens;
  }

  ngOnInit(): void {
    if (this.edicao) {
      this.carregarEdicao();
      return;
    }

    this.form.controls.marcaId.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((marcaId) => this.aoTrocarMarca(marcaId));
    this.carregarMarcas();
  }

  protected recarregar(): void {
    this.carregando.set(true);
    this.falhou.set(false);
    if (this.edicao) {
      this.carregarEdicao();
    } else {
      this.carregarMarcas();
    }
  }

  private aoTrocarMarca(marcaId: string): void {
    this.marcaSelecionada.set(marcaId);
    this.form.controls.lojaId.reset('');
    this.itens.clear();
    this.lojas.set([]);
    this.produtos.set([]);
    if (marcaId) {
      this.carregarContexto(marcaId, []);
    }
  }

  protected recarregarContexto(): void {
    const marcaId = this.marcaSelecionada();
    if (marcaId) {
      this.carregarContexto(marcaId, this.opcoesDosItensExistentes());
    }
  }

  protected adicionarItem(): void {
    this.itens.push(this.novoItem('', 1));
    this.itens.markAsDirty();
  }

  protected removerItem(indice: number): void {
    this.itens.removeAt(indice);
    this.itens.markAsDirty();
  }

  protected produtosDisponiveis(indice: number): OpcaoProduto[] {
    const escolhidosNosOutros = new Set(
      this.itens.controls
        .filter((_, posicao) => posicao !== indice)
        .map((item) => item.controls.produtoId.value),
    );
    return this.produtos().filter((produto) => !escolhidosNosOutros.has(produto.id));
  }

  protected corDoItem(indice: number): string | null {
    const produtoId = this.itens.at(indice).controls.produtoId.value;
    if (!produtoId) {
      return null;
    }
    return this.produtos().find((produto) => produto.id === produtoId)?.cor ?? null;
  }

  protected podeAdicionarItem(): boolean {
    const usados = new Set(this.itens.controls.map((item) => item.controls.produtoId.value));
    return this.produtos().some((produto) => !usados.has(produto.id));
  }

  protected totalDeUnidades(): number {
    return this.itens.controls.reduce((soma, item) => {
      const quantidade = item.controls.quantidade.value;
      return soma + (quantidade !== null && Number.isInteger(quantidade) && quantidade > 0 ? quantidade : 0);
    }, 0);
  }

  protected salvar(): void {
    this.tentouEnviar.set(true);
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      return;
    }

    const valores = this.form.getRawValue();
    const data = deCampoLocal(valores.repostoEm);
    if (data === null) {
      return;
    }

    const dados = {
      lojaId: valores.lojaId,
      repostoEm: data.toISOString(),
      itens: valores.itens.map((item) => ({ produtoId: item.produtoId, quantidade: item.quantidade as number })),
      observacoes: valores.observacoes.trim(),
    };
    const marcaId = this.edicao ? (this.marcaIdDaRota as string) : valores.marcaId;
    const requisicao =
      this.id === null
        ? this.reposicaoService.criar(marcaId, dados)
        : this.reposicaoService.atualizar(marcaId, this.id, dados);

    this.enviando.set(true);
    this.erro.set(null);
    requisicao.pipe(finalize(() => this.enviando.set(false))).subscribe({
      next: () => void this.router.navigate(['/painel/reposicoes']),
      error: (erro: unknown) => this.erro.set(mensagemDeErro(extrairProblema(erro))),
    });
  }

  protected erroDoCampo(campo: 'marcaId' | 'lojaId' | 'repostoEm' | 'observacoes'): string | null {
    const controle = this.form.controls[campo];
    if (!controle.touched || controle.valid) {
      return null;
    }
    if (controle.hasError('required')) {
      return { marcaId: 'Selecione a marca.', lojaId: 'Selecione a loja.', repostoEm: 'Informe a data e a hora.', observacoes: '' }[campo];
    }
    if (controle.hasError('dataFutura')) {
      return 'A data da reposição não pode estar no futuro.';
    }
    if (controle.hasError('dataInvalida')) {
      return 'Informe uma data e hora válidas.';
    }
    if (controle.hasError('maxlength')) {
      return `As observações devem ter no máximo ${OBSERVACOES_TAMANHO_MAXIMO} caracteres.`;
    }
    return 'Valor inválido.';
  }

  protected erroDoItem(indice: number, campo: 'produtoId' | 'quantidade'): string | null {
    const controle = this.itens.at(indice).controls[campo];
    if (!controle.touched || controle.valid) {
      return null;
    }
    if (campo === 'produtoId') {
      return 'Selecione o produto.';
    }
    if (controle.hasError('required')) {
      return 'Informe a quantidade.';
    }
    if (controle.hasError('inteiro')) {
      return 'Use um número inteiro.';
    }
    if (controle.hasError('min')) {
      return 'A quantidade deve ser maior que zero.';
    }
    return `A quantidade deve ser no máximo ${QUANTIDADE_MAXIMA.toLocaleString('pt-BR')}.`;
  }

  protected erroDosItens(): string | null {
    if (!this.tentouEnviar() && !this.itens.touched) {
      return null;
    }
    if (this.itens.hasError('required')) {
      return 'Adicione ao menos um produto.';
    }
    if (this.itens.hasError('produtoRepetido')) {
      return 'O mesmo produto não pode aparecer duas vezes.';
    }
    return null;
  }

  private carregarMarcas(): void {
    forkJoin({ geridas: this.marcaService.listar(), vinculos: this.promotorService.meusVinculos() })
      .pipe(finalize(() => this.carregando.set(false)))
      .subscribe({
        next: ({ geridas, vinculos }) => {
          const porId = new Map<string, OpcaoMarca>();
          geridas.marcas.forEach((marca) => porId.set(marca.id, { id: marca.id, nome: marca.nome }));
          vinculos.vinculos
            .filter((vinculo) => vinculo.marcaAtiva)
            .forEach((vinculo) => porId.set(vinculo.marcaId, { id: vinculo.marcaId, nome: vinculo.marcaNome }));
          const opcoes = [...porId.values()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
          this.marcas.set(opcoes);

          const sugerida = this.route.snapshot.queryParamMap.get('marca');
          const inicial = opcoes.find((marca) => marca.id === sugerida) ?? (opcoes.length === 1 ? opcoes[0] : null);
          if (inicial) {
            this.form.controls.marcaId.setValue(inicial.id);
          }
        },
        error: () => this.falhou.set(true),
      });
  }

  private carregarEdicao(): void {
    const marcaId = this.marcaIdDaRota as string;
    this.reposicaoService
      .buscar(marcaId, this.id as string)
      .pipe(finalize(() => this.carregando.set(false)))
      .subscribe({
        next: (reposicao) => {
          this.reposicao.set(reposicao);
          this.marcaSelecionada.set(marcaId);
          this.form.controls.marcaId.setValue(marcaId, { emitEvent: false });
          this.form.controls.repostoEm.setValue(paraCampoLocal(new Date(reposicao.repostoEm)));
          this.form.controls.observacoes.setValue(reposicao.observacoes ?? '');
          reposicao.itens.forEach((item) => this.itens.push(this.novoItem(item.produtoId, item.quantidade)));
          if (reposicao.podeEditar) {
            this.carregarContexto(marcaId, this.opcoesDosItensExistentes(), reposicao.lojaId);
          }
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

  private carregarContexto(marcaId: string, existentes: OpcaoProduto[], lojaInicial = ''): void {
    this.carregandoContexto.set(true);
    this.falhouContexto.set(false);
    forkJoin({ lojas: this.lojaService.listar(marcaId), produtos: this.produtoService.listar(marcaId) })
      .pipe(finalize(() => this.carregandoContexto.set(false)))
      .subscribe({
        next: ({ lojas, produtos }) => {
          this.lojas.set(lojas.lojas);
          const opcoes = new Map<string, OpcaoProduto>();
          produtos.produtos
            .filter((produto) => produto.ativo)
            .forEach((produto) => opcoes.set(produto.id, { id: produto.id, nome: produto.nome, cor: produto.cor }));
          existentes.forEach((produto) => {
            if (!opcoes.has(produto.id)) {
              opcoes.set(produto.id, produto);
            }
          });
          this.produtos.set([...opcoes.values()].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')));
          if (lojaInicial) {
            this.form.controls.lojaId.setValue(lojaInicial);
          }
        },
        error: () => this.falhouContexto.set(true),
      });
  }

  private opcoesDosItensExistentes(): OpcaoProduto[] {
    return (this.reposicao()?.itens ?? []).map((item) => ({ id: item.produtoId, nome: item.produtoNome, cor: null }));
  }

  private novoItem(produtoId: string, quantidade: number): ItemForm {
    return this.formBuilder.group({
      produtoId: [produtoId, [Validators.required]],
      quantidade: new FormControl<number | null>(quantidade, [
        Validators.required,
        Validators.min(1),
        Validators.max(QUANTIDADE_MAXIMA),
        quantidadeInteira,
      ]),
    });
  }
}
