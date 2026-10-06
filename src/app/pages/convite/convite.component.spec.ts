import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';

import { ConviteRecebido, VinculoPromotor } from '../../models/promotor.model';
import { AuthService } from '../../services/auth.service';
import { ConviteService } from '../../services/convite.service';
import { ConviteComponent } from './convite.component';

describe('ConviteComponent', () => {
  const recebido: ConviteRecebido = { marcaNome: 'Alfa', gestorNome: 'Gestor Silva', email: 'eu@exemplo.com', expiraEm: '2026-03-08T12:00:00Z' };
  const vinculo: VinculoPromotor = { marcaId: 'm1', marcaNome: 'Alfa', gestorNome: 'Gestor Silva', entrouEm: '2026-03-01T12:00:00Z' };
  let fixture: ComponentFixture<ConviteComponent>;
  let conviteService: jasmine.SpyObj<ConviteService>;
  let router: Router;

  async function montar(token: string | null, autenticado: boolean): Promise<void> {
    conviteService = jasmine.createSpyObj<ConviteService>('ConviteService', ['consultar', 'aceitar', 'recusar']);
    const auth = jasmine.createSpyObj<AuthService>('AuthService', ['sair']);
    Object.defineProperty(auth, 'autenticado', { value: signal(autenticado).asReadonly() });
    await TestBed.configureTestingModule({
      imports: [ConviteComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        { provide: ConviteService, useValue: conviteService },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(token === null ? {} : { token }) } } },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    fixture = TestBed.createComponent(ConviteComponent);
  }

  const elemento = (): HTMLElement => fixture.nativeElement as HTMLElement;

  function botao(texto: string): HTMLButtonElement {
    return Array.from(elemento().querySelectorAll('button')).find((b) => b.textContent?.trim() === texto)!;
  }

  it('sem token mostra que o link está incompleto e não chama a API', async () => {
    await montar(null, true);
    fixture.detectChanges();

    expect(elemento().querySelector('[role="alert"]')?.textContent).toContain('O link do convite está incompleto.');
    expect(conviteService.consultar).not.toHaveBeenCalled();
  });

  it('sem sessão pede para entrar ou criar conta e mantém o token na barra de endereço', async () => {
    await montar('abc', false);
    fixture.detectChanges();

    expect(elemento().textContent).toContain('crie uma conta com esse e-mail');
    expect(elemento().querySelector('a[href="/entrar"]')).not.toBeNull();
    expect(elemento().querySelector('a[href="/cadastro"]')).not.toBeNull();
    expect(conviteService.consultar).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('com sessão remove o token da barra de endereço e consulta o convite', async () => {
    await montar('abc', true);
    conviteService.consultar.and.returnValue(of(recebido));
    fixture.detectChanges();

    expect(router.navigate).toHaveBeenCalledWith([], { queryParams: { token: null }, queryParamsHandling: 'merge', replaceUrl: true });
    expect(conviteService.consultar).toHaveBeenCalledWith('abc');
    const texto = elemento().textContent ?? '';
    expect(texto).toContain('Gestor Silva');
    expect(texto).toContain('Alfa');
    expect(botao('Aceitar convite')).toBeDefined();
    expect(botao('Recusar')).toBeDefined();
  });

  it('mostra o erro do servidor quando o convite é inválido', async () => {
    await montar('abc', true);
    conviteService.consultar.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 400, error: { codigo: 'TOKEN_CONVITE_INVALIDO', detail: 'O convite é inválido, expirou ou foi enviado para outro e-mail.' } })),
    );
    fixture.detectChanges();

    expect(elemento().querySelector('[role="alert"]')?.textContent).toContain('foi enviado para outro e-mail');
    expect(elemento().querySelector('button')).toBeNull();
  });

  it('aceitar envia o token e mostra a confirmação com atalho para as marcas como promotor', async () => {
    await montar('abc', true);
    conviteService.consultar.and.returnValue(of(recebido));
    conviteService.aceitar.and.returnValue(of(vinculo));
    fixture.detectChanges();

    botao('Aceitar convite').click();
    fixture.detectChanges();

    expect(conviteService.aceitar).toHaveBeenCalledWith('abc');
    expect(elemento().querySelector('[role="status"]')?.textContent).toContain('Você agora é promotor da marca Alfa');
    expect(elemento().querySelector('a[href="/painel/promotor"]')).not.toBeNull();
  });

  it('recusar envia o token e confirma a recusa', async () => {
    await montar('abc', true);
    conviteService.consultar.and.returnValue(of(recebido));
    conviteService.recusar.and.returnValue(of(undefined));
    fixture.detectChanges();

    botao('Recusar').click();
    fixture.detectChanges();

    expect(conviteService.recusar).toHaveBeenCalledWith('abc');
    expect(elemento().textContent).toContain('Convite recusado');
  });

  it('desabilita os botões enquanto responde', async () => {
    await montar('abc', true);
    conviteService.consultar.and.returnValue(of(recebido));
    conviteService.aceitar.and.returnValue(new Subject<VinculoPromotor>());
    fixture.detectChanges();

    botao('Aceitar convite').click();
    fixture.detectChanges();

    expect(botao('Enviando...').disabled).toBeTrue();
    expect(botao('Recusar').disabled).toBeTrue();
  });

  it('mostra o erro quando aceitar falha', async () => {
    await montar('abc', true);
    conviteService.consultar.and.returnValue(of(recebido));
    conviteService.aceitar.and.returnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
    fixture.detectChanges();

    botao('Aceitar convite').click();
    fixture.detectChanges();

    expect(elemento().querySelector('[role="alert"]')?.textContent).toContain('Não foi possível conectar ao servidor');
  });
});
