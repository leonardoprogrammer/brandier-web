import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed, discardPeriodicTasks, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { AuthService } from '../../services/auth.service';
import { CadastroComponent } from './cadastro.component';

describe('CadastroComponent', () => {
  let fixture: ComponentFixture<CadastroComponent>;
  let auth: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['cadastrar', 'reenviarVerificacao']);
    await TestBed.configureTestingModule({
      imports: [CadastroComponent],
      providers: [provideRouter([]), { provide: AuthService, useValue: auth }],
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

  it('mostra erro geral quando a API está indisponível', () => {
    auth.cadastrar.and.returnValue(throwError(() => new HttpErrorResponse({ status: 0 })));
    preencherCorretamente();

    enviar();

    expect(elemento().querySelector('[role="alert"]')?.textContent).toContain('Não foi possível conectar');
  });
});
