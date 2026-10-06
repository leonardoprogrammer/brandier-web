import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NonNullableFormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';

import { extrairProblema, mensagemDeErro } from '../../core/api-error';
import { MarcaService } from '../../services/marca.service';

const NOME_TAMANHO_MAXIMO = 80;
const DESCRICAO_TAMANHO_MAXIMO = 500;

type CampoMarca = 'nome' | 'descricao';

@Component({
  selector: 'app-marca-formulario',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './marca-formulario.component.html',
})
export class MarcaFormularioComponent implements OnInit {
  private readonly formBuilder = inject(NonNullableFormBuilder);
  private readonly marcaService = inject(MarcaService);
  private readonly router = inject(Router);
  private readonly id = inject(ActivatedRoute).snapshot.paramMap.get('id');

  protected readonly edicao = this.id !== null;
  protected readonly descricaoTamanhoMaximo = DESCRICAO_TAMANHO_MAXIMO;

  protected readonly form = this.formBuilder.group({
    nome: ['', [Validators.required, Validators.maxLength(NOME_TAMANHO_MAXIMO), semSoEspacos]],
    descricao: ['', [Validators.maxLength(DESCRICAO_TAMANHO_MAXIMO)]],
  });

  private readonly descricaoDigitada = toSignal(this.form.controls.descricao.valueChanges, { initialValue: '' });
  protected readonly caracteresDaDescricao = computed(() => this.descricaoDigitada().length);

  protected readonly carregando = signal(this.id !== null);
  protected readonly naoEncontrada = signal(false);
  protected readonly enviando = signal(false);
  protected readonly erro = signal<string | null>(null);
  protected readonly limiteAtingido = signal(false);

  ngOnInit(): void {
    if (this.id === null) {
      return;
    }

    this.marcaService
      .buscar(this.id)
      .pipe(finalize(() => this.carregando.set(false)))
      .subscribe({
        next: (marca) => this.form.setValue({ nome: marca.nome, descricao: marca.descricao ?? '' }),
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

    const { nome, descricao } = this.form.getRawValue();
    const dados = { nome: nome.trim(), descricao: descricao.trim() };
    const requisicao = this.id === null ? this.marcaService.criar(dados) : this.marcaService.atualizar(this.id, dados);

    this.enviando.set(true);
    this.erro.set(null);
    requisicao.pipe(finalize(() => this.enviando.set(false))).subscribe({
      next: () => void this.router.navigate(['/painel/marcas']),
      error: (erro: unknown) => this.tratarErro(erro),
    });
  }

  protected mensagemDoCampo(campo: CampoMarca): string | null {
    const controle = this.form.controls[campo];
    const mensagemDoServidor = controle.getError('servidor') as string | null;
    if (mensagemDoServidor) {
      return mensagemDoServidor;
    }
    if (!controle.touched || controle.valid) {
      return null;
    }
    if (controle.hasError('required') || controle.hasError('semSoEspacos')) {
      return 'Informe o nome da marca.';
    }
    if (controle.hasError('maxlength')) {
      return campo === 'nome'
        ? `O nome deve ter no máximo ${NOME_TAMANHO_MAXIMO} caracteres.`
        : `A descrição deve ter no máximo ${DESCRICAO_TAMANHO_MAXIMO} caracteres.`;
    }
    return 'Valor inválido.';
  }

  private tratarErro(erro: unknown): void {
    const problema = extrairProblema(erro);

    if (problema.codigo === 'LIMITE_MARCAS_ATINGIDO') {
      this.limiteAtingido.set(true);
      this.erro.set(problema.mensagem);
      return;
    }

    if (problema.codigo === 'MARCA_NOME_DUPLICADO') {
      const controle = this.form.controls.nome;
      controle.setErrors({ servidor: problema.mensagem ?? 'Você já tem uma marca com esse nome.' });
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

function semSoEspacos(controle: { value: unknown }): { semSoEspacos: true } | null {
  const valor = controle.value;
  return typeof valor === 'string' && valor.length > 0 && valor.trim().length === 0 ? { semSoEspacos: true } : null;
}
