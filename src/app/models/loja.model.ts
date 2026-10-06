export interface Loja {
  id: string;
  nome: string;
  cidade: string;
  uf: string;
  endereco: string | null;
  criadoEm: string;
}

export interface LojasDaMarca {
  lojas: Loja[];
  limite: number;
}

export interface DadosLoja {
  nome: string;
  cidade: string;
  uf: string;
  endereco: string;
}
