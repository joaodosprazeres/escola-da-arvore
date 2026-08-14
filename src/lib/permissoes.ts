/**
 * Regras de perfil — funções puras (Princípio II). Nada aqui navega nem toca em I/O (R-04).
 */
import { ALCANCE_DO_PERFIL, ROTAS } from '../config';
import type { Perfil, Rota } from '../types';

/** União das atribuições = permissões efetivas (FR-009). Sem herança entre perfis. */
export function unirPerfis(...listas: readonly (readonly Perfil[])[]): readonly Perfil[] {
  const unidos = new Set<Perfil>();
  for (const lista of listas) for (const perfil of lista) unidos.add(perfil);
  return [...unidos];
}

/** Visão inicial na ausência de preferência: o perfil de maior alcance (FR-011, R-10). */
export function visaoPadrao(perfis: readonly Perfil[]): Perfil | null {
  let escolhido: Perfil | null = null;

  for (const perfil of perfis) {
    if (escolhido === null || ALCANCE_DO_PERFIL[perfil] > ALCANCE_DO_PERFIL[escolhido]) {
      escolhido = perfil;
    }
  }

  return escolhido;
}

/** A visão ativa é sempre um dos perfis atribuídos (FR-010 / INV-3). */
export function ajustarVisaoAtiva(
  visaoAtual: Perfil | null,
  perfis: readonly Perfil[],
): Perfil | null {
  if (visaoAtual !== null && perfis.includes(visaoAtual)) return visaoAtual;
  return visaoPadrao(perfis);
}

export function temAlgumPerfil(
  perfis: readonly Perfil[],
  permitidos: readonly Perfil[] | null,
): boolean {
  if (permitidos === null) return true;
  if (permitidos.length === 0) return true;
  return permitidos.some((perfil) => perfis.includes(perfil));
}

/**
 * Casamento rota × permissões efetivas — nunca contra a visão ativa, que só muda painel e menu
 * (FR-013).
 */
export function rotaPermitida(rota: Rota, perfis: readonly Perfil[]): boolean {
  return temAlgumPerfil(perfis, rota.perfisPermitidos);
}

export function rotaEhAnonima(rota: Rota): boolean {
  return rota.perfisPermitidos === null;
}

/** Casa um caminho contra a tabela de `config.ts`; `undefined` = rota inexistente. */
export function encontrarRota(caminho: string): Rota | undefined {
  const semBarraFinal =
    caminho.length > 1 && caminho.endsWith('/') ? caminho.slice(0, -1) : caminho;

  return ROTAS.find((rota) => rota.caminho !== '*' && rota.caminho === semBarraFinal);
}
