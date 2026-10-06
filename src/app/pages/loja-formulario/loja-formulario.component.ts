import { Component, OnInit, inject, signal } from '@angular/core';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { extrairProblema, mensagemDeErro } from '../../core/api-error';
import { UFS } from '../../core/ufs';
import { LojaService } from '../../services/loja.service';
import { semSoEspacos } from '../../validators/texto.validator';

const NOME_TAMANHO_MAXIMO = 80;
const CIDADE_TAMANHO_MAXIMO = 80;
const ENDERECO_TAMANHO_MAXIMO = 200;

type CampoLoja = 'nome' | 'cidade' | 'uf' | 'endereco';

const ROTULOS_OBRIGATORIOS: Record<'nome' | 'cidade' | 'uf', string> = {
  nome: 'Informe o nome da loja.',
  cidade: 'Informe a cidade.',
  uf: 'Selecione a UF.',
};

const LIMITES: Record<'nome' | 'cidade' | 'endereco', { rotulo: string; maximo: number }> = {
  nome: { rotulo: 'O nome', maximo: NOME_TAMANHO_MAXIMO },
  cidade: { rotulo: 'A cidade', maximo: CIDADE_TAMANHO_MAXIMO },
  endereco: { rotulo: 'O endereço', maximo: ENDERECO_TAMANHO_MAXIMO },
};

@Component({
  selector: 'app-loja-formulario',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './loja-formulario.component.html',
})
export class LojaFormularioComponent implements OnInit {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly lojaService = inject(LojaService);
  private readonly router = inject(Router);
  private readonly paramMap = inject(ActivatedRoute).snapshot.paramMap;

  protected readonly marcaId = this.paramMap.get('marcaId') ?? '';
  private readonly id = this.paramMap.get('id');

  protected readonly edicao = this.id !== null;
  protected readonly ufs = UFS;

  protected readonly form = this.formBuilder.group({
    nome: ['', [Validators.required, Validators.maxLength(NOME_TAMANHO_MAXIMO), semSoEspacos]],
    cidade: ['', [Validators.required, Validators.maxLength(CIDADE_TAMANHO_MAXIMO), semSoEspacos]],
    uf: ['', [Validators.required]],
    endereco: ['', [Validators.maxLength(ENDERECO_TAMANHO_MAXIMO)]],
  });

  protected readonly carregando = signal(this.id !== null);
  protected readonly naoEncontrada = signal(false);
  protected readonly enviando = signal(false);
  protected readonly erro = signal<string | null>(null);
  protected readonly limiteAtingido = signal(false);

  ngOnInit(): void {
    if (this.id === null) {
      return;
    }

    this.lojaService
      .buscar(this.marcaId, this.id)
      .pipe(finalize(() => this.carregando.set(false)))
      .subscribe({
        next: (loja) =>
          this.form.setValue({ nome: loja.nome, cidade: loja.cidade, uf: loja.uf, endereco: loja.endereco ?? '' }),
        error: (erro: unknown) => {
          if (extrairProblema(erro).status === 404) {
            this.naoEncontrada.set(true);
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

    const { nome, cidade, uf, endereco } = this.form.getRawValue();
    const dados = { nome: nome.trim(), cidade: cidade.trim(), uf, endereco: endereco.trim() };
    const requisicao =
      this.id === null
        ? this.lojaService.criar(this.marcaId, dados)
        : this.lojaService.atualizar(this.marcaId, this.id, dados);

    this.enviando.set(true);
    this.erro.set(null);
    requisicao.pipe(finalize(() => this.enviando.set(false))).subscribe({
      next: () => void this.router.navigate(['/painel/marcas', this.marcaId, 'lojas']),
      error: (erro: unknown) => this.tratarErro(erro),
    });
  }

  protected mensagemDoCampo(campo: CampoLoja): string | null {
    const controle = this.form.controls[campo];
    const mensagemDoServidor = controle.getError('servidor') as string | null;
    if (mensagemDoServidor) {
      return mensagemDoServidor;
    }
    if (!controle.touched || controle.valid) {
      return null;
    }
    if (campo !== 'endereco' && (controle.hasError('required') || controle.hasError('semSoEspacos'))) {
      return ROTULOS_OBRIGATORIOS[campo];
    }
    if (campo !== 'uf' && controle.hasError('maxlength')) {
      const { rotulo, maximo } = LIMITES[campo];
      return `${rotulo} deve ter no máximo ${maximo} caracteres.`;
    }
    return 'Valor inválido.';
  }

  private tratarErro(erro: unknown): void {
    const problema = extrairProblema(erro);

    if (problema.codigo === 'LIMITE_LOJAS_ATINGIDO') {
      this.limiteAtingido.set(true);
      this.erro.set(problema.mensagem);
      return;
    }

    if (problema.codigo === 'LOJA_NOME_DUPLICADO') {
      const controle = this.form.controls.nome;
      controle.setErrors({ servidor: problema.mensagem ?? 'Esta marca já tem uma loja com esse nome.' });
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
