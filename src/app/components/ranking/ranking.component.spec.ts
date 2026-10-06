import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ItemDoRanking, RankingComponent } from './ranking.component';

describe('RankingComponent', () => {
  let fixture: ComponentFixture<RankingComponent>;

  const itens: ItemDoRanking[] = [
    { id: '1', nome: 'Centro', valor: 40, detalhe: '4 reposições' },
    { id: '2', nome: 'Norte', valor: 10 },
    { id: '3', nome: 'Sul', valor: 0 },
  ];

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [RankingComponent] }).compileComponents();
    fixture = TestBed.createComponent(RankingComponent);
  });

  const elemento = (): HTMLElement => fixture.nativeElement as HTMLElement;

  function montar(valores: ItemDoRanking[], limite?: number): void {
    fixture.componentRef.setInput('titulo', 'Por loja');
    fixture.componentRef.setInput('itens', valores);
    if (limite !== undefined) {
      fixture.componentRef.setInput('limite', limite);
    }
    fixture.detectChanges();
  }

  it('mostra o título e os itens com valor e detalhe', () => {
    montar(itens);

    expect(elemento().querySelector('h3')?.textContent).toContain('Por loja');
    const linhas = elemento().querySelectorAll('[data-testid="ranking-item"]');
    expect(linhas.length).toBe(3);
    expect(linhas[0].textContent).toContain('Centro');
    expect(linhas[0].textContent).toContain('40 un.');
    expect(linhas[0].textContent).toContain('4 reposições');
  });

  it('dimensiona as barras em relação ao maior valor, com largura mínima visível', () => {
    montar(itens);

    const barras = Array.from(elemento().querySelectorAll<HTMLElement>('li div.bg-indigo-500')).map((b) => b.style.width);
    expect(barras).toEqual(['100%', '25%', '2%']);
  });

  it('mostra só os primeiros itens conforme o limite', () => {
    montar(itens, 2);

    expect(elemento().querySelectorAll('[data-testid="ranking-item"]').length).toBe(2);
  });

  it('mostra mensagem quando não há dados', () => {
    montar([]);

    expect(elemento().querySelector('[data-testid="ranking-vazio"]')?.textContent).toContain('Sem dados no período.');
    expect(elemento().querySelector('ol')).toBeNull();
  });

  it('não quebra quando todos os valores são zero', () => {
    montar([{ id: '1', nome: 'A', valor: 0 }]);

    expect(elemento().querySelector<HTMLElement>('li div.bg-indigo-500')?.style.width).toBe('2%');
  });
});
