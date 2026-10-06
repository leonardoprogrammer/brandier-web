import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { AUTOR } from '../../core/links-autor';
import { SobreConteudoComponent } from './sobre-conteudo.component';

describe('SobreConteudoComponent', () => {
  let fixture: ComponentFixture<SobreConteudoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SobreConteudoComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(SobreConteudoComponent);
    fixture.detectChanges();
  });

  const elemento = (): HTMLElement => fixture.nativeElement as HTMLElement;

  it('apresenta o projeto como de portfólio e não comercial', () => {
    expect(elemento().querySelector('h1')?.textContent).toContain('Sobre o projeto');
    expect(elemento().textContent).toContain('A aplicação que está no ar não é para uso comercial.');
  });

  it('mostra o e-mail de contato e os links do autor com rel seguro', () => {
    expect(elemento().querySelector(`a[href="mailto:${AUTOR.emailContato}"]`)).not.toBeNull();
    [AUTOR.curriculo, AUTOR.github, AUTOR.linkedin].forEach((url) => {
      const link = elemento().querySelector<HTMLAnchorElement>(`a[href="${url}"]`);

      expect(link).withContext(url).not.toBeNull();
      expect(link!.target).toBe('_blank');
      expect(link!.rel).toContain('noopener');
    });
  });
});
