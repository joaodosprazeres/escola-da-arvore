import { describe, expect, it } from 'vitest';
import {
  ajustarVisaoAtiva,
  encontrarRota,
  rotaEhAnonima,
  rotaPermitida,
  temAlgumPerfil,
  unirPerfis,
  visaoPadrao,
} from '../../src/lib/permissoes';
import type { Rota } from '../../src/types';

describe('unirPerfis (FR-009)', () => {
  it('devolve a união sem repetir', () => {
    expect([...unirPerfis(['coordenacao'], ['professor', 'coordenacao'])].sort()).toEqual([
      'coordenacao',
      'professor',
    ]);
  });

  it('devolve vazio quando não há perfil algum', () => {
    expect(unirPerfis([], [])).toEqual([]);
  });
});

describe('visaoPadrao (FR-011)', () => {
  it('escolhe o perfil de maior alcance', () => {
    expect(visaoPadrao(['professor', 'administrador', 'coordenacao'])).toBe('administrador');
    expect(visaoPadrao(['professor', 'coordenacao'])).toBe('coordenacao');
    expect(visaoPadrao(['professor'])).toBe('professor');
    expect(visaoPadrao(['secretaria', 'coordenacao'])).toBe('secretaria');
  });

  it('devolve null sem perfil algum — caminho de erro de INV-1', () => {
    expect(visaoPadrao([])).toBeNull();
  });
});

describe('ajustarVisaoAtiva (FR-010, FR-016)', () => {
  it('preserva a visão quando ela continua entre os perfis', () => {
    expect(ajustarVisaoAtiva('professor', ['coordenacao', 'professor'])).toBe('professor');
  });

  it('reajusta para o maior alcance restante quando o perfil sai', () => {
    expect(ajustarVisaoAtiva('administrador', ['coordenacao', 'professor'])).toBe('coordenacao');
  });

  it('devolve null quando não resta perfil — a sessão precisa cair', () => {
    expect(ajustarVisaoAtiva('professor', [])).toBeNull();
  });
});

describe('casamento de rota × permissões efetivas (FR-013, FR-015)', () => {
  const rotaDeUsuarios: Rota = {
    caminho: '/usuarios',
    pagina: 'UsuariosPage',
    titulo: 'Usuários',
    perfisPermitidos: ['administrador'],
    exigeTrocaDeSenha: false,
  };

  const rotaAnonima: Rota = {
    caminho: '/entrar',
    pagina: 'EntrarPage',
    titulo: 'Entrar',
    perfisPermitidos: null,
    exigeTrocaDeSenha: false,
  };

  const rotaDeQualquerAutenticado: Rota = {
    caminho: '/acesso-negado',
    pagina: 'AcessoNegadoPage',
    titulo: 'Acesso negado',
    perfisPermitidos: [],
    exigeTrocaDeSenha: false,
  };

  it('permite pela união dos perfis, não pela visão ativa', () => {
    expect(rotaPermitida(rotaDeUsuarios, ['administrador', 'professor'])).toBe(true);
    expect(rotaPermitida(rotaDeUsuarios, ['secretaria'])).toBe(false);
  });

  it('lista vazia significa qualquer autenticado; null significa rota anônima', () => {
    expect(rotaPermitida(rotaDeQualquerAutenticado, ['professor'])).toBe(true);
    expect(rotaEhAnonima(rotaAnonima)).toBe(true);
    expect(rotaEhAnonima(rotaDeUsuarios)).toBe(false);
    expect(temAlgumPerfil([], null)).toBe(true);
  });
});

describe('encontrarRota', () => {
  it('casa os caminhos declarados em config.ts, com ou sem barra final', () => {
    expect(encontrarRota('/usuarios')?.pagina).toBe('UsuariosPage');
    expect(encontrarRota('/usuarios/')?.pagina).toBe('UsuariosPage');
    expect(encontrarRota('/painel/professor')?.pagina).toBe('PainelProfessorPage');
  });

  it('devolve undefined para caminho inexistente — o curinga trata isso na rota', () => {
    expect(encontrarRota('/inventado')).toBeUndefined();
  });
});
