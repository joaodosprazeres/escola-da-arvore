/**
 * As 10 invariantes de `contracts/ports.ts`.
 *
 * Parametrizado por **fábrica de portas**: qualquer implementação (fake in-memory hoje, adaptador
 * real amanhã) passa pela mesma suíte. É o que impede o fake de virar stub complacente — se ele
 * aceitar o que o banco recusa, o teste de integração passa e a produção quebra.
 */
import { describe, expect, it } from 'vitest';
import { criarPortasFake } from '../../src/services/fakes';
import type { SementeDoFake } from '../../src/services/fakes';
import type { Portas } from '../../src/services/portas';

const PROFESSORES = [
  { id: 'prof-1', nome: 'Ana Ribeiro' },
  { id: 'prof-2', nome: 'Bruno Carvalho' },
];

const SENHA_ADMIN = 'Painel#Escola2026';
const SENHA_COORD = 'Coord#Escola2026';
const SENHA_BLOQUEADO = 'Bloqueado#2026';

function sementePadrao(agora: () => number): SementeDoFake {
  return {
    agora,
    professores: PROFESSORES,
    usuarios: [
      {
        id: 'u-admin',
        nome: 'Marina Diretora',
        email: 'admin@escola.local',
        senha: SENHA_ADMIN,
        perfis: ['administrador'],
      },
      {
        id: 'u-admin-2',
        nome: 'Paulo Vice',
        email: 'vice@escola.local',
        senha: SENHA_ADMIN,
        perfis: ['administrador'],
        situacao: 'desativado',
      },
      {
        id: 'u-coord',
        nome: 'Célia Nogueira',
        email: 'coord@escola.local',
        senha: SENHA_COORD,
        perfis: ['coordenacao', 'professor'],
        professorId: 'prof-2',
      },
      {
        id: 'u-bloqueado',
        nome: 'Renato Bloqueado',
        email: 'bloqueado@escola.local',
        senha: SENHA_BLOQUEADO,
        perfis: ['secretaria'],
        situacao: 'bloqueado',
      },
    ],
  };
}

interface Cenario {
  readonly portas: Portas;
  readonly avancar: (ms: number) => void;
}

type FabricaDePortas = () => Cenario;

const fabricaFake: FabricaDePortas = () => {
  let relogio = Date.parse('2026-08-11T09:00:00.000Z');
  const portas = criarPortasFake(sementePadrao(() => relogio));

  return {
    portas,
    avancar: (ms: number) => {
      relogio += ms;
    },
  };
};

