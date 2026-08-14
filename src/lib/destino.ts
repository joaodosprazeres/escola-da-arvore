/**
 * Validação de `?destino=` — função pura (R-04 regra 4).
 *
 * Sem esta checagem, `?destino=https://…` transforma a tela de entrada em redirecionamento aberto,
 * no exato momento em que o usuário acabou de digitar a senha. Só é honrado o caminho interno que
 * começa com `/` e não com `//` nem `/\`; qualquer outra forma é descartada em silêncio.
 */

export function destinoInternoValido(destino: string | null | undefined): string | null {
  if (destino === null || destino === undefined) return null;

  const valor = destino.trim();

  if (valor === '') return null;
  if (!valor.startsWith('/')) return null;
  if (valor.startsWith('//')) return null;
  if (valor.startsWith('/\\')) return null;
  if (valor.includes('\\')) return null;
  // Caracteres de controle (inclusive \n e \t) burlam a checagem de prefixo em alguns parsers.
  // eslint-disable-next-line no-control-regex
  if (/[\u0000-\u001F\u007F]/.test(destino)) return null;

  return valor;
}

/** Monta o `?destino=` da rota atual, já codificado (FR-006). */
export function comoParametroDeDestino(caminho: string, busca = ''): string {
  return encodeURIComponent(`${caminho}${busca}`);
}
