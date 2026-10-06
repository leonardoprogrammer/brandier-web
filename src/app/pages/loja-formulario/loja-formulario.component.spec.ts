import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';

import { Loja } from '../../models/loja.model';
import { LojaService } from '../../services/loja.service';
import { LojaFormularioComponent } from './loja-formulario.component';

describe('LojaFormularioComponent', () => {
  const loja: Loja = { id: 'l1', nome: 'Centro', cidade: 'Campinas', uf: 'SP', endereco: 'Rua A, 1', criadoEm: '2026-01-01T00:00:00Z' };
  let fixture: ComponentFixture<LojaFormularioComponent>;
  let lojaService: jasmine.SpyObj<LojaService>;
  let router: Router;

  async function montar(id: string | null): Promise<void> {
    lojaService = jasmine.createSpyObj<LojaService>('LojaService', ['buscar', 'criar', 'atualizar']);
    const parametros = id === null ? { marcaId: 'm1' } : { marcaId: 'm1', id };
    await TestBed.configureTestingModule({
      imports: [LojaFormularioComponent],
      providers: [
        provideRouter([]),
        { provide: LojaService, useValue: lojaService },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap(parametros) } } },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
  }

  const elemento = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const campoNome = (): HTMLInputElement => elemento().querySelector<HTMLInputElement>('#nome')!;
  const campoCidade = (): HTMLInputElement => elemento().querySelector<HTMLInputElement>('#cidade')!;
  const campoUf = (): HTMLSelectElement => elemento().querySelector<HTMLSelectElement>('#uf')!;
  const campoEndereco = (): HTMLInputElement => elemento().querySelector<HTMLInputElement>('#endereco')!;
  const botaoEnviar = (): HTMLButtonElement => elemento().querySelector<HTMLButtonElement>('button[type="submit"]')!;

  function digitar(campo: HTMLInputElement, valor: string): void {
    campo.value = valor;
    campo.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function selecionarUf(valor: string): void {
    campoUf().value = valor;
    campoUf().dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }

  function preencherValido(): void {
    digitar(campoNome(), 'Centro');
    digitar(campoCidade(), 'Campinas');
    selecionarUf('SP');
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
      fixture = TestBed.createComponent(LojaFormularioComponent);
      fixture.detectChanges();
    });

    it('mostra o título de nova loja, as 27 UFs e não busca nada na API', () => {
      expect(elemento().querySelector('h1')?.textContent).toContain('Nova loja');
      expect(botaoEnviar().textContent).toContain('Cadastrar loja');
      expect(campoUf().querySelectorAll('option').length).toBe(28);
      expect(lojaService.buscar).not.toHaveBeenCalled();
    });

    it('tem o link de volta para as lojas da marca', () => {
      expect(elemento().querySelector('a[href="/painel/marcas/m1/lojas"]')).not.toBeNull();
    });

    it('não envia e mostra os erros dos campos obrigatórios', () => {
      enviar();

      expect(lojaService.criar).not.toHaveBeenCalled();
      expect(elemento().querySelector('#nome-erro')?.textContent).toContain('Informe o nome da loja.');
      expect(elemento().querySelector('#cidade-erro')?.textContent).toContain('Informe a cidade.');
      expect(elemento().querySelector('#uf-erro')?.textContent).toContain('Selecione a UF.');
      expect(campoNome().getAttribute('aria-invalid')).toBe('true');
    });

    it('não aceita nome ou cidade só com espaços', () => {
      digitar(campoNome(), '   ');
      digitar(campoCidade(), '   ');
      selecionarUf('SP');
      enviar();

      expect(lojaService.criar).not.toHaveBeenCalled();
      expect(elemento().querySelector('#nome-erro')).not.toBeNull();
      expect(elemento().querySelector('#cidade-erro')).not.toBeNull();
    });

    it('respeita os tamanhos máximos', () => {
      preencherValido();
      digitar(campoNome(), 'n'.repeat(81));
      digitar(campoCidade(), 'c'.repeat(81));
      digitar(campoEndereco(), 'e'.repeat(201));
      enviar();

      expect(lojaService.criar).not.toHaveBeenCalled();
      expect(elemento().querySelector('#nome-erro')?.textContent).toContain('O nome deve ter no máximo 80');
      expect(elemento().querySelector('#cidade-erro')?.textContent).toContain('A cidade deve ter no máximo 80');
      expect(elemento().querySelector('#endereco-erro')?.textContent).toContain('O endereço deve ter no máximo 200');
    });

    it('cria a loja com os dados aparados e volta para a lista', () => {
      lojaService.criar.and.returnValue(of(loja));
      digitar(campoNome(), '  Centro  ');
      digitar(campoCidade(), '  Campinas ');
      selecionarUf('SP');
      digitar(campoEndereco(), '  Rua A, 1 ');

      enviar();

      expect(lojaService.criar).toHaveBeenCalledWith('m1', {
        nome: 'Centro',
        cidade: 'Campinas',
        uf: 'SP',
        endereco: 'Rua A, 1',
      });
      expect(router.navigate).toHaveBeenCalledWith(['/painel/marcas', 'm1', 'lojas']);
    });

    it('envia o endereço vazio quando não informado', () => {
      lojaService.criar.and.returnValue(of(loja));
      preencherValido();

      enviar();

      expect(lojaService.criar).toHaveBeenCalledWith('m1', jasmine.objectContaining({ endereco: '' }));
    });

    it('desabilita o botão enquanto salva', () => {
      lojaService.criar.and.returnValue(new Subject<Loja>());
      preencherValido();

      enviar();

      expect(botaoEnviar().disabled).toBeTrue();
      expect(botaoEnviar().textContent).toContain('Salvando...');
    });

    it('mostra o erro no campo nome quando o nome já existe', () => {
      lojaService.criar.and.returnValue(
        throwError(() => erroHttp(409, { codigo: 'LOJA_NOME_DUPLICADO', detail: 'Esta marca já tem uma loja com esse nome.' })),
      );
      preencherValido();

      enviar();

      expect(elemento().querySelector('#nome-erro')?.textContent).toContain('Esta marca já tem uma loja com esse nome.');
      expect(router.navigate).not.toHaveBeenCalled();
    });

    it('avisa quando o limite de lojas foi atingido', () => {
      lojaService.criar.and.returnValue(
        throwError(() => erroHttp(409, { codigo: 'LIMITE_LOJAS_ATINGIDO', detail: 'Esta marca já atingiu o limite de lojas.' })),
      );
      preencherValido();

      enviar();

      const aviso = elemento().querySelector('[role="alert"]');
      expect(aviso?.textContent).toContain('Esta marca já atingiu o limite de lojas.');
      expect(aviso?.textContent).toContain('Ver lojas da marca');
    });

    it('mapeia erros de validação do servidor para o campo', () => {
      lojaService.criar.and.returnValue(
        throwError(() =>
          erroHttp(400, { codigo: 'VALIDACAO_INVALIDA', detail: 'Dados inválidos.', erros: [{ campo: 'cidade', mensagem: 'Cidade inválida.' }] }),
        ),
      );
      preencherValido();

      enviar();

      expect(elemento().querySelector('#cidade-erro')?.textContent).toContain('Cidade inválida.');
    });

    it('mostra mensagem genérica quando não consegue conectar', () => {
      lojaService.criar.and.returnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
      preencherValido();

      enviar();

      expect(elemento().querySelector('[role="alert"]')?.textContent).toContain('Não foi possível conectar ao servidor');
    });
  });

  describe('edição', () => {
    async function iniciarEdicao(): Promise<void> {
      await montar('l1');
      fixture = TestBed.createComponent(LojaFormularioComponent);
    }

    it('carrega a loja e preenche o formulário', async () => {
      await iniciarEdicao();
      lojaService.buscar.and.returnValue(of(loja));
      fixture.detectChanges();

      expect(lojaService.buscar).toHaveBeenCalledWith('m1', 'l1');
      expect(elemento().querySelector('h1')?.textContent).toContain('Editar loja');
      expect(campoNome().value).toBe('Centro');
      expect(campoCidade().value).toBe('Campinas');
      expect(campoUf().value).toBe('SP');
      expect(campoEndereco().value).toBe('Rua A, 1');
      expect(botaoEnviar().textContent).toContain('Salvar alterações');
    });

    it('preenche endereço vazio quando a loja não tem endereço', async () => {
      await iniciarEdicao();
      lojaService.buscar.and.returnValue(of({ ...loja, endereco: null }));
      fixture.detectChanges();

      expect(campoEndereco().value).toBe('');
    });

    it('mostra o carregamento enquanto busca a loja', async () => {
      await iniciarEdicao();
      lojaService.buscar.and.returnValue(new Subject<Loja>());
      fixture.detectChanges();

      expect(elemento().textContent).toContain('Carregando...');
      expect(elemento().querySelector('form')).toBeNull();
    });

    it('mostra loja não encontrada quando a API responde 404', async () => {
      await iniciarEdicao();
      lojaService.buscar.and.returnValue(throwError(() => erroHttp(404, { codigo: 'RECURSO_NAO_ENCONTRADO' })));
      fixture.detectChanges();

      expect(elemento().textContent).toContain('Loja não encontrada.');
      expect(elemento().querySelector('form')).toBeNull();
    });

    it('mostra o erro da API quando a busca falha por outro motivo', async () => {
      await iniciarEdicao();
      lojaService.buscar.and.returnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
      fixture.detectChanges();

      expect(elemento().querySelector('[role="alert"]')?.textContent).toContain('Não foi possível conectar ao servidor');
    });

    it('atualiza a loja e volta para a lista', async () => {
      await iniciarEdicao();
      lojaService.buscar.and.returnValue(of(loja));
      lojaService.atualizar.and.returnValue(of(loja));
      fixture.detectChanges();
      digitar(campoNome(), 'Centro Novo');

      enviar();

      expect(lojaService.atualizar).toHaveBeenCalledWith('m1', 'l1', {
        nome: 'Centro Novo',
        cidade: 'Campinas',
        uf: 'SP',
        endereco: 'Rua A, 1',
      });
      expect(lojaService.criar).not.toHaveBeenCalled();
      expect(router.navigate).toHaveBeenCalledWith(['/painel/marcas', 'm1', 'lojas']);
    });
  });
});
