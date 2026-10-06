import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';

import { MeusVinculos, VinculoPromotor } from '../../models/promotor.model';
import { ConviteService } from '../../services/convite.service';
import { PromotorService } from '../../services/promotor.service';
import { PromotorVinculosComponent } from './promotor-vinculos.component';

describe('PromotorVinculosComponent', () => {
  const alfa: VinculoPromotor = { marcaId: 'm1', marcaNome: 'Alfa', gestorNome: 'Gestor Silva', entrouEm: '2026-02-01T12:00:00Z' };
  const beta: VinculoPromotor = { marcaId: 'm2', marcaNome: 'Beta', gestorNome: 'Outra Gestora', entrouEm: '2026-02-02T12:00:00Z' };
  let fixture: ComponentFixture<PromotorVinculosComponent>;
  const convitePendente = (id: string, marcaNome: string) => ({
    id,
    marcaNome,
    gestorNome: 'Gestor',
    expiraEm: '2026-03-08T12:00:00Z',
    criadoEm: '2026-03-01T12:00:00Z',
  });
  let promotorService: jasmine.SpyObj<PromotorService>;
  let conviteService: jasmine.SpyObj<ConviteService>;

  beforeEach(async () => {
    promotorService = jasmine.createSpyObj<PromotorService>('PromotorService', ['meusVinculos', 'sair']);
    conviteService = jasmine.createSpyObj<ConviteService>('ConviteService', ['recebidos', 'aceitarPorId', 'recusarPorId']);
    conviteService.recebidos.and.returnValue(of({ convites: [] }));
    await TestBed.configureTestingModule({
      imports: [PromotorVinculosComponent],
      providers: [
        provideRouter([]),
        { provide: PromotorService, useValue: promotorService },
        { provide: ConviteService, useValue: conviteService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PromotorVinculosComponent);
  });

  const elemento = (): HTMLElement => fixture.nativeElement as HTMLElement;

  function iniciar(vinculos: VinculoPromotor[]): void {
    promotorService.meusVinculos.and.returnValue(of({ vinculos }));
    fixture.detectChanges();
  }

  function botao(texto: string): HTMLButtonElement {
    return Array.from(elemento().querySelectorAll('button')).find((b) => b.textContent?.trim() === texto)!;
  }

  it('mostra o carregamento enquanto busca', () => {
    promotorService.meusVinculos.and.returnValue(new Subject<MeusVinculos>());
    fixture.detectChanges();

    expect(elemento().textContent).toContain('Carregando...');
  });

  it('lista as marcas em que o usuário é promotor, com o gestor', () => {
    iniciar([alfa, beta]);

    const texto = elemento().textContent ?? '';
    expect(texto).toContain('Alfa');
    expect(texto).toContain('Gestor: Gestor Silva');
    expect(texto).toContain('Beta');
  });

  it('explica como receber convites quando não há vínculos', () => {
    iniciar([]);

    expect(elemento().textContent).toContain('Você ainda não é promotor de nenhuma marca');
  });

  it('mostra os convites pendentes na própria página', () => {
    conviteService.recebidos.and.returnValue(of({ convites: [convitePendente('c1', 'Gama')] }));
    iniciar([]);

    expect(elemento().querySelector('[data-testid="convite-recebido"]')?.textContent).toContain('Gama');
  });

  it('recarrega as marcas depois de aceitar um convite, mas não depois de recusar', () => {
    conviteService.recebidos.and.returnValue(of({ convites: [convitePendente('c1', 'Gama'), convitePendente('c2', 'Delta')] }));
    conviteService.aceitarPorId.and.returnValue(of({ marcaId: 'm4', marcaNome: 'Delta', gestorNome: 'Gestor', entrouEm: '2026-03-03T12:00:00Z' }));
    conviteService.recusarPorId.and.returnValue(of(undefined));
    iniciar([alfa]);
    expect(promotorService.meusVinculos).toHaveBeenCalledTimes(1);

    botao('Recusar').click();
    fixture.detectChanges();
    expect(promotorService.meusVinculos).toHaveBeenCalledTimes(1);

    promotorService.meusVinculos.and.returnValue(
      of({ vinculos: [alfa, { marcaId: 'm4', marcaNome: 'Delta', gestorNome: 'Gestor', entrouEm: '2026-03-03T12:00:00Z' }] }),
    );
    botao('Aceitar').click();
    fixture.detectChanges();

    expect(promotorService.meusVinculos).toHaveBeenCalledTimes(2);
    expect(elemento().textContent).toContain('Gestor: Gestor');
  });

  it('mostra erro e permite tentar de novo quando a busca falha', () => {
    promotorService.meusVinculos.and.returnValues(throwError(() => new Error('falha')), of({ vinculos: [alfa] }));
    fixture.detectChanges();

    expect(elemento().querySelector('[role="alert"]')?.textContent).toContain('Não foi possível carregar suas marcas como promotor');

    botao('Tentar de novo').click();
    fixture.detectChanges();

    expect(promotorService.meusVinculos).toHaveBeenCalledTimes(2);
    expect(elemento().textContent).toContain('Alfa');
  });

  it('pede confirmação antes de sair e permite cancelar', () => {
    iniciar([alfa]);

    botao('Sair da marca').click();
    fixture.detectChanges();

    expect(elemento().querySelector('[role="alertdialog"]')?.textContent).toContain('será preciso receber um novo convite');
    expect(promotorService.sair).not.toHaveBeenCalled();

    botao('Cancelar').click();
    fixture.detectChanges();

    expect(elemento().querySelector('[role="alertdialog"]')).toBeNull();
  });

  it('sai da marca confirmada e a remove da lista', () => {
    iniciar([alfa, beta]);
    promotorService.sair.and.returnValue(of(undefined));

    botao('Sair da marca').click();
    fixture.detectChanges();
    botao('Sair da marca').click();
    fixture.detectChanges();

    expect(promotorService.sair).toHaveBeenCalledWith('m1');
    expect(elemento().textContent).not.toContain('Gestor Silva');
    expect(elemento().textContent).toContain('Beta');
  });

  it('mantém a marca e mostra o erro quando a saída falha', () => {
    iniciar([alfa]);
    promotorService.sair.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 404, error: { codigo: 'RECURSO_NAO_ENCONTRADO', detail: 'Recurso não encontrado.' } })),
    );

    botao('Sair da marca').click();
    fixture.detectChanges();
    botao('Sair da marca').click();
    fixture.detectChanges();

    expect(elemento().textContent).toContain('Alfa');
    expect(elemento().querySelector('[role="alert"]')?.textContent).toContain('Recurso não encontrado.');
  });
});
