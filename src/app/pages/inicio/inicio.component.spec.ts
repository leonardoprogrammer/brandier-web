import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { InicioComponent } from './inicio.component';

describe('InicioComponent', () => {
  let fixture: ComponentFixture<InicioComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [InicioComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(InicioComponent);
    fixture.detectChanges();
  });

  const elemento = (): HTMLElement => fixture.nativeElement as HTMLElement;

  it('apresenta a plataforma', () => {
    expect(elemento().querySelector('h1')?.textContent).toContain('Brandier');
  });

  it('oferece botões para entrar e criar conta', () => {
    expect(elemento().querySelector('a[href="/entrar"]')).not.toBeNull();
    expect(elemento().querySelector('a[href="/cadastro"]')).not.toBeNull();
  });

  it('lista as funcionalidades da plataforma', () => {
    const itens = elemento().querySelectorAll('[data-testid="funcionalidades"] li');

    expect(itens.length).toBeGreaterThan(0);
  });

  it('linka para como funciona e sobre o projeto', () => {
    expect(elemento().querySelector('a[href="/como-funciona"]')).not.toBeNull();
    expect(elemento().querySelector('a[href="/sobre"]')).not.toBeNull();
  });
});
