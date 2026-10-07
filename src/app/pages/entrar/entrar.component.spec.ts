import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';

import { Usuario } from '../../models/usuario.model';
import { AuthService } from '../../services/auth.service';
import { EntrarComponent } from './entrar.component';

describe('EntrarComponent', () => {
  let fixture: ComponentFixture<EntrarComponent>;
  let auth: jasmine.SpyObj<AuthService>;
  let router: Router;

  const usuario: Usuario = { id: '1', nome: 'Pessoa Teste', email: 'pessoa@exemplo.com' };

  beforeEach(async () => {
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['entrar', 'reenviarVerificacao']);
    await TestBed.configureTestingModule({
      imports: [EntrarComponent],
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
    }).compileComponents();

    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    fixture = TestBed.createComponent(EntrarComponent);
    fixture.detectChanges();
  });

  const elemento = (): HTMLElement => fixture.nativeElement as HTMLElement;

  function preencher(email: string, senha: string): void {
    const campoEmail = elemento().querySelector<HTMLInputElement>('#email')!;
    const campoSenha = elemento().querySelector<HTMLInputElement>('#senha')!;
    campoEmail.value = email;
    campoEmail.dispatchEvent(new Event('input'));
    campoSenha.value = senha;
    campoSenha.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function enviar(): void {
    elemento().querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  function erroHttp(status: number, corpo: object): HttpErrorResponse {
    return new HttpErrorResponse({ status, error: corpo });
  }

  it('mostra o formulário e o link para criar conta', () => {
    expect(elemento().querySelector('h1')?.textContent).toContain('Entrar');
    expect(elemento().querySelector('a[href="/cadastro"]')).not.toBeNull();
  });

  it('oferece o caminho para redefinir a senha', () => {
    const link = elemento().querySelector('a[href="/esqueci-senha"]');

    expect(link).not.toBeNull();
    expect(link!.textContent).toContain('Esqueci minha senha');
  });

  it('tem o link para a página Sobre no rodapé', () => {
    expect(elemento().querySelector('a[href="/sobre"]')).not.toBeNull();
  });

  it('não envia e mostra os erros quando o formulário está vazio', () => {
    enviar();

    expect(auth.entrar).not.toHaveBeenCalled();
    expect(elemento().textContent).toContain('Informe seu e-mail.');
    expect(elemento().textContent).toContain('Informe sua senha.');
  });

  it('rejeita e-mail em formato inválido', () => {
    preencher('nao-eh-email', 'Senha1234');
    enviar();

    expect(auth.entrar).not.toHaveBeenCalled();
    expect(elemento().textContent).toContain('Informe um e-mail válido.');
  });

  it('entra e vai para o painel quando as credenciais estão corretas', () => {
    auth.entrar.and.returnValue(of(usuario));
    preencher('pessoa@exemplo.com', 'Senha1234');

    enviar();

    expect(auth.entrar).toHaveBeenCalledWith('pessoa@exemplo.com', 'Senha1234');
    expect(router.navigate).toHaveBeenCalledWith(['/painel']);
  });

  it('mostra mensagem de credenciais incorretas', () => {
    auth.entrar.and.returnValue(throwError(() => erroHttp(401, { codigo: 'NAO_AUTENTICADO' })));
    preencher('pessoa@exemplo.com', 'errada');

    enviar();

    expect(elemento().querySelector('[role="alert"]')?.textContent).toContain('E-mail ou senha incorretos.');
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('mostra falha de conexão quando a API não responde', () => {
    auth.entrar.and.returnValue(throwError(() => erroHttp(0, {})));
    preencher('pessoa@exemplo.com', 'Senha1234');

    enviar();

    expect(elemento().textContent).toContain('Não foi possível conectar ao servidor');
  });

  it('oferece o reenvio quando o e-mail ainda não foi verificado', () => {
    auth.entrar.and.returnValue(throwError(() => erroHttp(403, { codigo: 'EMAIL_NAO_VERIFICADO' })));
    auth.reenviarVerificacao.and.returnValue(of({ message: 'ok' }));
    preencher('pessoa@exemplo.com', 'Senha1234');

    enviar();
    expect(elemento().textContent).toContain('Seu e-mail ainda não foi verificado');

    const botao = Array.from(elemento().querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Reenviar e-mail de verificação'),
    )!;
    botao.click();
    fixture.detectChanges();

    expect(auth.reenviarVerificacao).toHaveBeenCalledWith('pessoa@exemplo.com');
    expect(elemento().textContent).toContain('enviaremos um novo link');
  });

  it('alterna a visibilidade da senha', () => {
    const campo = elemento().querySelector<HTMLInputElement>('#senha')!;
    expect(campo.type).toBe('password');

    Array.from(elemento().querySelectorAll('button')).find((b) => b.textContent?.trim() === 'Mostrar')!.click();
    fixture.detectChanges();

    expect(campo.type).toBe('text');
  });

  it('desabilita o botão e mostra o progresso enquanto envia', () => {
    const resposta = new Subject<Usuario>();
    auth.entrar.and.returnValue(resposta);
    preencher('pessoa@exemplo.com', 'Senha1234');

    enviar();

    const botao = elemento().querySelector<HTMLButtonElement>('button[type="submit"]')!;
    expect(botao.disabled).toBeTrue();
    expect(botao.textContent).toContain('Entrando...');

    resposta.next(usuario);
    resposta.complete();
    fixture.detectChanges();

    expect(botao.disabled).toBeFalse();
  });
});

describe('EntrarComponent com avisos pela URL', () => {
  async function montar(parametros: Record<string, string>): Promise<HTMLElement> {
    const auth = jasmine.createSpyObj<AuthService>('AuthService', ['entrar', 'reenviarVerificacao']);
    await TestBed.configureTestingModule({
      imports: [EntrarComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(parametros) } } },
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(EntrarComponent);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  }

  it('mostra a confirmação quando a conta acabou de ser excluída', async () => {
    const tela = await montar({ contaExcluida: 'true' });

    expect(tela.querySelector('[data-testid="conta-excluida"]')?.textContent).toContain('Sua conta foi excluída');
    expect(tela.textContent).not.toContain('Sua sessão expirou');
  });

  it('mostra o aviso de sessão expirada sem a confirmação de conta excluída', async () => {
    const tela = await montar({ sessaoExpirada: 'true' });

    expect(tela.textContent).toContain('Sua sessão expirou');
    expect(tela.querySelector('[data-testid="conta-excluida"]')).toBeNull();
  });

  it('mostra a confirmação quando a senha acabou de ser alterada', async () => {
    const tela = await montar({ senhaAlterada: 'true' });

    expect(tela.querySelector('[data-testid="senha-alterada"]')?.textContent).toContain('Senha alterada com sucesso');
    expect(tela.querySelector('[data-testid="conta-excluida"]')).toBeNull();
  });

  it('sem parâmetros não mostra nenhum aviso', async () => {
    const tela = await montar({});

    expect(tela.querySelector('[data-testid="conta-excluida"]')).toBeNull();
    expect(tela.querySelector('[data-testid="senha-alterada"]')).toBeNull();
    expect(tela.textContent).not.toContain('Sua sessão expirou');
  });
});
