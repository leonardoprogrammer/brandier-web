import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ApiDoGoogle, GoogleScriptService, OpcoesDeInicializacaoDoGoogle } from '../../services/google-script.service';
import { GoogleButtonComponent } from './google-button.component';

describe('GoogleButtonComponent', () => {
  let fixture: ComponentFixture<GoogleButtonComponent>;
  let api: jasmine.SpyObj<ApiDoGoogle['accounts']['id']>;
  let scriptService: jasmine.SpyObj<GoogleScriptService>;
  let opcoes: OpcoesDeInicializacaoDoGoogle;
  let credenciais: string[];

  beforeEach(async () => {
    api = jasmine.createSpyObj<ApiDoGoogle['accounts']['id']>('ApiDoGoogle', ['initialize', 'renderButton']);
    api.initialize.and.callFake((opcoesRecebidas) => {
      opcoes = opcoesRecebidas;
    });
    scriptService = jasmine.createSpyObj<GoogleScriptService>('GoogleScriptService', ['carregar']);
    scriptService.carregar.and.resolveTo({ accounts: { id: api } });
    await TestBed.configureTestingModule({
      imports: [GoogleButtonComponent],
      providers: [{ provide: GoogleScriptService, useValue: scriptService }],
    }).compileComponents();

    fixture = TestBed.createComponent(GoogleButtonComponent);
    fixture.componentRef.setInput('clientId', 'client-id-de-teste');
    credenciais = [];
    fixture.componentInstance.credential.subscribe((valor) => credenciais.push(valor));
  });

  const elemento = (): HTMLElement => fixture.nativeElement as HTMLElement;

  async function iniciar(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  it('inicializa com o client id e desenha o botão dentro da área do componente', async () => {
    await iniciar();

    expect(api.initialize).toHaveBeenCalledTimes(1);
    expect(opcoes.client_id).toBe('client-id-de-teste');
    const [areaUsada] = api.renderButton.calls.mostRecent().args;
    expect(areaUsada).toBe(elemento().querySelector('div') as HTMLElement);
  });

  it('emite a credencial quando o Google autentica', async () => {
    await iniciar();

    opcoes.callback({ credential: 'credencial-do-google' });

    expect(credenciais).toEqual(['credencial-do-google']);
  });

  it('mostra erro quando o script do Google não carrega', async () => {
    scriptService.carregar.and.rejectWith(new Error('falha'));

    await iniciar();

    expect(elemento().querySelector('[data-testid="google-erro"]')?.textContent).toContain('Não foi possível carregar o login com Google');
    expect(api.initialize).not.toHaveBeenCalled();
  });

  it('não inicializa se o componente for destruído antes de o script carregar', async () => {
    let liberar!: (valor: ApiDoGoogle) => void;
    scriptService.carregar.and.returnValue(new Promise<ApiDoGoogle>((resolver) => (liberar = resolver)));
    fixture.detectChanges();

    fixture.destroy();
    liberar({ accounts: { id: api } });
    await Promise.resolve();

    expect(api.initialize).not.toHaveBeenCalled();
  });
});
