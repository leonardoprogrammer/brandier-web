import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Subject, of, throwError } from 'rxjs';

import { ConvitePendente, ConvitesRecebidos, VinculoPromotor } from '../../models/promotor.model';
import { ConviteService } from '../../services/convite.service';
import { ConvitesRecebidosComponent, RespostaAoConvite } from './convites-recebidos.component';

describe('ConvitesRecebidosComponent', () => {
  const alfa: ConvitePendente = { id: 'c1', marcaNome: 'Alfa', gestorNome: 'Gestor Silva', expiraEm: '2026-03-08T12:00:00Z', criadoEm: '2026-03-01T12:00:00Z' };
  const beta: ConvitePendente = { id: 'c2', marcaNome: 'Beta', gestorNome: 'Outra Gestora', expiraEm: '2026-03-09T12:00:00Z', criadoEm: '2026-03-02T12:00:00Z' };
  const vinculo: VinculoPromotor = { marcaId: 'm1', marcaNome: 'Alfa', gestorNome: 'Gestor Silva', marcaAtiva: true, entrouEm: '2026-03-03T12:00:00Z' };
  let fixture: ComponentFixture<ConvitesRecebidosComponent>;
  let conviteService: jasmine.SpyObj<ConviteService>;
  let respostas: RespostaAoConvite[];

  beforeEach(async () => {
    conviteService = jasmine.createSpyObj<ConviteService>('ConviteService', ['recebidos', 'aceitarPorId', 'recusarPorId']);
    await TestBed.configureTestingModule({
      imports: [ConvitesRecebidosComponent],
      providers: [{ provide: ConviteService, useValue: conviteService }],
    }).compileComponents();

    fixture = TestBed.createComponent(ConvitesRecebidosComponent);
    respostas = [];
    fixture.componentInstance.respondido.subscribe((resposta) => respostas.push(resposta));
  });

  const elemento = (): HTMLElement => fixture.nativeElement as HTMLElement;
  const botao = (rotulo: string, indice = 0): HTMLButtonElement =>
    Array.from(elemento().querySelectorAll('button')).filter((b) => b.textContent?.trim() === rotulo)[indice];

  function iniciar(convites: ConvitePendente[]): void {
    conviteService.recebidos.and.returnValue(of({ convites }));
    fixture.detectChanges();
  }

  it('não mostra nada quando não há convites', () => {
    iniciar([]);

    expect(elemento().querySelector('section')).toBeNull();
    expect(elemento().textContent?.trim()).toBe('');
  });

  it('não mostra nada enquanto carrega', () => {
    conviteService.recebidos.and.returnValue(new Subject<ConvitesRecebidos>());
    fixture.detectChanges();

    expect(elemento().querySelector('section')).toBeNull();
  });

  it('lista os convites com gestor, marca e validade, no singular quando há um só', () => {
    iniciar([alfa]);

    expect(elemento().querySelector('h2')?.textContent).toContain('Você tem um convite pendente');
    const texto = elemento().querySelector('[data-testid="convite-recebido"]')?.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(texto).toContain('Gestor Silva convidou você para ser promotor da marca Alfa.');
    expect(texto).toContain('Válido até');
  });

  it('usa o plural com o total quando há vários convites', () => {
    iniciar([alfa, beta]);

    expect(elemento().querySelector('h2')?.textContent).toContain('Você tem 2 convites pendentes');
    expect(elemento().querySelectorAll('[data-testid="convite-recebido"]').length).toBe(2);
  });

  it('aceitar envia o id, remove o convite da lista, confirma e avisa quem usa o componente', () => {
    iniciar([alfa, beta]);
    conviteService.aceitarPorId.and.returnValue(of(vinculo));

    botao('Aceitar').click();
    fixture.detectChanges();

    expect(conviteService.aceitarPorId).toHaveBeenCalledWith('c1');
    expect(elemento().querySelectorAll('[data-testid="convite-recebido"]').length).toBe(1);
    expect(elemento().textContent).not.toContain('Gestor Silva convidou');
    expect(elemento().querySelector('[data-testid="confirmacao"]')?.textContent).toContain('Você agora é promotor da marca Alfa.');
    expect(respostas).toEqual(['aceito']);
  });

  it('recusar envia o id, remove o convite e confirma', () => {
    iniciar([alfa]);
    conviteService.recusarPorId.and.returnValue(of(undefined));

    botao('Recusar').click();
    fixture.detectChanges();

    expect(conviteService.recusarPorId).toHaveBeenCalledWith('c1');
    expect(elemento().querySelector('[data-testid="convite-recebido"]')).toBeNull();
    expect(elemento().querySelector('[data-testid="confirmacao"]')?.textContent).toContain('Convite da marca Alfa recusado.');
    expect(respostas).toEqual(['recusado']);
  });

  it('desabilita os botões enquanto responde', () => {
    iniciar([alfa]);
    conviteService.aceitarPorId.and.returnValue(new Subject<VinculoPromotor>());

    botao('Aceitar').click();
    fixture.detectChanges();

    expect(botao('Enviando...').disabled).toBeTrue();
    expect(botao('Recusar').disabled).toBeTrue();
  });

  it('mostra o erro e recarrega a lista quando a resposta falha', () => {
    conviteService.recebidos.and.returnValues(of({ convites: [alfa] }), of({ convites: [] }));
    fixture.detectChanges();
    conviteService.aceitarPorId.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 404, error: { codigo: 'RECURSO_NAO_ENCONTRADO', detail: 'O recurso solicitado não foi encontrado.' } })),
    );

    botao('Aceitar').click();
    fixture.detectChanges();

    expect(elemento().querySelector('[data-testid="erro-resposta"]')?.textContent).toContain('não foi encontrado');
    expect(conviteService.recebidos).toHaveBeenCalledTimes(2);
    expect(elemento().querySelector('[data-testid="convite-recebido"]')).toBeNull();
    expect(respostas).toEqual([]);
  });

  it('mostra erro e permite tentar de novo quando não consegue carregar', () => {
    conviteService.recebidos.and.returnValues(throwError(() => new Error('falha')), of({ convites: [alfa] }));
    fixture.detectChanges();

    expect(elemento().querySelector('[data-testid="erro-carregamento"]')?.textContent).toContain('Não foi possível verificar seus convites');

    botao('Tentar de novo').click();
    fixture.detectChanges();

    expect(conviteService.recebidos).toHaveBeenCalledTimes(2);
    expect(elemento().querySelector('[data-testid="erro-carregamento"]')).toBeNull();
    expect(elemento().querySelectorAll('[data-testid="convite-recebido"]').length).toBe(1);
  });
});
