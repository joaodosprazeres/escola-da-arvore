/**
 * FR-033 — nenhum registro produzido pelas rotinas de auditoria contém senha, hash ou token em
 * texto legível (T110).
 */
import { describe, expect, it } from 'vitest';
import { criarPortasFake } from '../../src/services/fakes';

const SENHA_SECRETA = 'super-segredo-do-admin-9x';

describe('auditoria — sem segredo', () => {
  it('criar, definir perfis, bloquear, desbloquear, desativar e reemitir senha não gravam a senha em texto legível', async () => {
    const portas = criarPortasFake({
      usuarios: [
        {
          id: 'admin',
          email: 'admin@escola.local',
          nome: 'Ana',
          senha: SENHA_SECRETA,
          perfis: ['administrador'],
        },
        {
          id: 'alvo',
          email: 'olga@escola.local',
          nome: 'Olga',
          senha: 'outra-senha-secreta',
          perfis: ['secretaria'],
        },
      ],
    });

    portas.estado.contaDaSessao = 'admin';

    await portas.usuarios.criar({
      nome: 'Paulo',
      email: 'paulo@escola.local',
      perfis: ['secretaria'],
      professorId: null,
    });
    await portas.usuarios.definirPerfis('alvo', ['secretaria', 'coordenacao']);
    await portas.usuarios.bloquear('alvo');
    await portas.usuarios.desbloquear('alvo');
    await portas.usuarios.desativar('alvo');
    await portas.usuarios.reemitirSenhaTemporaria('alvo');

    expect(portas.estado.auditoria.length).toBeGreaterThan(0);

    for (const registro of portas.estado.auditoria) {
      const serializado = JSON.stringify(registro);
      expect(serializado).not.toContain(SENHA_SECRETA);
      expect(serializado).not.toContain('outra-senha-secreta');

      // `acao` legitimamente contém a palavra "senha" (ex.: `senha_redefinida_admin`) — o que
      // FR-033 proíbe é o VALOR da senha aparecer em `valorAnterior`/`valorNovo`, não o nome da ação.
      const valores = JSON.stringify([registro.valorAnterior, registro.valorNovo]).toLowerCase();
      expect(valores).not.toMatch(/senha|password|token|hash/);
    }
  });
});
