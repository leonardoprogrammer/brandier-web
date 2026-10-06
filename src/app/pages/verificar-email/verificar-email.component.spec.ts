import { HttpErrorResponse } from '@angular/common/http';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { AuthService } from '../../services/auth.service';
import { VerificarEmailComponent } from './verificar-email.component';

describe('VerificarEmailComponent', () => {
  let auth: jasmine.SpyObj<AuthService>;
  let router: Router;

  async function criar(parametros: Record<string, string>): Promise<ComponentFixture<VerificarEmailComponent>> {
    auth = jasmine.createSpyObj<AuthService>('AuthService', ['verificarEmail', 'reenviarVerificacao']);
    await TestBed.configureTestingModule({
      imports: [VerificarEmailComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(parametros) } } },
      ],
    }).compileComponents();

    router = TestBed.inject(Router);
    spyOn(router, 'navigate').and.resolveTo(true);
    return TestBed.createComponent(VerificarEmailComponent);
  }

  const elemento = (fixture: ComponentFixture<VerificarEmailComponent>): HTMLElement =>
    fixture.nativeElement as HTMLElement;

  it('verifica o token do link e mostra o sucesso', async () => {
    const fixture = await criar({ token: 'abc123' });
    auth.verificarEmail.and.returnValue(of({ message: 'E-mail verificado com sucesso. Você já pode entrar.' }));

    fixture.detectChanges();

    expect(auth.verificarEmail).toHaveBeenCalledWith('abc123');
    expect(elemento(fixture).querySelector('h1')?.textContent).toContain('E-mail verificado');
    expect(elemento(fixture).textContent).toContain('Você já pode entrar');
    expect(elemento(fixture).querySelector('a[href="/entrar"]')).not.toBeNull();
  });

  it('remove o token da barra de endereço', async () => {
    const fixture = await criar({ token: 'abc123' });
    auth.verificarEmail.and.returnValue(of({ message: 'ok' }));

    fixture.detectChanges();

    expect(router.navigate).toHaveBeenCalledWith([], {
      queryParams: { token: null },
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  });

  it('mostra erro e permite reenviar quando o link é inválido', async () => {
    const fixture = await criar({ token: 'ruim' });
    auth.verificarEmail.and.returnValue(
      throwError(
        () =>
          new HttpErrorResponse({
            status: 400,
            error: { codigo: 'TOKEN_VERIFICACAO_INVALIDO', detail: 'O link de verificação é inválido.' },
          }),
      ),
    );
    auth.reenviarVerificacao.and.returnValue(of({ message: 'ok' }));

    fixture.detectChanges();

    expect(elemento(fixture).querySelector('h1')?.textContent).toContain('Não foi possível verificar');
    expect(elemento(fixture).textContent).toContain('O link de verificação é inválido.');

    const campo = elemento(fixture).querySelector<HTMLInputElement>('#email')!;
    campo.value = 'pessoa@exemplo.com';
    campo.dispatchEvent(new Event('input'));
    elemento(fixture).querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    fixture.detectChanges();

    expect(auth.reenviarVerificacao).toHaveBeenCalledWith('pessoa@exemplo.com');
    expect(elemento(fixture).textContent).toContain('enviaremos um novo link');
  });

  it('não reenvia com e-mail inválido', async () => {
    const fixture = await criar({ token: 'ruim' });
    auth.verificarEmail.and.returnValue(throwError(() => new HttpErrorResponse({ status: 400, error: {} })));

    fixture.detectChanges();
    const campo = elemento(fixture).querySelector<HTMLInputElement>('#email')!;
    campo.value = 'xxx';
    campo.dispatchEvent(new Event('input'));
    elemento(fixture).querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    fixture.detectChanges();

    expect(auth.reenviarVerificacao).not.toHaveBeenCalled();
    expect(elemento(fixture).textContent).toContain('Informe um e-mail válido.');
  });

  it('trata link sem token como incompleto, sem chamar a API', async () => {
    const fixture = await criar({});

    fixture.detectChanges();

    expect(auth.verificarEmail).not.toHaveBeenCalled();
    expect(elemento(fixture).textContent).toContain('O link de verificação está incompleto.');
  });
});
