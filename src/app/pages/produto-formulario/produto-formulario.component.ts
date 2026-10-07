import { Component, OnInit, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { extrairProblema, mensagemDeErro } from '../../core/api-error';
import { ProdutoService } from '../../services/produto.service';
import { semSoEspacos } from '../../validators/texto.validator';

const NOME_TAMANHO_MAXIMO = 80;
const CODIGO_TAMANHO_MAXIMO = 40;
const COR_PADRAO = '#6366f1';

type CampoProduto = 'nome' | 'codigo';

@Component({
  selector: 'app-produto-formulario',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './produto-formulario.component.html',
})
export class ProdutoFormularioComponent implements OnInit {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly produtoService = inject(ProdutoService);
  private readonly router = inject(Router);
  private readonly paramMap = inject(ActivatedRoute).snapshot.paramMap;

  protected readonly marcaId = this.paramMap.get('marcaId') ?? '';
  private readonly id = this.paramMap.get('id');

  protected readonly edicao = this.id !== null;

  protected readonly form = this.formBuilder.group({
    nome: ['', [Validators.required, Validators.maxLength(NOME_TAMANHO_MAXIMO), semSoEspacos]],
    codigo: ['', [Validators.maxLength(CODIGO_TAMANHO_MAXIMO)]],
    temCor: [false],
    cor: [COR_PADRAO],
  });

  protected readonly carregando = signal(this.id !== null);
  protected readonly naoEncontrado = signal(false);
  protected readonly enviando = signal(false);
  protected readonly erro = signal<string | null>(null);
  protected readonly limiteAtingido = signal(false);

  ngOnInit(): void {
    if (this.id === null) {
      return;
    }

    this.produtoService
      .buscar(this.marcaId, this.id)
      .pipe(finalize(() => this.carregando.set(false)))
      .subscribe({
        next: (produto) =>
          this.form.setValue({
            nome: produto.nome,
            codigo: produto.codigo ?? '',
            temCor: produto.cor !== null,
            cor: produto.cor ?? COR_PADRAO,
          }),
        error: (erro: unknown) => {
          if (extrairProblema(erro).status === 404) {
            this.naoEncontrado.set(true);
          } else {
            this.erro.set(mensagemDeErro(extrairProblema(erro)));
          }
        },
      });
  }

  protected salvar(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { nome, codigo, temCor, cor } = this.form.getRawValue();
    const dados = { nome: nome.trim(), codigo: codigo.trim(), cor: temCor ? cor : null };
    const requisicao =
      this.id === null
        ? this.produtoService.criar(this.marcaId, dados)
        : this.produtoService.atualizar(this.marcaId, this.id, dados);

    this.enviando.set(true);
    this.erro.set(null);
    requisicao.pipe(finalize(() => this.enviando.set(false))).subscribe({
      next: () => void this.router.navigate(['/painel/marcas', this.marcaId, 'produtos']),
      error: (erro: unknown) => this.tratarErro(erro),
    });
  }

  protected mensagemDoCampo(campo: CampoProduto): string | null {
    const controle = this.form.controls[campo];
    const mensagemDoServidor = controle.getError('servidor') as string | null;
    if (mensagemDoServidor) {
      return mensagemDoServidor;
    }
    if (!controle.touched || controle.valid) {
      return null;
    }
    if (campo === 'nome' && (controle.hasError('required') || controle.hasError('semSoEspacos'))) {
      return 'Informe o nome do produto.';
    }
    if (controle.hasError('maxlength')) {
      return campo === 'nome'
        ? `O nome deve ter no máximo ${NOME_TAMANHO_MAXIMO} caracteres.`
        : `O código deve ter no máximo ${CODIGO_TAMANHO_MAXIMO} caracteres.`;
    }
    return 'Valor inválido.';
  }

  private tratarErro(erro: unknown): void {
    const problema = extrairProblema(erro);

    if (problema.codigo === 'LIMITE_PRODUTOS_ATINGIDO') {
      this.limiteAtingido.set(true);
      this.erro.set(problema.mensagem);
      return;
    }

    if (problema.codigo === 'PRODUTO_NOME_DUPLICADO') {
      const controle = this.form.controls.nome;
      controle.setErrors({ servidor: problema.mensagem ?? 'Esta marca já tem um produto com esse nome.' });
      controle.markAsTouched();
      return;
    }

    const camposNaoMapeados: string[] = [];
    for (const erroCampo of problema.erros) {
      const controle = this.form.get(erroCampo.campo);
      if (controle) {
        controle.setErrors({ servidor: erroCampo.mensagem });
        controle.markAsTouched();
      } else {
        camposNaoMapeados.push(erroCampo.mensagem);
      }
    }

    if (problema.codigo !== 'VALIDACAO_INVALIDA' || camposNaoMapeados.length > 0 || problema.erros.length === 0) {
      this.erro.set(camposNaoMapeados[0] ?? mensagemDeErro(problema));
    }
  }
}
