import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';

import { Marca } from '../../models/marca.model';
import { Convite, PromotoresDaMarca } from '../../models/promotor.model';
import { ConviteService } from '../../services/convite.service';
import { MarcaService } from '../../services/marca.service';
import { PromotorService } from '../../services/promotor.service';
import { PromotoresComponent } from './promotores.component';

describe('PromotoresComponent', () => {
  const marca: Marca = { id: 'm1', nome: 'Alfa', descricao: null, criadoEm: '2026-01-01T00:00:00Z' };
  const ana = { id: 'p1', usuarioId: 'u1', nome: 'Ana', email: 'ana@exemplo.com', entrouEm: '2026-02-01T12:00:00Z' };
  const pendente: Convite = { id: 'c1', email: 'novo@exemplo.com', status: 'PENDENTE', expiraEm: '2026-03-08T12:00:00Z', criadoEm: '2026-03-01T12:00:00Z' };
  const recusado: Convite = { id: 'c2', email: 'nao@exemplo.com', status: 'RECUSADO', expiraEm: '2026-03-08T12:00:00Z', criadoEm: '2026-03-01T12:00:00Z' };
  const vazio: PromotoresDaMarca = { promotores: [], convites: [], usadas: 0, limite: 5 };
  let fixture: ComponentFixture<PromotoresComponent>;
  let promotorService: jasmine.SpyObj<PromotorService>;
  let conviteService: jasmine.SpyObj<ConviteService>;
  let marcaService: jasmine.SpyObj<MarcaService>;

  beforeEach(async () => {
    promotorService = jasmine.createSpyObj<PromotorService>('PromotorService', ['listar', 'remover']);
    conviteService = jasmine.createSpyObj<ConviteService>('ConviteService', ['convidar', 'cancelar']);
    marcaService = jasmine.createSpyObj<MarcaService>('MarcaService', ['buscar']);
    marcaService.buscar.and.returnValue(of(marca));
    await TestBed.configureTestingModule({
      imports: [PromotoresComponent],
      providers: [
        provideRouter([]),
        { provide: PromotorService, useValue: promotorService },
        { provide: ConviteService, useValue: conviteService },
        { provide: MarcaService, useValue: marcaService },
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ marcaId: 'm1' }) } } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PromotoresComponent);
  });

  const elemento = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const campoEmail = (): HTMLInputElement => elemento().querySelector<HTMLInputElement>('#email-convite')!;

  function iniciar(dados: PromotoresDaMarca): void {
    promotorService.listar.and.returnValue(of(dados));
    fixture.detectChanges();
  }

  function botao(texto: string): HTMLButtonElement {
    return Array.from(elemento().querySelectorAll('button')).find((b) => b.textContent?.trim() === texto)!;
  }

  function digitarEmail(valor: string): void {
    campoEmail().value = valor;
    campoEmail().dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function enviarConvite(): void {
    elemento().querySelector('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  it('mostra o carregamento enquanto busca', () => {
    promotorService.listar.and.returnValue(new Subject<PromotoresDaMarca>());
    fixture.detectChanges();

    expect(elemento().textContent).toContain('Carregando promotores...');
  });

  it('busca a marca e os promotores da marca da rota', () => {
    iniciar(vazio);

    expect(marcaService.buscar).toHaveBeenCalledWith('m1');
    expect(promotorService.listar).toHaveBeenCalledWith('m1');
    expect(elemento().querySelector('header p strong')?.textContent).toBe('Alfa');
  });

  it('mostra o estado vazio e o uso do limite', () => {
    iniciar(vazio);

    expect(elemento().textContent).toContain('Esta marca ainda não tem promotores.');
    expect(elemento().querySelector('[data-testid="uso-promotores"]')?.textContent?.trim()).toBe('0/5 promotores');
    expect(elemento().querySelector('[data-testid="convite"]')).toBeNull();
  });

  it('lista promotores e convites com o status', () => {
    iniciar({ promotores: [ana], convites: [pendente, recusado], usadas: 2, limite: 5 });

    expect(elemento().querySelectorAll('[data-testid="promotor"]').length).toBe(1);
    expect(elemento().textContent).toContain('ana@exemplo.com');
    const status = Array.from(elemento().querySelectorAll('[data-testid="status-convite"]')).map((e) => e.textContent?.trim());
    expect(status).toEqual(['Pendente', 'Recusado']);
    expect(botao('Cancelar convite')).toBeDefined();
    expect(botao('Apagar histórico')).toBeDefined();
  });

  it('esconde o formulário e avisa quando o limite foi atingido', () => {
    iniciar({ promotores: [ana], convites: [pendente], usadas: 5, limite: 5 });

    expect(elemento().querySelector('form')).toBeNull();
    expect(elemento().querySelector('#aviso-limite')?.textContent).toContain('limite de 5 promotores');
  });

  it('não envia e mostra erro com e-mail vazio ou inválido', () => {
    iniciar(vazio);

    enviarConvite();
    expect(conviteService.convidar).not.toHaveBeenCalled();
    expect(elemento().querySelector('#email-convite-erro')?.textContent).toContain('Informe o e-mail da pessoa.');

    digitarEmail('isso-nao-e-email');
    enviarConvite();
    expect(conviteService.convidar).not.toHaveBeenCalled();
    expect(elemento().querySelector('#email-convite-erro')?.textContent).toContain('Informe um e-mail válido.');
  });

  it('envia o convite com o e-mail aparado, limpa o campo e recarrega a lista', () => {
    iniciar(vazio);
    conviteService.convidar.and.returnValue(of(pendente));
    promotorService.listar.and.returnValue(of({ promotores: [], convites: [pendente], usadas: 1, limite: 5 }));
    digitarEmail('  novo@exemplo.com ');

    enviarConvite();

    expect(conviteService.convidar).toHaveBeenCalledWith('m1', 'novo@exemplo.com');
    expect(elemento().querySelector('[role="status"]')?.textContent).toContain('Convite enviado para novo@exemplo.com.');
    expect(campoEmail().value).toBe('');
    expect(promotorService.listar).toHaveBeenCalledTimes(2);
    expect(elemento().querySelector('[data-testid="uso-promotores"]')?.textContent?.trim()).toBe('1/5 promotores');
  });

  it('desabilita o botão enquanto envia', () => {
    iniciar(vazio);
    conviteService.convidar.and.returnValue(new Subject<Convite>());
    digitarEmail('novo@exemplo.com');

    enviarConvite();

    expect(botao('Enviando...').disabled).toBeTrue();
  });

  it('mostra a mensagem do servidor nos erros de regra de negócio', () => {
    iniciar(vazio);
    for (const codigo of ['CONVITE_JA_PENDENTE', 'PROMOTOR_JA_VINCULADO', 'CONVITE_PROPRIO_EMAIL', 'LIMITE_PROMOTORES_ATINGIDO']) {
      conviteService.convidar.and.returnValue(
        throwError(() => new HttpErrorResponse({ status: 409, error: { codigo, detail: `Mensagem de ${codigo}` } })),
      );
      digitarEmail('novo@exemplo.com');

      enviarConvite();

      expect(elemento().querySelector('form [role="alert"]')?.textContent).toContain(`Mensagem de ${codigo}`);
    }
  });

  it('mostra o erro de validação do servidor no campo e-mail', () => {
    iniciar(vazio);
    conviteService.convidar.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 400, error: { codigo: 'VALIDACAO_INVALIDA', erros: [{ campo: 'email', mensagem: 'Informe um e-mail válido' }] } })),
    );
    digitarEmail('novo@exemplo.com');

    enviarConvite();

    expect(elemento().querySelector('#email-convite-erro')?.textContent).toContain('Informe um e-mail válido');
  });

  it('mostra marca não encontrada quando a API responde 404', () => {
    marcaService.buscar.and.returnValue(throwError(() => new HttpErrorResponse({ status: 404, error: { codigo: 'RECURSO_NAO_ENCONTRADO' } })));
    promotorService.listar.and.returnValue(of(vazio));
    fixture.detectChanges();

    expect(elemento().querySelector('[role="alert"]')?.textContent).toContain('Marca não encontrada.');
  });

  it('mostra erro e permite tentar de novo quando a listagem falha', () => {
    promotorService.listar.and.returnValues(throwError(() => new Error('falha')), of(vazio));
    fixture.detectChanges();

    expect(elemento().querySelector('[role="alert"]')?.textContent).toContain('Não foi possível carregar os promotores');

    botao('Tentar de novo').click();
    fixture.detectChanges();

    expect(promotorService.listar).toHaveBeenCalledTimes(2);
    expect(elemento().textContent).toContain('Esta marca ainda não tem promotores.');
  });

  it('pede confirmação antes de remover o promotor e permite cancelar', () => {
    iniciar({ promotores: [ana], convites: [], usadas: 1, limite: 5 });

    botao('Remover').click();
    fixture.detectChanges();

    expect(elemento().querySelector('[role="alertdialog"]')?.textContent).toContain('As reposições já registradas serão mantidas');
    expect(promotorService.remover).not.toHaveBeenCalled();

    botao('Cancelar').click();
    fixture.detectChanges();

    expect(elemento().querySelector('[role="alertdialog"]')).toBeNull();
  });

  it('remove o promotor confirmado e recarrega a lista', () => {
    iniciar({ promotores: [ana], convites: [], usadas: 1, limite: 5 });
    promotorService.remover.and.returnValue(of(undefined));
    promotorService.listar.and.returnValue(of(vazio));

    botao('Remover').click();
    fixture.detectChanges();
    botao('Remover promotor').click();
    fixture.detectChanges();

    expect(promotorService.remover).toHaveBeenCalledWith('m1', 'p1');
    expect(promotorService.listar).toHaveBeenCalledTimes(2);
    expect(elemento().querySelector('[data-testid="promotor"]')).toBeNull();
  });

  it('cancela o convite pendente após confirmação', () => {
    iniciar({ promotores: [], convites: [pendente], usadas: 1, limite: 5 });
    conviteService.cancelar.and.returnValue(of(undefined));
    promotorService.listar.and.returnValue(of(vazio));

    botao('Cancelar convite').click();
    fixture.detectChanges();
    expect(elemento().querySelector('[role="alertdialog"]')?.textContent).toContain('O link enviado deixa de funcionar');
    botao('Confirmar').click();
    fixture.detectChanges();

    expect(conviteService.cancelar).toHaveBeenCalledWith('m1', 'c1');
    expect(elemento().querySelector('[data-testid="convite"]')).toBeNull();
  });

  it('mostra o erro e mantém o item quando a remoção falha', () => {
    iniciar({ promotores: [ana], convites: [], usadas: 1, limite: 5 });
    promotorService.remover.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 404, error: { codigo: 'RECURSO_NAO_ENCONTRADO', detail: 'Recurso não encontrado.' } })),
    );

    botao('Remover').click();
    fixture.detectChanges();
    botao('Remover promotor').click();
    fixture.detectChanges();

    expect(elemento().textContent).toContain('Ana');
    expect(elemento().textContent).toContain('Recurso não encontrado.');
  });
});
