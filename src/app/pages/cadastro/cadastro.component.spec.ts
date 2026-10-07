import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed, discardPeriodicTasks, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { CHAVE_DO_TURNSTILE } from '../../core/turnstile';
import { AuthService } from '../../services/auth.service';
import { ApiDoTurnstile, OpcoesDoTurnstile, TurnstileScriptService } from '../../services/turnstile-script.service';
import { CadastroComponent } from './cadastro.component';

describe('CadastroComponent', () => {
  let fixture: ComponentFixture<CadastroComponent>;
  let auth: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['cadastrar', 'reenviarVerificacao']);
    await TestBed.configureTestingModule({
      imports: [CadastroComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        { provide: CHAVE_DO_TURNSTILE, useValue: '' },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CadastroComponent);
    fixture.detectChanges();
  });

  const elemento = (): HTMLElement => fixture.nativeElement as HTMLElement;

  function digitar(id: string, valor: string): void {
    const campo = elemento().querySelector<HTMLInputElement>(`#${id}`)!;
    campo.value = valor;
    campo.dispatchEvent(new Event('input'));
  }

  function marcarTermos(): void {
    const campo = elemento().querySelector<HTMLInputElement>('#aceitouTermos')!;
    campo.checked = true;
    campo.dispatchEvent(new Event('change'));
  }

  function preencherCorretamente(): void {
    digitar('nome', '  Pessoa Teste ');
    digitar('email', ' pessoa@exemplo.com ');
    digitar('senha', 'Senha1234');
    digitar('confirmarSenha', 'Senha1234');
    marcarTermos();
    fixture.detectChanges();
  }

  function enviar(): void {
    elemento().querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  it('liga os termos à página Sobre, abrindo em nova aba', () => {
    const link = elemento().querySelector<HTMLAnchorElement>('label[for="aceitouTermos"] a');

    expect(link).not.toBeNull();
    expect(link!.getAttribute('href')).toBe('/sobre');
    expect(link!.target).toBe('_blank');
    expect(link!.rel).toContain('noopener');
  });

  it('não envia e mostra os erros quando o formulário está vazio', () => {
    enviar();

    expect(auth.cadastrar).not.toHaveBeenCalled();
    const texto = elemento().textContent ?? '';
    expect(texto).toContain('Informe seu nome.');
    expect(texto).toContain('Informe seu e-mail.');
    expect(texto).toContain('Informe uma senha.');
    expect(texto).toContain('É necessário aceitar os termos');
  });

  it('atualiza os requisitos da senha enquanto digita', () => {
    digitar('senha', 'abcdefgh');
    fixture.detectChanges();

    const itens = Array.from(elemento().querySelectorAll('#senha-requisitos li'));
    expect(itens[0].textContent).toContain('✓');
    expect(itens[1].textContent).toContain('✓');
    expect(itens[2].textContent).toContain('•');
  });

  it('rejeita senha sem número', () => {
    digitar('nome', 'Pessoa');
    digitar('email', 'pessoa@exemplo.com');
    digitar('senha', 'somenteletras');
    digitar('confirmarSenha', 'somenteletras');
    marcarTermos();
    fixture.detectChanges();

    enviar();

    expect(auth.cadastrar).not.toHaveBeenCalled();
    expect(elemento().textContent).toContain('A senha deve conter letras e números.');
  });

  it('rejeita confirmação diferente da senha', () => {
    preencherCorretamente();
    digitar('confirmarSenha', 'Senha9999');
    fixture.detectChanges();

    enviar();

    expect(auth.cadastrar).not.toHaveBeenCalled();
    expect(elemento().textContent).toContain('As senhas não conferem.');
  });

  it('rejeita senha acima do limite de bytes', () => {
    preencherCorretamente();
    digitar('senha', 'é1'.repeat(30));
    digitar('confirmarSenha', 'é1'.repeat(30));
    fixture.detectChanges();

    enviar();

    expect(auth.cadastrar).not.toHaveBeenCalled();
    expect(elemento().textContent).toContain('A senha é longa demais');
  });

  describe('envio válido', () => {
    beforeEach(fakeAsync(() => {
      auth.cadastrar.and.returnValue(of({ message: 'ok' }));
      preencherCorretamente();
      enviar();
      discardPeriodicTasks();
    }));

    it('envia os dados sem espaços nas pontas e sem a confirmação de senha', () => {
      expect(auth.cadastrar).toHaveBeenCalledWith({
        nome: 'Pessoa Teste',
        email: 'pessoa@exemplo.com',
        senha: 'Senha1234',
        aceitouTermos: true,
      });
    });

    it('mostra a tela de verificação de e-mail com o endereço informado', () => {
      expect(elemento().querySelector('h1')?.textContent).toContain('Verifique seu e-mail');
      expect(elemento().textContent).toContain('pessoa@exemplo.com');
      expect(elemento().querySelector('form')).toBeNull();
    });

    it('bloqueia o reenvio durante o intervalo', () => {
      const botao = Array.from(elemento().querySelectorAll('button')).find((b) =>
        b.textContent?.includes('Reenviar e-mail'),
      )!;

      expect(botao.disabled).toBeTrue();
      expect(botao.textContent).toContain('60s');
    });
  });

  it('libera o reenvio depois do intervalo e reenvia o e-mail', fakeAsync(() => {
    auth.cadastrar.and.returnValue(of({ message: 'ok' }));
    auth.reenviarVerificacao.and.returnValue(of({ message: 'ok' }));
    preencherCorretamente();
    enviar();

    tick(60_000);
    fixture.detectChanges();

    const botao = Array.from(elemento().querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Reenviar e-mail de verificação'),
    )!;
    expect(botao.disabled).toBeFalse();

    botao.click();
    fixture.detectChanges();

    expect(auth.reenviarVerificacao).toHaveBeenCalledWith('pessoa@exemplo.com');
    expect(elemento().textContent).toContain('Pedido de reenvio registrado');
    discardPeriodicTasks();
  }));

  it('mostra no campo o erro de validação devolvido pela API', () => {
    auth.cadastrar.and.returnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: {
              codigo: 'VALIDACAO_INVALIDA',
              erros: [{ campo: 'email', mensagem: 'Informe um e-mail válido' }],
            },
          }),
      ),
    );
    preencherCorretamente();

    enviar();

    expect(elemento().querySelector('#email-erro')?.textContent).toContain('Informe um e-mail válido');
    expect(elemento().querySelector('h1')?.textContent).toContain('Criar conta');
  });

  it('mostra no campo de e-mail a recusa de e-mail descartável', () => {
    auth.cadastrar.and.returnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: {
              codigo: 'EMAIL_DESCARTAVEL',
              detail: 'E-mails temporários ou descartáveis não são aceitos. Use um e-mail permanente.',
            },
          }),
      ),
    );
    preencherCorretamente();

    enviar();

    expect(elemento().querySelector('#email-erro')?.textContent).toContain('E-mails temporários ou descartáveis');
    expect(elemento().querySelector('h1')?.textContent).toContain('Criar conta');
    expect(elemento().querySelector('#email')?.getAttribute('aria-invalid')).toBe('true');
  });

  it('mostra erro geral quando a API está indisponível', () => {
    auth.cadastrar.and.returnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
    preencherCorretamente();

    enviar();

    expect(elemento().querySelector('[role="alert"]')?.textContent).toContain('Não foi possível conectar');
  });
});

