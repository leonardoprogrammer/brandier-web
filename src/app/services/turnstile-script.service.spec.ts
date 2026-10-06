import { DOCUMENT } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ApiDoTurnstile, TurnstileScriptService, URL_DO_SCRIPT_DO_TURNSTILE } from './turnstile-script.service';

describe('TurnstileScriptService', () => {
  const apiFalsa: ApiDoTurnstile = { render: () => 'id', reset: () => undefined, remove: () => undefined };

  afterEach(() => {
    delete window.turnstile;
    document.querySelectorAll(`script[src="${URL_DO_SCRIPT_DO_TURNSTILE}"]`).forEach((script) => script.remove());
  });

  const scripts = (): NodeListOf<HTMLScriptElement> =>
    document.querySelectorAll<HTMLScriptElement>(`script[src="${URL_DO_SCRIPT_DO_TURNSTILE}"]`);

  it('reaproveita a API quando o script já foi carregado, sem criar outro', async () => {
    window.turnstile = apiFalsa;

    const api = await TestBed.inject(TurnstileScriptService).carregar();

    expect(api).toBe(apiFalsa);
    expect(scripts().length).toBe(0);
  });

  it('adiciona o script do Cloudflare uma única vez, mesmo com várias chamadas simultâneas', () => {
    const servico = TestBed.inject(TurnstileScriptService);

    void servico.carregar().catch(() => undefined);
    void servico.carregar().catch(() => undefined);

    expect(scripts().length).toBe(1);
    expect(scripts()[0].async).toBeTrue();
    expect(scripts()[0].defer).toBeTrue();
  });

  it('resolve com a API quando o script termina de carregar', async () => {
    const servico = TestBed.inject(TurnstileScriptService);
    const promessa = servico.carregar();

    window.turnstile = apiFalsa;
    scripts()[0].onload?.(new Event('load'));

    expect(await promessa).toBe(apiFalsa);
  });

  it('rejeita quando o script carrega mas a API não aparece', async () => {
    const servico = TestBed.inject(TurnstileScriptService);
    const promessa = servico.carregar();

    scripts()[0].onload?.(new Event('load'));

    await expectAsync(promessa).toBeRejected();
  });

  it('rejeita, remove o script com erro e permite tentar de novo', async () => {
    const servico = TestBed.inject(TurnstileScriptService);
    const primeira = servico.carregar();

    scripts()[0].onerror?.(new Event('error'));

    await expectAsync(primeira).toBeRejected();
    expect(scripts().length).toBe(0);

    void servico.carregar().catch(() => undefined);
    expect(scripts().length).toBe(1);
  });

  it('no servidor (sem navegador) rejeita e não toca no documento', async () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'server' }, { provide: DOCUMENT, useValue: document }] });

    await expectAsync(TestBed.inject(TurnstileScriptService).carregar()).toBeRejected();
    expect(scripts().length).toBe(0);
  });
});