function suiteDeInvariantes(nome: string, criar: FabricaDePortas): void {
  describe(`invariantes das portas — ${nome}`, () => {
    it('1. e-mail inexistente e senha errada devolvem exatamente credenciais_invalidas', async () => {
      const { portas } = criar();

      const inexistente = await portas.auth.entrar('ninguem@escola.local', 'QualquerCoisa#1');
      const senhaErrada = await portas.auth.entrar('admin@escola.local', 'SenhaErrada#1');

      expect(inexistente).toEqual({ ok: false, erro: { codigo: 'credenciais_invalidas' } });
      expect(senhaErrada).toEqual(inexistente);
    });

    it('2. conta bloqueada ou desativada é recusada mesmo com a senha certa', async () => {
      const { portas } = criar();

      const bloqueado = await portas.auth.entrar('bloqueado@escola.local', SENHA_BLOQUEADO);
      const desativado = await portas.auth.entrar('vice@escola.local', SENHA_ADMIN);

      expect(bloqueado).toEqual({
        ok: false,
        erro: { codigo: 'conta_indisponivel', situacao: 'bloqueado' },
      });
      expect(desativado).toEqual({
        ok: false,
        erro: { codigo: 'conta_indisponivel', situacao: 'desativado' },
      });
    });

    it('3. 5 falhas em 15 min contêm a conta, inclusive com a senha correta', async () => {
      const { portas, avancar } = criar();

      for (let tentativa = 0; tentativa < 5; tentativa += 1) {
        avancar(1_000);
        const falha = await portas.auth.entrar('admin@escola.local', 'SenhaErrada#1');
        expect(falha.ok).toBe(false);
      }

      const comSenhaCorreta = await portas.auth.entrar('admin@escola.local', SENHA_ADMIN);

      expect(comSenhaCorreta.ok).toBe(false);
      if (!comSenhaCorreta.ok) {
        expect(comSenhaCorreta.erro.codigo).toBe('contido_por_tentativas');
        if (comSenhaCorreta.erro.codigo === 'contido_por_tentativas') {
          expect(comSenhaCorreta.erro.liberadoEmSegundos).toBeGreaterThan(0);
        }
      }

      // Passada a janela, a conta volta a aceitar a senha correta.
      avancar(15 * 60 * 1000 + 1_000);
      const depois = await portas.auth.entrar('admin@escola.local', SENHA_ADMIN);
      expect(depois.ok).toBe(true);
    });

    it('4. criar com perfil professor sem vínculo devolve vinculo_professor_obrigatorio', async () => {
      const { portas } = criar();
      await portas.auth.entrar('admin@escola.local', SENHA_ADMIN);

      const resultado = await portas.usuarios.criar({
        nome: 'Novo Professor',
        email: 'novo.professor@escola.local',
        perfis: ['professor'],
        professorId: null,
      });

      expect(resultado).toEqual({
        ok: false,
        erro: { codigo: 'vinculo_professor_obrigatorio' },
      });
    });

    it('5. e-mail já usado, em qualquer caixa, devolve email_em_uso', async () => {
      const { portas } = criar();
      await portas.auth.entrar('admin@escola.local', SENHA_ADMIN);

      const resultado = await portas.usuarios.criar({
        nome: 'Outra Marina',
        email: 'Admin@Escola.Local',
        perfis: ['secretaria'],
        professorId: null,
      });

      expect(resultado).toEqual({ ok: false, erro: { codigo: 'email_em_uso' } });
    });

    it('6. bloquear, desativar ou rebaixar o último administrador ativo é recusado', async () => {
      const { portas } = criar();
      await portas.auth.entrar('admin@escola.local', SENHA_ADMIN);

      const bloqueio = await portas.usuarios.bloquear('u-admin');
      const desativacao = await portas.usuarios.desativar('u-admin');
      const rebaixamento = await portas.usuarios.definirPerfis('u-admin', ['secretaria']);

      expect(bloqueio).toEqual({ ok: false, erro: { codigo: 'ultimo_administrador' } });
      expect(desativacao).toEqual({ ok: false, erro: { codigo: 'ultimo_administrador' } });
      expect(rebaixamento).toEqual({ ok: false, erro: { codigo: 'ultimo_administrador' } });
    });

    it('7. chamadas de UsuariosPort por não-administrador devolvem nao_autorizado', async () => {
      const { portas } = criar();
      await portas.auth.entrar('coord@escola.local', SENHA_COORD);

      const listagem = await portas.usuarios.listar({});
      const criacao = await portas.usuarios.criar({
        nome: 'Tentativa',
        email: 'tentativa@escola.local',
        perfis: ['secretaria'],
        professorId: null,
      });
      const auditoria = await portas.auditoria.listar({});

      expect(listagem).toEqual({ ok: false, erro: { codigo: 'nao_autorizado' } });
      expect(criacao).toEqual({ ok: false, erro: { codigo: 'nao_autorizado' } });
      expect(auditoria).toEqual({ ok: false, erro: { codigo: 'nao_autorizado' } });
    });

    it('8. definirVisaoAtiva não altera perfis e não é consultada pelas listagens', async () => {
      const { portas } = criar();
      const entrada = await portas.auth.entrar('coord@escola.local', SENHA_COORD);
      expect(entrada.ok).toBe(true);

      const antes = portas.sessao.getSnapshot();
      expect(antes.status).toBe('autenticado');

      const troca = await portas.auth.definirVisaoAtiva('professor');
      expect(troca.ok).toBe(true);

      const depois = portas.sessao.getSnapshot();
      if (depois.status !== 'autenticado' || antes.status !== 'autenticado') {
        throw new Error('sessão deveria estar autenticada');
      }

      expect(depois.usuario.visaoAtiva).toBe('professor');
      expect([...depois.usuario.perfis].sort()).toEqual([...antes.usuario.perfis].sort());

      const naoAtribuido = await portas.auth.definirVisaoAtiva('administrador');
      expect(naoAtribuido).toEqual({ ok: false, erro: { codigo: 'perfil_nao_atribuido' } });
    });

    it('9. remover o perfil da visão ativa reajusta para o de maior alcance restante', async () => {
      const { portas } = criar();
      await portas.auth.entrar('admin@escola.local', SENHA_ADMIN);

      const resultado = await portas.usuarios.definirPerfis('u-coord', ['professor']);

      expect(resultado.ok).toBe(true);
      if (resultado.ok) {
        expect(resultado.valor.perfis).toEqual(['professor']);
        expect(resultado.valor.visaoAtiva).toBe('professor');
      }
    });

    it('10. redefinirSenhaComLink invalida o link e derruba a sessão para anonimo', async () => {
      const { portas } = criar();
      await portas.auth.entrar('coord@escola.local', SENHA_COORD);

      await portas.auth.solicitarRecuperacao('coord@escola.local');
      const primeiro = ultimoToken(portas);

      // Um pedido novo invalida o anterior (FR-031).
      await portas.auth.solicitarRecuperacao('coord@escola.local');
      const segundo = ultimoToken(portas);
      expect(segundo).not.toBe(primeiro);

      const comLinkAntigo = await portas.auth.redefinirSenhaComLink(primeiro, 'Trilha#Verde2026');
      expect(comLinkAntigo).toEqual({ ok: false, erro: { codigo: 'link_invalido' } });

      const redefinicao = await portas.auth.redefinirSenhaComLink(segundo, 'Trilha#Verde2026');
      expect(redefinicao.ok).toBe(true);
      expect(portas.sessao.getSnapshot().status).toBe('anonimo');

      const reuso = await portas.auth.redefinirSenhaComLink(segundo, 'Outra#Trilha2026');
      expect(reuso).toEqual({ ok: false, erro: { codigo: 'link_invalido' } });

      const comSenhaNova = await portas.auth.entrar('coord@escola.local', 'Trilha#Verde2026');
      expect(comSenhaNova.ok).toBe(true);
    });
  });
}

/**
 * O token do link só é observável no fake (no adaptador real ele chega por e-mail). Quando esta
 * suíte for apontada para outra implementação, este acesso vira o gancho a ser reimplementado.
 */
function ultimoToken(portas: Portas): string {
  const comEstado = portas as { estado?: { links: { token: string }[] } };
  const links = comEstado.estado?.links ?? [];
  const ultimo = links[links.length - 1];

  if (ultimo === undefined) throw new Error('nenhum link de recuperação emitido');

  return ultimo.token;
}

suiteDeInvariantes('fake in-memory', fabricaFake);
