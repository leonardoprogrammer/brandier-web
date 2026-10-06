export interface Produto {
  id: string;
  nome: string;
  codigo: string | null;
  ativo: boolean;
  criadoEm: string;
}

export interface ProdutosDaMarca {
  produtos: Produto[];
  limite: number;
}

export interface DadosProduto {
  nome: string;
  codigo: string;
  ativo?: boolean;
}
