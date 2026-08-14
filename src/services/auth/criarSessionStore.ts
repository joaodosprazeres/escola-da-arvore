/**
 * Store externo da sessão (R-03).
 *
 * Fábrica, nunca singleton de módulo: cada teste monta o seu e nada vaza entre arquivos.
 * `getSnapshot` devolve a **mesma referência** enquanto nada muda — sem isso o
 * `useSyncExternalStore` entra em laço infinito.
 */
import type { EstadoDaSessao } from '../../types';
import type { AuthPort, SessionStore } from './types';

export interface SessionStoreControlado extends SessionStore {
  /** Cancela a assinatura na porta. Usado no desmonte da aplicação e no fim de cada teste. */
  encerrar(): void;
}

function mesmoEstado(a: EstadoDaSessao, b: EstadoDaSessao): boolean {
  if (a.status !== b.status) return false;
  if (a.status !== 'autenticado' || b.status !== 'autenticado') return true;

  const x = a.usuario;
  const y = b.usuario;

  return (
    x.id === y.id &&
    x.nome === y.nome &&
    x.email === y.email &&
    x.visaoAtiva === y.visaoAtiva &&
    x.primeiroAcesso === y.primeiroAcesso &&
    x.situacao === y.situacao &&
    x.perfis.length === y.perfis.length &&
    x.perfis.every((perfil, indice) => perfil === y.perfis[indice])
  );
}

export function criarSessionStore(auth: AuthPort): SessionStoreControlado {
  let snapshot: EstadoDaSessao = auth.obterEstado();
  const ouvintes = new Set<() => void>();

  const cancelar = auth.aoMudarSessao((estado) => {
    if (mesmoEstado(snapshot, estado)) return;
    snapshot = estado;
    for (const ouvinte of ouvintes) ouvinte();
  });

  return {
    subscribe(ouvinte: () => void): () => void {
      ouvintes.add(ouvinte);
      return () => {
        ouvintes.delete(ouvinte);
      };
    },
    getSnapshot(): EstadoDaSessao {
      return snapshot;
    },
    encerrar(): void {
      ouvintes.clear();
      cancelar();
    },
  };
}