describe('CadastroComponent com Turnstile', () => {
  let fixture: ComponentFixture<CadastroComponent>;
  let auth: jasmine.SpyObj<AuthService>;
  let scriptService: jasmine.SpyObj<TurnstileScriptService>;
  let api: jasmine.SpyObj<ApiDoTurnstile>;
  let opcoes: OpcoesDoTurnstile;

  async function montar(chave: string): Promise<void> {
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['cadastrar', 'reenviarVerificacao']);
    api = jasmine.createSpyObj<ApiDoTurnstile>('ApiDoTurnstile', ['render', 'reset', 'remove']);
    api.render.and.callFake((_elemento, recebidas) => {
      opcoes = recebidas;
      return 'widget';
    });
    scriptService = jasmine.createSpyObj<TurnstileScriptService>('TurnstileScriptService', ['carregar']);
    scriptService.carregar.and.resolveTo(api);
    await TestBed.configureTestingModule({
      imports: [CadastroComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        { provide: CHAVE_DO_TURNSTILE, useValue: chave },
        { provide: TurnstileScriptService, useValue: scriptService },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(CadastroComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  const elemento = (): HTMLElement => fixture.nativeElement as HTMLElement;

  function preencher(): void {
    const digitar = (id: string, valor: string): void => {
      const campo = elemento().querySelector<HTMLInputElement>(`#${id}`)!;
      campo.value = valor;
      campo.dispatchEvent(new Event('input'));
    };
    digitar('nome', 'Pessoa Teste');
    digitar('email', 'pessoa@exemplo.com');
    digitar('senha', 'Senha1234');
    digitar('confirmarSenha', 'Senha1234');
    const termos = elemento().querySelector<HTMLInputElement>('#aceitouTermos')!;
    termos.checked = true;
    termos.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }

  function enviar(): void {
    elemento().querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  it('sem chave configurada não mostra o widget e envia sem token', async () => {
    await montar('');
    auth.cadastrar.and.returnValue(of({ message: 'ok' }));
    preencher();

    enviar();

    expect(elemento().querySelector('app-turnstile')).toBeNull();
    expect(scriptService.carregar).not.toHaveBeenCalled();
    expect(auth.cadastrar.calls.mostRecent().args[0].turnstileToken).toBeUndefined();
  });

  it('com chave configurada mostra o widget usando a chave pública', async () => {
    await montar('chave-publica');

    expect(elemento().querySelector('app-turnstile')).not.toBeNull();
    expect(opcoes.sitekey).toBe('chave-publica');
  });

  it('não envia sem passar na verificação e avisa o usuário', async () => {
    await montar('chave-publica');
    preencher();

    enviar();

    expect(auth.cadastrar).not.toHaveBeenCalled();
    expect(elemento().querySelector('[data-testid="turnstile-pendente"]')?.textContent).toContain('Confirme a verificação de segurança');
  });

  it('avisa da verificação também quando o formulário está inválido e ainda sem token', async () => {
    await montar('chave-publica');

    enviar();

    expect(auth.cadastrar).not.toHaveBeenCalled();
    expect(elemento().querySelector('[data-testid="turnstile-pendente"]')).not.toBeNull();
  });

  it('envia o token do widget junto com os dados do cadastro', async () => {
    await montar('chave-publica');
    auth.cadastrar.and.returnValue(of({ message: 'ok' }));
    preencher();
    opcoes.callback('token-do-widget');
    fixture.detectChanges();

    enviar();

    expect(auth.cadastrar).toHaveBeenCalledOnceWith({
      nome: 'Pessoa Teste',
      email: 'pessoa@exemplo.com',
      senha: 'Senha1234',
      aceitouTermos: true,
      turnstileToken: 'token-do-widget',
    });
  });

  it('o aviso some depois de passar na verificação', async () => {
    await montar('chave-publica');
    preencher();
    enviar();
    expect(elemento().querySelector('[data-testid="turnstile-pendente"]')).not.toBeNull();

    opcoes.callback('token');
    fixture.detectChanges();

    expect(elemento().querySelector('[data-testid="turnstile-pendente"]')).toBeNull();
  });

  it('token que expira volta a exigir a verificação', async () => {
    await montar('chave-publica');
    preencher();
    opcoes.callback('token');
    opcoes['expired-callback']();
    fixture.detectChanges();

    enviar();

    expect(auth.cadastrar).not.toHaveBeenCalled();
  });

  it('reinicia o widget quando o servidor recusa, pois o token é de uso único', async () => {
    await montar('chave-publica');
    auth.cadastrar.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 400, error: { codigo: 'CAPTCHA_INVALIDO', detail: 'Não foi possível validar a verificação de segurança. Tente novamente.' } })),
    );
    preencher();
    opcoes.callback('token-ruim');
    fixture.detectChanges();

    enviar();

    expect(api.reset).toHaveBeenCalledOnceWith('widget');
    expect(elemento().querySelector('[role="alert"]')?.textContent).toContain('verificação de segurança');
    enviar();
    expect(auth.cadastrar).toHaveBeenCalledTimes(1);
  });

  it('mostra a mensagem quando o teto global de contas foi atingido', async () => {
    await montar('');
    auth.cadastrar.and.returnValue(
      throwError(() => new HttpErrorResponse({ status: 409, error: { codigo: 'LIMITE_CONTAS_ATINGIDO', detail: 'O limite de contas desta demonstração foi atingido. Tente novamente mais tarde.' } })),
    );
    preencher();

    enviar();

    expect(elemento().querySelector('[role="alert"]')?.textContent).toContain('limite de contas desta demonstração');
  });
});
