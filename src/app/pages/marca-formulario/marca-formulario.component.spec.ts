import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';

import { Marca } from '../../models/marca.model';
import { MarcaService } from '../../services/marca.service';
import { MarcaFormularioComponent } from './marca-formulario.component';

describe('MarcaFormularioComponent', () => {
  const marca: Marca = { id: 'abc', nome: 'Alfa', descricao: 'Texto', ativa: true, criadoEm: '2026-01-01T00:00:00Z' };
  let fixture: ComponentFixture<MarcaFormularioComponent>;
  let marcaService: jasmine.SpyObj<MarcaService>;
  let router: Router;

  async function montar(id: string | null): Promise<void> {
    marcaService = jasmine.createSpyObj<MarcaService>('MarcaService', ['buscar', 'criar', 'atualizar']);
    await TestBed.configureTestingModule({
      imports: [MarcaFormularioComponent],
      providers: [
        provideRouter([]),
        { provide: MarcaService, useValue: marcaService },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap(id === null ? {} : { id }) } } },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
  }

  const elemento = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const campoNome = (): HTMLInputElement => elemento().querySelector<HTMLInputElement>('#nome')!;
  const campoDescricao = (): HTMLTextAreaElement => elemento().querySelector<HTMLTextAreaElement>('#descricao')!;
  const botaoEnviar = (): HTMLButtonElement => elemento().querySelector<HTMLButtonElement>('button[type="submit"]')!;

  function digitar(campo: HTMLInputElement | HTMLTextAreaElement, valor: string): void {
    campo.value = valor;
    campo.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function enviar(): void {
    elemento().querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  function erroHttp(status: number, corpo: object): HttpErrorResponse {
    return new HttpErrorResponse({ status, error: corpo });
  }

  describe('criação', () => {
    beforeEach(async () => {
      await montar(null);
      fixture = TestBed.createComponent(MarcaFormularioComponent);
      fixture.detectChanges();
    });

    it('mostra o título de nova marca e não busca nada na API', () => {
      expect(elemento().querySelector('h1')?.textContent).toContain('Nova marca');
      expect(botaoEnviar().textContent).toContain('Criar marca');
      expect(marcaService.buscar).not.toHaveBeenCalled();
    });

    it('não envia e mostra erro quando o nome está vazio', () => {
      enviar();

      expect(marcaService.criar).not.toHaveBeenCalled();
      expect(elemento().querySelector('#nome-erro')?.textContent).toContain('Informe o nome da marca.');
      expect(campoNome().getAttribute('aria-invalid')).toBe('true');
    });

    it('não aceita nome só com espaços', () => {
      digitar(campoNome(), '   ');
      enviar();

      expect(marcaService.criar).not.toHaveBeenCalled();
      expect(elemento().querySelector('#nome-erro')).not.toBeNull();
    });

    it('não aceita nome acima de 80 caracteres', () => {
      digitar(campoNome(), 'a'.repeat(81));
      enviar();

      expect(marcaService.criar).not.toHaveBeenCalled();
      expect(elemento().querySelector('#nome-erro')?.textContent).toContain('no máximo 80');
    });

    it('não aceita descrição acima de 500 caracteres', () => {
      digitar(campoNome(), 'Alfa');
      digitar(campoDescricao(), 'a'.repeat(501));
      enviar();

      expect(marcaService.criar).not.toHaveBeenCalled();
      expect(elemento().querySelector('#descricao-erro')?.textContent).toContain('no máximo 500');
    });

    it('mostra o contador de caracteres da descrição', () => {
      digitar(campoDescricao(), 'abcde');

      expect(elemento().querySelector('#descricao-contador')?.textContent?.replace(/\s/g, '')).toBe('5/500');
    });

    it('cria a marca com os dados aparados e volta para a lista', () => {
      marcaService.criar.and.returnValue(of(marca));
      digitar(campoNome(), '  Alfa  ');
      digitar(campoDescricao(), '  Texto  ');

      enviar();

      expect(marcaService.criar).toHaveBeenCalledWith({ nome: 'Alfa', descricao: 'Texto' });
      expect(router.navigate).toHaveBeenCalledWith(['/painel/marcas']);
    });

    it('desabilita o botão enquanto salva', () => {
      marcaService.criar.and.returnValue(new Subject<Marca>());
      digitar(campoNome(), 'Alfa');

      enviar();

      expect(botaoEnviar().disabled).toBeTrue();
      expect(botaoEnviar().textContent).toContain('Salvando...');
    });

    it('mostra o erro no campo nome quando o nome já existe', () => {
      marcaService.criar.and.returnValue(
        throwError(() => erroHttp(409, { codigo: 'MARCA_NOME_DUPLICADO', detail: 'Você já tem uma marca com esse nome.' })),
      );
      digitar(campoNome(), 'Alfa');

      enviar();

      expect(elemento().querySelector('#nome-erro')?.textContent).toContain('Você já tem uma marca com esse nome.');
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('avisa quando o limite de marcas foi atingido', () => {
      marcaService.criar.and.returnValue(
        throwError(() => erroHttp(409, { codigo: 'LIMITE_MARCAS_ATINGIDO', detail: 'Limite de 2 marcas atingido.' })),
      );
      digitar(campoNome(), 'Alfa');

      enviar();

      const aviso = elemento().querySelector('[role="alert"]');
      expect(aviso?.textContent).toContain('Limite de 2 marcas atingido.');
      expect(aviso?.textContent).toContain('Ver minhas marcas');
    });

    it('mapeia erros de validação do servidor para o campo', () => {
      marcaService.criar.and.returnValue(
        throwError(() =>
          erroHttp(400, { codigo: 'VALIDACAO_INVALIDA', detail: 'Dados inválidos.', erros: [{ campo: 'descricao', mensagem: 'Descrição inválida.' }] }),
        ),
      );
      digitar(campoNome(), 'Alfa');

      enviar();

      expect(elemento().querySelector('#descricao-erro')?.textContent).toContain('Descrição inválida.');
    });

    it('mostra mensagem genérica quando não consegue conectar', () => {
      marcaService.criar.and.returnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
      digitar(campoNome(), 'Alfa');

      enviar();

      expect(elemento().querySelector('[role="alert"]')?.textContent).toContain('Não foi possível conectar ao servidor');
    });
  });

  describe('edição', () => {
    async function iniciarEdicao(): Promise<void> {
      await montar('abc');
      fixture = TestBed.createComponent(MarcaFormularioComponent);
    }

    it('carrega a marca e preenche o formulário', async () => {
      await iniciarEdicao();
      marcaService.buscar.and.returnValue(of(marca));
      fixture.detectChanges();

      expect(marcaService.buscar).toHaveBeenCalledWith('abc');
      expect(elemento().querySelector('h1')?.textContent).toContain('Editar marca');
      expect(campoNome().value).toBe('Alfa');
      expect(campoDescricao().value).toBe('Texto');
      expect(botaoEnviar().textContent).toContain('Salvar alterações');
    });

    it('preenche descrição vazia quando a marca não tem descrição', async () => {
      await iniciarEdicao();
      marcaService.buscar.and.returnValue(of({ ...marca, descricao: null }));
      fixture.detectChanges();

      expect(campoDescricao().value).toBe('');
    });

    it('mostra o carregamento enquanto busca a marca', async () => {
      await iniciarEdicao();
      marcaService.buscar.and.returnValue(new Subject<Marca>());
      fixture.detectChanges();

      expect(elemento().textContent).toContain('Carregando...');
      expect(elemento().querySelector('form')).toBeNull();
    });

    it('mostra marca não encontrada quando a API responde 404', async () => {
      await iniciarEdicao();
      marcaService.buscar.and.returnValue(throwError(() => erroHttp(404, { codigo: 'NAO_ENCONTRADO' })));
      fixture.detectChanges();

      expect(elemento().textContent).toContain('Marca não encontrada.');
      expect(elemento().querySelector('form')).toBeNull();
    });

    it('mostra o erro da API quando a busca falha por outro motivo', async () => {
      await iniciarEdicao();
      marcaService.buscar.and.returnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
      fixture.detectChanges();

      expect(elemento().querySelector('[role="alert"]')?.textContent).toContain('Não foi possível conectar ao servidor');
    });

    it('atualiza a marca e volta para a lista', async () => {
      await iniciarEdicao();
      marcaService.buscar.and.returnValue(of(marca));
      marcaService.atualizar.and.returnValue(of(marca));
      fixture.detectChanges();
      digitar(campoNome(), 'Alfa Nova');

      enviar();

      expect(marcaService.atualizar).toHaveBeenCalledWith('abc', { nome: 'Alfa Nova', descricao: 'Texto' });
      expect(marcaService.criar).not.toHaveBeenCalled();
      expect(router.navigate).toHaveBeenCalledWith(['/painel/marcas']);
    });
  });
});
