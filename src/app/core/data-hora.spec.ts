import { deCampoLocal, formatarDataHora, paraCampoLocal } from './data-hora';

describe('data-hora', () => {
  it('paraCampoLocal formata no padrão do campo datetime-local com zeros à esquerda', () => {
    expect(paraCampoLocal(new Date(2026, 0, 5, 7, 3))).toBe('2026-01-05T07:03');
    expect(paraCampoLocal(new Date(2026, 11, 31, 23, 59))).toBe('2026-12-31T23:59');
  });

  it('deCampoLocal converte o valor do campo em data local', () => {
    const data = deCampoLocal('2026-03-10T14:30');

    expect(data).not.toBeNull();
    expect(data!.getFullYear()).toBe(2026);
    expect(data!.getMonth()).toBe(2);
    expect(data!.getDate()).toBe(10);
    expect(data!.getHours()).toBe(14);
    expect(data!.getMinutes()).toBe(30);
  });

  it('deCampoLocal devolve nulo para valores vazios ou em outro formato', () => {
    expect(deCampoLocal('')).toBeNull();
    expect(deCampoLocal('10/03/2026 14:30')).toBeNull();
    expect(deCampoLocal('2026-13-45T99:99')).toBeNull();
  });

  it('é possível ir e voltar entre data e campo sem perder o minuto', () => {
    const original = new Date(2026, 5, 15, 9, 45);

    expect(deCampoLocal(paraCampoLocal(original))!.getTime()).toBe(original.getTime());
  });

  it('formatarDataHora usa o formato brasileiro', () => {
    const texto = formatarDataHora(new Date(2026, 2, 10, 14, 30).toISOString());

    expect(texto).toContain('10/03/2026');
    expect(texto).toContain('14:30');
  });
});
