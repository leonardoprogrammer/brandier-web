import { paraCampoData, periodoEntreDatas, ultimosDias } from './periodo';

describe('periodo', () => {
  it('ultimosDias cobre do início do dia (n-1) dias atrás até o início de amanhã', () => {
    const periodo = ultimosDias(7, new Date(2026, 2, 10, 15, 30));

    expect(new Date(periodo.de).getTime()).toBe(new Date(2026, 2, 4).getTime());
    expect(new Date(periodo.ate).getTime()).toBe(new Date(2026, 2, 11).getTime());
  });

  it('ultimosDias atravessa a virada de mês e de ano', () => {
    const periodo = ultimosDias(30, new Date(2026, 0, 5, 1, 0));

    expect(new Date(periodo.de).getTime()).toBe(new Date(2025, 11, 7).getTime());
    expect(new Date(periodo.ate).getTime()).toBe(new Date(2026, 0, 6).getTime());
  });

  it('periodoEntreDatas inclui o último dia inteiro', () => {
    const periodo = periodoEntreDatas('2026-03-01', '2026-03-10');

    expect(periodo).not.toBeNull();
    expect(new Date(periodo!.de).getTime()).toBe(new Date(2026, 2, 1).getTime());
    expect(new Date(periodo!.ate).getTime()).toBe(new Date(2026, 2, 11).getTime());
  });

  it('periodoEntreDatas aceita um único dia', () => {
    expect(periodoEntreDatas('2026-03-10', '2026-03-10')).not.toBeNull();
  });

  it('periodoEntreDatas rejeita datas vazias, inexistentes ou em outro formato', () => {
    expect(periodoEntreDatas('', '2026-03-10')).toBeNull();
    expect(periodoEntreDatas('2026-03-01', '')).toBeNull();
    expect(periodoEntreDatas('2026-02-30', '2026-03-10')).toBeNull();
    expect(periodoEntreDatas('01/03/2026', '10/03/2026')).toBeNull();
  });

  it('periodoEntreDatas rejeita início depois do fim', () => {
    expect(periodoEntreDatas('2026-03-10', '2026-03-09')).toBeNull();
  });

  it('periodoEntreDatas aceita até 366 dias e rejeita mais que isso', () => {
    expect(periodoEntreDatas('2025-03-01', '2026-03-01')).not.toBeNull();
    expect(periodoEntreDatas('2025-02-28', '2026-03-01')).toBeNull();
  });

  it('paraCampoData formata com zeros à esquerda', () => {
    expect(paraCampoData(new Date(2026, 0, 5))).toBe('2026-01-05');
    expect(paraCampoData(new Date(2026, 11, 31))).toBe('2026-12-31');
  });
});
