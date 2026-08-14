/**
 * Força de senha — mínimo de 8 caracteres, composição, lista do que falta como saída estruturada
 * (FR-028; T063).
 */
import { describe, expect, it } from 'vitest';
import { avaliarSenha } from '../../src/lib/forcaDeSenha';
import { REGRAS_DE_SENHA_EXIBIDAS } from '../../src/config';

const TEXTO_COMPRIMENTO = REGRAS_DE_SENHA_EXIBIDAS.find((r) => r.codigo === 'comprimento')!.texto;
const TEXTO_COMUM = REGRAS_DE_SENHA_EXIBIDAS.find((r) => r.codigo === 'nao_comum')!.texto;
const TEXTO_ESPACOS = REGRAS_DE_SENHA_EXIBIDAS.find(
  (r) => r.codigo === 'sem_espacos_nas_pontas',
)!.texto;
const TEXTO_CONTEXTO = REGRAS_DE_SENHA_EXIBIDAS.find(
  (r) => r.codigo === 'diferente_do_email',
)!.texto;

describe('avaliarSenha', () => {
  it('recusa senha com menos de 8 caracteres, listando o que falta', async () => {
    const avaliacao = await avaliarSenha('abc123');

    expect(avaliacao.aceita).toBe(false);
    expect(avaliacao.regrasNaoAtendidas).toContain(TEXTO_COMPRIMENTO);
  });

  it('recusa senha notoriamente comum', async () => {
    const avaliacao = await avaliarSenha('12345678');

    expect(avaliacao.aceita).toBe(false);
    expect(avaliacao.regrasNaoAtendidas).toContain(TEXTO_COMUM);
  });

  it('recusa senha com espaço nas pontas', async () => {
    const avaliacao = await avaliarSenha(' senhaForte9 ');

    expect(avaliacao.aceita).toBe(false);
    expect(avaliacao.regrasNaoAtendidas).toContain(TEXTO_ESPACOS);
  });

  it('recusa senha igual ou derivada do e-mail ou do nome', async () => {
    const avaliacao = await avaliarSenha('mariasilva', {
      email: 'mariasilva@escola.local',
      nome: 'Maria Silva',
    });

    expect(avaliacao.aceita).toBe(false);
    expect(avaliacao.regrasNaoAtendidas).toContain(TEXTO_CONTEXTO);
  });

  it('aceita senha que atende a todas as regras e devolve lista vazia', async () => {
    const avaliacao = await avaliarSenha('gr4nadeira-forte', {
      email: 'admin@escola.local',
      nome: 'Ana',
    });

    expect(avaliacao.aceita).toBe(true);
    expect(avaliacao.regrasNaoAtendidas).toEqual([]);
  });
});
