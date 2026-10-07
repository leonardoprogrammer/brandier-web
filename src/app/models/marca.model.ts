export interface Marca {
  id: string;
  nome: string;
  descricao: string | null;
  ativa: boolean;
  criadoEm: string;
}

export interface MinhasMarcas {
  marcas: Marca[];
  limite: number;
}

export interface DadosMarca {
  nome: string;
  descricao: string;
}
