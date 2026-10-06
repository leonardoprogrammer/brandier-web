import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ApiDoTurnstile, OpcoesDoTurnstile, TurnstileScriptService } from '../../services/turnstile-script.service';
import { TurnstileComponent } from './turnstile.component';

describe('TurnstileComponent', () => {
  let fixture: ComponentFixture<TurnstileComponent>;
  let api: jasmine.SpyObj<ApiDoTurnstile>;
  let scriptService: jasmine.SpyObj<TurnstileScriptService>;
  let opcoes: OpcoesDoTurnstile;
  let tokens: (string | null)[];

  beforeEach(async () => {
    api = jasmine.createSpyObj<ApiDoTurnstile>('ApiDoTurnstile', ['render', 'reset', 'remove']);
    api.render.and.callFake((_elemento, opcoesRecebidas) => {
      opcoes = opcoesRecebidas;
      return 'widget-1';
    });
    scriptService = jasmine.createSpyObj<TurnstileScriptService>('TurnstileScriptService', ['carregar']);
    scriptService.carregar.and.resolveTo(api);
    await TestBed.configureTestingModule({
      imports: [TurnstileComponent],
      providers: [{ provide: TurnstileScriptService, useValue: scriptService }],
    }).compileComponents();

    fixture = TestBed.createComponent(TurnstileComponent);
    fixture.componentRef.setInput('siteKey', 'chave-publica-de-teste');
    tokens = [];
    fixture.componentInstance.token.subscribe((valor) => tokens.push(valor));
  });

  const elemento = (): HTMLElement => fixture.nativeElement as HTMLElement;

  async function iniciar(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('renderiza o widget com a chave pública, em português e tema claro', async () => {
    await iniciar();

    expect(api.render).toHaveBeenCalledTimes(1);
    expect(opcoes.sitekey).toBe('chave-publica-de-teste');
    expect(opcoes.language).toBe('pt-br');
    expect(opcoes.theme).toBe('light');
  });

  it('desenha o widget dentro da área do componente', async () => {
    await iniciar();

    const [areaUsada] = api.render.calls.mostRecent().args;
    expect(areaUsada).toBe(elemento().querySelector('div') as HTMLElement);
  });

  it('emite o token quando o usuário passa na verificação', async () => {
    await iniciar();

    opcoes.callback('token-gerado');

    expect(tokens).toEqual(['token-gerado']);
  });

  it('emite nulo quando o token expira ou o widget dá erro', async () => {
    await iniciar();

    opcoes['expired-callback']();
    opcoes['error-callback']();

    expect(tokens).toEqual([null, null]);
  });

  it('reiniciar zera o token e pede um widget novo ao Cloudflare', async () => {
    await iniciar();
    opcoes.callback('token-usado');

    fixture.componentInstance.reiniciar();

    expect(tokens).toEqual(['token-usado', null]);
    expect(api.reset).toHaveBeenCalledOnceWith('widget-1');
  });

  it('reiniciar antes de o widget existir só emite nulo', () => {
    scriptService.carregar.and.returnValue(new Promise(() => undefined));
    fixture.detectChanges();

    fixture.componentInstance.reiniciar();

    expect(tokens).toEqual([null]);
    expect(api.reset).not.toHaveBeenCalled();
  });

  it('mostra erro quando o script do Cloudflare não carrega', async () => {
    scriptService.carregar.and.rejectWith(new Error('falha'));

    await iniciar();

    expect(elemento().querySelector('[data-testid="turnstile-erro"]')?.textContent).toContain('Não foi possível carregar a verificação de segurança');
    expect(api.render).not.toHaveBeenCalled();
  });

  it('remove o widget ao destruir o componente', async () => {
    await iniciar();

    fixture.destroy();

    expect(api.remove).toHaveBeenCalledOnceWith('widget-1');
  });

  it('não renderiza se o componente for destruído antes de o script carregar', async () => {
    let liberar!: (valor: ApiDoTurnstile) => void;
    scriptService.carregar.and.returnValue(new Promise<ApiDoTurnstile>((resolver) => (liberar = resolver)));
    fixture.detectChanges();

    fixture.destroy();
    liberar(api);
    await Promise.resolve();

    expect(api.render).not.toHaveBeenCalled();
    expect(api.remove).not.toHaveBeenCalled();
  });
});
