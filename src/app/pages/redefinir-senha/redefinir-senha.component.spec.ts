import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';

import { AuthService } from '../../services/auth.service';
import { RedefinirSenhaComponent } from './redefinir-senha.component';

describe('RedefinirSenhaComponent', () => {
  let auth: jasmine.SpyObj<AuthService>;
  let router: Router;

  async function criar(parametros: Record<string, string>): Promise<ComponentFixture<RedefinirSenhaComponent>> {
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['redefinirSenha']);
    await TestBed.configureTestingModule({
      imports: [RedefinirSenhaComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(parametros) } } },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    const fixture = TestBed.createComponent(RedefinirSenhaComponent);
    fixture.detectChanges();
    return fixture;
  }

  const elemento = (fixture: ComponentFixture<RedefinirSenhaComponent>): HTMLElement =>
    fixture.nativeElement as HTMLElement;

  function digitar(fixture: ComponentFixture<RedefinirSenhaComponent>, id: string, valor: string): void {
    const campo = elemento(fixture).querySelector<HTMLInputElement>(`#${id}`)!;
    campo.value = valor;
    campo.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  function enviar(fixture: ComponentFixture<RedefinirSenhaComponent>): void {
    elemento(fixture).querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit'));
    fixture.detectChanges();
  }

  function preencher(fixture: ComponentFixture<RedefinirSenhaComponent>, senha = 'NovaSenha123'): void {
    digitar(fixture, 'senha', senha);
    digitar(fixture, 'confirmarSenha', senha);
  }

  it('remove o token da barra de endereço e mostra o formulário', async () => {
    const fixture = await criar({ token: 'abc123' });

    expect(router.navigate).toHaveBeenCalledWith([], {
      queryParams: { token: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
    expect(elemento(fixture).querySelector('h1')?.textContent).toContain('Criar nova senha');
    expect(elemento(fixture).querySelector('form')).not.toBeNull();
  });

  it('trata link sem token como incompleto e oferece pedir um novo link', async () => {
    const fixture = await criar({});

    expect(elemento(fixture).querySelector('h1')?.textContent).toContain('Link inválido');
    expect(elemento(fixture).textContent).toContain('O link de redefinição está incompleto.');
    expect(elemento(fixture).querySelector('a[href="/esqueci-senha"]')).not.toBeNull();
    expect(elemento(fixture).querySelector('form')).toBeNull();
  });

  it('não envia e mostra os erros quando o formulário está vazio', async () => {
    const fixture = await criar({ token: 'abc123' });

    enviar(fixture);

    expect(auth.redefinirSenha).not.toHaveBeenCalled();
    expect(elemento(fixture).textContent).toContain('Informe a nova senha.');
    expect(elemento(fixture).textContent).toContain('Confirme a nova senha.');
  });

  it('rejeita senha sem número e confirmação diferente', async () => {
    const fixture = await criar({ token: 'abc123' });

    digitar(fixture, 'senha', 'somenteletras');
    digitar(fixture, 'confirmarSenha', 'somenteletras');
    enviar(fixture);
    expect(elemento(fixture).textContent).toContain('A senha deve conter letras e números.');

    digitar(fixture, 'senha', 'NovaSenha123');
    digitar(fixture, 'confirmarSenha', 'OutraSenha123');
    enviar(fixture);
    expect(elemento(fixture).textContent).toContain('As senhas não conferem.');
    expect(auth.redefinirSenha).not.toHaveBeenCalled();
  });

  it('rejeita senha acima do limite de bytes', async () => {
    const fixture = await criar({ token: 'abc123' });

    preencher(fixture, 'é1'.repeat(30));
    enviar(fixture);

    expect(auth.redefinirSenha).not.toHaveBeenCalled();
    expect(elemento(fixture).textContent).toContain('A senha é longa demais');
  });

  it('envia o token e a nova senha e mostra o sucesso', async () => {
    const fixture = await criar({ token: 'abc123' });
    auth.redefinirSenha.and.returnValue(of({ message: 'ok' }));
    preencher(fixture);

    enviar(fixture);

    expect(auth.redefinirSenha).toHaveBeenCalledWith('abc123', 'NovaSenha123');
    expect(elemento(fixture).querySelector('h1')?.textContent).toContain('Senha redefinida');
    expect(elemento(fixture).textContent).toContain('desconectado de todos os dispositivos');
    expect(elemento(fixture).querySelector('a[href="/entrar"]')).not.toBeNull();
  });

  it('mostra o erro do link e oferece um novo quando a API recusa o token', async () => {
    const fixture = await criar({ token: 'velho' });
    auth.redefinirSenha.and.returnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: {
              codigo: 'TOKEN_REDEFINICAO_INVALIDO',
              detail: 'O link de redefinição de senha é inválido, expirou ou já foi utilizado.',
            },
          }),
      ),
    );
    preencher(fixture);

    enviar(fixture);

    expect(elemento(fixture).querySelector('h1')?.textContent).toContain('Link inválido');
    expect(elemento(fixture).textContent).toContain('é inválido, expirou ou já foi utilizado');
    expect(elemento(fixture).querySelector('a[href="/esqueci-senha"]')).not.toBeNull();
  });

  it('mostra no campo o erro de validação devolvido pela API', async () => {
    const fixture = await criar({ token: 'abc123' });
    auth.redefinirSenha.and.returnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: {
              codigo: 'VALIDACAO_INVALIDA',
              erros: [{ campo: 'senha', mensagem: 'A senha deve conter letras e números' }],
            },
          }),
      ),
    );
    preencher(fixture);

    enviar(fixture);

    expect(elemento(fixture).textContent).toContain('A senha deve conter letras e números');
    expect(elemento(fixture).querySelector('form')).not.toBeNull();
  });

  it('mostra a mensagem de "muitas tentativas" devolvida pela API', async () => {
    const fixture = await criar({ token: 'abc123' });
    auth.redefinirSenha.and.returnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 429,
            error: { codigo: 'MUITAS_TENTATIVAS', detail: 'Muitas tentativas. Tente novamente em 5 minutos.' },
          }),
      ),
    );
    preencher(fixture);

    enviar(fixture);

    expect(elemento(fixture).querySelector('[role="alert"]')?.textContent).toContain('Tente novamente em 5 minutos.');
    expect(elemento(fixture).querySelector('form')).not.toBeNull();
  });

  it('desabilita o botão enquanto envia', async () => {
    const fixture = await criar({ token: 'abc123' });
    const resposta = new Subject<{ message: string }>();
    auth.redefinirSenha.and.returnValue(resposta);
    preencher(fixture);

    enviar(fixture);

    const botao = elemento(fixture).querySelector<HTMLButtonElement>('button[type="submit"]')!;
    expect(botao.disabled).toBeTrue();
    expect(botao.textContent).toContain('Salvando...');
  });
});
