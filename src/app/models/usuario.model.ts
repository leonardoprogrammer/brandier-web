export interface Usuario {
  id: string;
  nome: string;
  email: string;
  temSenha: boolean;
  termosAceitos: boolean;
}

export interface NovoCadastro {
  nome: string;
  email: string;
  senha: string;
  aceitouTermos: boolean;
  turnstileToken?: string;
}

export interface MensagemResposta {
  message: string;
}
