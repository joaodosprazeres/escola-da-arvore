/**
 * Força de senha — função pura (Princípio II).
 *
 * FR-028 exige explicar **o que falta**, não apenas "fraca/forte": a saída é a lista das regras não
 * atendidas, em pt-BR, vinda de `config.ts` (Princípio III).
 *
 * Validação de cliente é usabilidade; o controle continua no servidor (R-09).
 */
import { REGRAS_DE_SENHA_EXIBIDAS, TAMANHO_MINIMO_DE_SENHA } from '../config';

export interface ContextoDaSenha {
  readonly email?: string;
  readonly nome?: string;
}

export interface AvaliacaoDeSenha {
  readonly aceita: boolean;
  /** Textos em pt-BR do que falta, na ordem declarada em `config.ts`. */
  readonly regrasNaoAtendidas: readonly string[];
}

function textoDaRegra(codigo: string): string {
  return REGRAS_DE_SENHA_EXIBIDAS.find((regra) => regra.codigo === codigo)?.texto ?? codigo;
}

function pedacosDoContexto(contexto: ContextoDaSenha): readonly string[] {
  const pedacos: string[] = [];

  if (contexto.email !== undefined && contexto.email.trim() !== '') {
    const email = contexto.email.toLowerCase();
    pedacos.push(email);
    const local = email.split('@')[0];
    if (local !== undefined && local.length >= 3) pedacos.push(local);
  }

  if (contexto.nome !== undefined) {
    for (const parte of contexto.nome.toLowerCase().split(/\s+/)) {
      if (parte.length >= 3) pedacos.push(parte);
    }
  }

  return pedacos;
}

/**
 * A lista de senhas comuns entra por `import()` dinâmico: fora das telas de senha ela não é
 * baixada nem avaliada.
 */
export async function avaliarSenha(
  senha: string,
  contexto: ContextoDaSenha = {},
): Promise<AvaliacaoDeSenha> {
  const naoAtendidas: string[] = [];
  const normalizada = senha.toLowerCase();

  if (senha.length < TAMANHO_MINIMO_DE_SENHA) {
    naoAtendidas.push(textoDaRegra('comprimento'));
  }

  const { SENHAS_COMUNS } = await import('./senhasComuns');
  if (SENHAS_COMUNS.includes(normalizada)) {
    naoAtendidas.push(textoDaRegra('nao_comum'));
  }

  if (senha !== senha.trim()) {
    naoAtendidas.push(textoDaRegra('sem_espacos_nas_pontas'));
  }

  const pedacos = pedacosDoContexto(contexto);
  if (pedacos.some((pedaco) => normalizada.includes(pedaco))) {
    naoAtendidas.push(textoDaRegra('diferente_do_email'));
  }

  return { aceita: naoAtendidas.length === 0, regrasNaoAtendidas: naoAtendidas };
}
