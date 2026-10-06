import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';

import { AuthService } from '../../services/auth.service';
import { EsqueciSenhaComponent } from './esqueci-senha.component';

describe('EsqueciSenhaComponent', () => {
  let fixture: ComponentFixture<EsqueciSenhaComponent>;
  let auth: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['solicitarRedefinicaoSenha']);
    await TestBed.configureTestingModule({
      imports: [EsqueciSenhaComponent],
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
    }).compileComponents();

    fixture = TestBed.createComponent(EsqueciSenhaComponent);
    fixture.detectChanges();
  });

  const elemento = (): HTMLElement => fixture.nativeElement as HTMLElement;

  function preencher(email: string): void {
    const campo = elemento().querySelector<HTMLInputElement>('#email')!;
    campo.value = email;
    campo.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function enviar(): void {
    elemento().querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  it('mostra o formulário com o link para voltar a entrar', () => {
    expect(elemento().querySelector('h1')?.textContent).toContain('Esqueci minha senha');
    expect(elemento().querySelector('a[href="/entrar"]')).not.toBeNull();
  });

  it('não envia e mostra o erro quando o e-mail está vazio', () => {
    enviar();

    expect(auth.solicitarRedefinicaoSenha).not.toHaveBeenCalled();
    expect(elemento().textContent).toContain('Informe seu e-mail.');
  });

  it('rejeita e-mail em formato inválido', () => {
    preencher('nao-eh-email');
    enviar();

    expect(auth.solicitarRedefinicaoSenha).not.toHaveBeenCalled();
    expect(elemento().textContent).toContain('Informe um e-mail válido.');
  });

  it('envia o e-mail sem espaços nas pontas e mostra a confirmação genérica', () => {
    auth.solicitarRedefinicaoSenha.and.returnValue(of({ message: 'ok' }));
    preencher(' pessoa@exemplo.com ');

    enviar();

    expect(auth.solicitarRedefinicaoSenha).toHaveBeenCalledWith('pessoa@exemplo.com');
    expect(elemento().querySelector('h1')?.textContent).toContain('Verifique seu e-mail');
    expect(elemento().textContent).toContain('estiver cadastrado');
    expect(elemento().textContent).toContain('pessoa@exemplo.com');
    expect(elemento().querySelector('form')).toBeNull();
  });

  it('permite voltar ao formulário para usar outro e-mail', () => {
    auth.solicitarRedefinicaoSenha.and.returnValue(of({ message: 'ok' }));
    preencher('pessoa@exemplo.com');
    enviar();

    Array.from(elemento().querySelectorAll('button'))
      .find((b) => b.textContent?.includes('Usar outro e-mail'))!
      .click();
    fixture.detectChanges();

    expect(elemento().querySelector('form')).not.toBeNull();
    expect(elemento().querySelector<HTMLInputElement>('#email')!.value).toBe('');
  });

  it('mostra a mensagem de "muitas tentativas" devolvida pela API', () => {
    auth.solicitarRedefinicaoSenha.and.returnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 429,
            error: { codigo: 'MUITAS_TENTATIVAS', detail: 'Muitas tentativas. Tente novamente em 20 minutos.' },
          }),
      ),
    );
    preencher('pessoa@exemplo.com');

    enviar();

    expect(elemento().querySelector('[role="alert"]')?.textContent).toContain('Tente novamente em 20 minutos.');
    expect(elemento().querySelector('form')).not.toBeNull();
  });

  it('mostra falha de conexão quando a API não responde', () => {
    auth.solicitarRedefinicaoSenha.and.returnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
    preencher('pessoa@exemplo.com');

    enviar();

    expect(elemento().textContent).toContain('Não foi possível conectar ao servidor');
  });

  it('desabilita o botão enquanto envia', () => {
    const resposta = new Subject<{ message: string }>();
    auth.solicitarRedefinicaoSenha.and.returnValue(resposta);
    preencher('pessoa@exemplo.com');

    enviar();

    const botao = elemento().querySelector<HTMLButtonElement>('button[type="submit"]')!;
    expect(botao.disabled).toBeTrue();
    expect(botao.textContent).toContain('Enviando...');
  });
});
