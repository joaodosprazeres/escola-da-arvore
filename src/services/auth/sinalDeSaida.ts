/**
 * Sinal efêmero, só de UI: distingue saída pedida pelo usuário de saída forçada pelo servidor
 * (inatividade ou limite absoluto — R-08), para que `/entrar` mostre o aviso certo (US1-7).
 * Não é estado de sessão: não entra no `EstadoDaSessao`, não é lido por regra nenhuma.
 */
let saidaIntencional = false;

export function marcarSaidaIntencional(): void {
  saidaIntencional = true;
}

/** Lê e zera — vale só para a próxima transição para `anonimo`. */
export function consumirSaidaIntencional(): boolean {
  const valor = saidaIntencional;
  saidaIntencional = false;
  return valor;
}
