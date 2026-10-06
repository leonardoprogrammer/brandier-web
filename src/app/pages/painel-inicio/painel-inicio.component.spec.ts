import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';

import { MinhasMarcas } from '../../models/marca.model';
import { Usuario } from '../../models/usuario.model';
import { AuthService } from '../../services/auth.service';
import { MarcaService } from '../../services/marca.service';
import { PainelInicioComponent } from './painel-inicio.component';

describe('PainelInicioComponent', () => {
  let fixture: ComponentFixture<PainelInicioComponent>;
  let marcaService: jasmine.SpyObj<MarcaService>;

  beforeEach(async () => {
    marcaService = jasmine.createSpyObj<MarcaService>('MarcaService', ['listar']);
    const auth = jasmine.createSpyObj<AuthService>('AuthService', ['sair']);
    Object.defineProperty(auth, 'usuario', {
      value: signal<Usuario | null>({ id: '1', nome: 'Pessoa Teste', email: 'pessoa@exemplo.com' }).asReadonly(),
    });
    await TestBed.configureTestingModule({
      imports: [PainelInicioComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        { provide: MarcaService, useValue: marcaService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(PainelInicioComponent);
  });

  const elemento = (): HTMLElement => fixture.nativeElement as HTMLElement;

  it('cumprimenta o usuário pelo nome', () => {
    marcaService.listar.and.returnValue(of({ marcas: [], limite: 2 }));
    fixture.detectChanges();

    expect(elemento().querySelector('h1')?.textContent).toContain('Olá, Pessoa Teste!');
  });

  it('mostra o carregamento enquanto busca as marcas', () => {
    marcaService.listar.and.returnValue(new Subject<MinhasMarcas>());
    fixture.detectChanges();

    expect(elemento().textContent).toContain('Carregando...');
  });

  it('mostra o uso das marcas em relação ao limite', () => {
    marcaService.listar.and.returnValue(
      of({ marcas: [{ id: '1', nome: 'Alfa', descricao: null, criadoEm: '2026-01-01T00:00:00Z' }], limite: 2 }),
    );
    fixture.detectChanges();

    expect(elemento().querySelector('[data-testid="uso-marcas"]')?.textContent?.replace(/\s/g, '')).toBe('1/2');
  });

  it('incentiva criar a primeira marca quando não há nenhuma', () => {
    marcaService.listar.and.returnValue(of({ marcas: [], limite: 2 }));
    fixture.detectChanges();

    expect(elemento().textContent).toContain('Você ainda não criou nenhuma marca.');
  });

  it('mostra erro quando não consegue carregar', () => {
    marcaService.listar.and.returnValue(throwError(() => new Error('falha')));
    fixture.detectChanges();

    expect(elemento().querySelector('[role="alert"]')?.textContent).toContain('Não foi possível carregar suas marcas');
  });

  it('tem o atalho para gerenciar marcas', () => {
    marcaService.listar.and.returnValue(of({ marcas: [], limite: 2 }));
    fixture.detectChanges();

    expect(elemento().querySelector('a[href="/painel/marcas"]')).not.toBeNull();
  });
});
