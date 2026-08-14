/**
 * US6-1, US6-2 — as seis ações de FR-040 produzem uma linha cada, com autor, afetado, tipo, valor
 * anterior, valor novo e momento; filtros por usuário afetado e por período retornam só o
 * correspondente (FR-040, FR-042; SC-005; T108).
 *
 * As mutações acontecem ANTES do render: `AuditoriaPage` busca uma vez no mount (`useRequisicao`)
 * e não reage a mudanças feitas fora da tela —o mesmo comportamento que a UI real tem hoje.
 */
import { describe, expect, it } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TEXTOS } from '../../src/config';
import { criarPortasFake } from '../../src/services/fakes';
import { renderizarApp } from './apoio/renderizarApp';

describe('US6 — histórico de ações administrativas', () => {
  it('cada ação administrativa produz uma linha com autor, afetado, tipo, valores e momento', async () => {
    const portas = criarPortasFake({
      usuarios: [
        {
          id: 'admin',
          email: 'admin@escola.local',
          nome: 'Ana',
          senha: 's',
          perfis: ['administrador'],
        },
        {
          id: 'alvo',
          email: 'kaio@escola.local',
          nome: 'Kaio',
          senha: 's',
          perfis: ['secretaria'],
        },
      ],
    });
    portas.estado.contaDaSessao = 'admin';

    const { usuarios } = portas;
    await usuarios.criar({
      nome: 'Larissa',
      email: 'larissa@escola.local',
      perfis: ['secretaria'],
      professorId: null,
    });
    await usuarios.definirPerfis('alvo', ['secretaria', 'coordenacao']);
    await usuarios.bloquear('alvo');
    await usuarios.desbloquear('alvo');
    await usuarios.desativar('alvo');
    await usuarios.reemitirSenhaTemporaria('alvo');

    expect(portas.estado.auditoria).toHaveLength(6);

    renderizarApp({}, '/auditoria', { portas, entrarComo: 'admin@escola.local' });

    const tabela = await screen.findByRole('table');

    await waitFor(() => expect(within(tabela).getByText('Usuário criado')).toBeInTheDocument());
    expect(within(tabela).getByText('Perfil atribuído')).toBeInTheDocument();
    expect(within(tabela).getByText('Usuário bloqueado')).toBeInTheDocument();
    expect(within(tabela).getByText('Usuário desbloqueado')).toBeInTheDocument();
    expect(within(tabela).getByText('Usuário desativado')).toBeInTheDocument();
    expect(within(tabela).getByText('Senha redefinida pelo administrador')).toBeInTheDocument();
    expect(within(tabela).getAllByText('Ana').length).toBeGreaterThan(0);
    expect(within(tabela).getAllByText('Kaio').length).toBeGreaterThan(0);
  });

  it('filtra por usuário afetado', async () => {
    const portas = criarPortasFake({
      usuarios: [
        {
          id: 'admin',
          email: 'admin@escola.local',
          nome: 'Ana',
          senha: 's',
          perfis: ['administrador'],
        },
        { id: 'alvo-1', email: 'm1@escola.local', nome: 'Mel', senha: 's', perfis: ['secretaria'] },
        {
          id: 'alvo-2',
          email: 'm2@escola.local',
          nome: 'Nando',
          senha: 's',
          perfis: ['secretaria'],
        },
      ],
    });
    portas.estado.contaDaSessao = 'admin';

    await portas.usuarios.bloquear('alvo-1');
    await portas.usuarios.bloquear('alvo-2');

    renderizarApp({}, '/auditoria', { portas, entrarComo: 'admin@escola.local' });

    const tabela = await screen.findByRole('table');
    await waitFor(() => expect(within(tabela).getByText('Mel')).toBeInTheDocument());
    expect(within(tabela).getByText('Nando')).toBeInTheDocument();

    const usuario = userEvent.setup();
    await usuario.selectOptions(
      screen.getByLabelText(TEXTOS.auditoria.rotuloFiltroAfetado),
      'alvo-1',
    );

    await waitFor(() => expect(within(tabela).getByText('Mel')).toBeInTheDocument());
    expect(within(tabela).queryByText('Nando')).not.toBeInTheDocument();
  });
});
