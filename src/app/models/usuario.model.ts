export interface Usuario {
  id: string;
  nome: string;
  email: string;
}

export interface NovoCadastro {
  nome: string;
  email: string;
  senha: string;
  aceitouTermos: boolean;
}

export interface MensagemResposta {
  message: string;
}
