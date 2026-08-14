import { describe, expect, it } from 'vitest';
import { comoParametroDeDestino, destinoInternoValido } from '../../src/lib/destino';

describe('destinoInternoValido — redirecionamento aberto (FR-006, R-04 regra 4)', () => {
  it('honra caminho interno', () => {
    expect(destinoInternoValido('/usuarios')).toBe('/usuarios');
    expect(destinoInternoValido('/auditoria?de=2026-01-01')).toBe('/auditoria?de=2026-01-01');
  });

  it('descarta URL absoluta e esquema', () => {
    expect(destinoInternoValido('https://exemplo.invalido/roubo')).toBeNull();
    expect(destinoInternoValido('http://exemplo.invalido')).toBeNull();
    expect(destinoInternoValido('javascript:alert(1)')).toBeNull();
    expect(destinoInternoValido('data:text/html,<script>')).toBeNull();
  });

  it('descarta caminho protocolo-relativo e barra invertida', () => {
    expect(destinoInternoValido('//exemplo.invalido')).toBeNull();
    expect(destinoInternoValido('/\\exemplo.invalido')).toBeNull();
    expect(destinoInternoValido('/usuarios\\..\\painel')).toBeNull();
  });

  it('descarta vazio, nulo e caracteres de controle', () => {
    expect(destinoInternoValido(null)).toBeNull();
    expect(destinoInternoValido(undefined)).toBeNull();
    expect(destinoInternoValido('')).toBeNull();
    expect(destinoInternoValido('   ')).toBeNull();
    expect(destinoInternoValido('/usuarios\n')).toBeNull();
    expect(destinoInternoValido('/\tusuarios')).toBeNull();
  });
});

describe('comoParametroDeDestino', () => {
  it('codifica caminho e busca em um único parâmetro', () => {
    expect(comoParametroDeDestino('/auditoria', '?de=2026-01-01')).toBe(
      '%2Fauditoria%3Fde%3D2026-01-01',
    );
    expect(decodeURIComponent(comoParametroDeDestino('/usuarios'))).toBe('/usuarios');
  });
});
