import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AUTOR } from '../../core/links-autor';
import { SobreComponent } from './sobre.component';

describe('SobreComponent', () => {
  let fixture: ComponentFixture<SobreComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SobreComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(SobreComponent);
    fixture.detectChanges();
  });

  const elemento = (): HTMLElement => fixture.nativeElement as HTMLElement;

  it('apresenta o projeto e deixa claro que é de portfólio e não comercial', () => {
    expect(elemento().querySelector('h1')?.textContent).toContain('Sobre o projeto');
    expect(elemento().textContent).toContain('Um projeto de portfólio');
    expect(elemento().textContent).toContain('A aplicação que está no ar não é para uso comercial.');
  });

  it('lista os dados guardados e o prazo de limpeza de contas não verificadas', () => {
    const texto = elemento().textContent ?? '';

    expect(texto).toContain('nome');
    expect(texto).toContain('hash');
    expect(texto).toContain('7 dias');
    expect(texto).toContain('cookies essenciais');
  });

  it('mostra o e-mail de contato para remoção de dados como link mailto', () => {
    const link = elemento().querySelector<HTMLAnchorElement>(`a[href="mailto:${AUTOR.emailContato}"]`);

    expect(link).not.toBeNull();
    expect(link!.textContent).toContain(AUTOR.emailContato);
  });

  it('tem os links do autor abrindo em nova aba com rel seguro', () => {
    [AUTOR.curriculo, AUTOR.github, AUTOR.linkedin].forEach((url) => {
      const link = elemento().querySelector<HTMLAnchorElement>(`a[href="${url}"]`);

      expect(link).withContext(url).not.toBeNull();
      expect(link!.target).toBe('_blank');
      expect(link!.rel).toContain('noopener');
      expect(link!.rel).toContain('noreferrer');
    });
  });

  it('oferece caminhos para entrar e criar conta', () => {
    expect(elemento().querySelector('a[href="/entrar"]')).not.toBeNull();
    expect(elemento().querySelector('a[href="/cadastro"]')).not.toBeNull();
  });

  it('usa as URLs corretas do autor', () => {
    expect(AUTOR.curriculo).toBe('https://leonardoprogrammer.com.br');
    expect(AUTOR.github).toBe('https://github.com/leonardoprogrammer');
    expect(AUTOR.linkedin).toBe('https://www.linkedin.com/in/leonardocesarsilva');
  });
});
