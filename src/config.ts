/**
 * Personalização única da aplicação (Princípio III).
 *
 * Contém **dados**, nunca lógica, JSX ou import de componente — e, deliberadamente, nenhum import
 * de `react-router-dom`: a tabela de rotas é declarada aqui e traduzida por `main.tsx` (R-04).
 * Segredos e endpoints não entram aqui (ver `.env`).
 */
import type { ItemDeMenu, Perfil, RegraDeSenhaExibida, Rota, TemposDeSessao } from './types';

export const NOME_DA_INSTITUICAO = 'Escola da Árvore';

/* ------------------------------------------------------------------ *
 * Perfis
 * ------------------------------------------------------------------ */

/** Ordem de alcance (Assumptions da spec / R-10). Maior número = maior alcance. */
export const ALCANCE_DO_PERFIL: Record<Perfil, number> = {
  administrador: 4,
  secretaria: 3,
  coordenacao: 2,
  professor: 1,
};

export const NOME_DO_PERFIL: Record<Perfil, string> = {
  administrador: 'Administrador',
  secretaria: 'Secretaria',
  coordenacao: 'Coordenação',
  professor: 'Professor',
};

export const PAINEL_DO_PERFIL: Record<Perfil, string> = {
  administrador: '/painel/administrador',
  secretaria: '/painel/secretaria',
  coordenacao: '/painel/coordenacao',
  professor: '/painel/professor',
};

export const NOME_DA_SITUACAO = {
  ativo: 'Ativo',
  bloqueado: 'Bloqueado',
  desativado: 'Desativado',
} as const;

/* ------------------------------------------------------------------ *
 * Rotas (contracts/rls-e-rotas.md Parte B)
 * ------------------------------------------------------------------ */

export const ROTAS: readonly Rota[] = [
  {
    caminho: '/entrar',
    pagina: 'EntrarPage',
    titulo: 'Entrar',
    perfisPermitidos: null,
    exigeTrocaDeSenha: false,
  },
  {
    caminho: '/esqueci-senha',
    pagina: 'EsqueciSenhaPage',
    titulo: 'Esqueci minha senha',
    perfisPermitidos: null,
    exigeTrocaDeSenha: false,
  },
  {
    caminho: '/redefinir-senha',
    pagina: 'RedefinirSenhaPage',
    titulo: 'Redefinir senha',
    perfisPermitidos: null,
    exigeTrocaDeSenha: false,
  },
  {
    caminho: '/trocar-senha',
    pagina: 'TrocarSenhaPage',
    titulo: 'Trocar senha',
    perfisPermitidos: [],
    exigeTrocaDeSenha: true,
  },
  {
    caminho: '/painel/administrador',
    pagina: 'PainelAdministradorPage',
    titulo: 'Painel do Administrador',
    perfisPermitidos: ['administrador'],
    exigeTrocaDeSenha: false,
  },
  {
    caminho: '/painel/secretaria',
    pagina: 'PainelSecretariaPage',
    titulo: 'Painel da Secretaria',
    perfisPermitidos: ['secretaria'],
    exigeTrocaDeSenha: false,
  },
  {
    caminho: '/painel/coordenacao',
    pagina: 'PainelCoordenacaoPage',
    titulo: 'Painel da Coordenação',
    perfisPermitidos: ['coordenacao'],
    exigeTrocaDeSenha: false,
  },
  {
    caminho: '/painel/professor',
    pagina: 'PainelProfessorPage',
    titulo: 'Painel do Professor',
    perfisPermitidos: ['professor'],
    exigeTrocaDeSenha: false,
  },
  {
    caminho: '/usuarios',
    pagina: 'UsuariosPage',
    titulo: 'Usuários',
    perfisPermitidos: ['administrador'],
    exigeTrocaDeSenha: false,
  },
  {
    caminho: '/usuarios/novo',
    pagina: 'NovoUsuarioPage',
    titulo: 'Novo usuário',
    perfisPermitidos: ['administrador'],
    exigeTrocaDeSenha: false,
  },
  {
    caminho: '/auditoria',
    pagina: 'AuditoriaPage',
    titulo: 'Histórico de ações',
    perfisPermitidos: ['administrador'],
    exigeTrocaDeSenha: false,
  },
  {
    caminho: '/acesso-negado',
    pagina: 'AcessoNegadoPage',
    titulo: 'Acesso negado',
    perfisPermitidos: [],
    exigeTrocaDeSenha: false,
  },
  {
    caminho: '*',
    pagina: 'NaoEncontradaPage',
    titulo: 'Página não encontrada',
    perfisPermitidos: null,
    exigeTrocaDeSenha: false,
  },
];

/* ------------------------------------------------------------------ *
 * Menu por visão ativa (FR-014)
 * ------------------------------------------------------------------ */

export const ITENS_DE_MENU: Record<Perfil, readonly ItemDeMenu[]> = {
  administrador: [
    { caminho: '/painel/administrador', rotulo: 'Painel', icone: 'painel' },
    { caminho: '/usuarios', rotulo: 'Usuários', icone: 'usuarios' },
    { caminho: '/auditoria', rotulo: 'Histórico de ações', icone: 'auditoria' },
  ],
  secretaria: [{ caminho: '/painel/secretaria', rotulo: 'Painel', icone: 'painel' }],
  coordenacao: [{ caminho: '/painel/coordenacao', rotulo: 'Painel', icone: 'painel' }],
  professor: [{ caminho: '/painel/professor', rotulo: 'Painel', icone: 'painel' }],
};

/* ------------------------------------------------------------------ *
 * Sessão (R-08)
 * ------------------------------------------------------------------ */

export const TEMPOS_DE_SESSAO: TemposDeSessao = {
  inatividadeEmMinutos: 30,
  limiteAbsolutoEmHoras: 12,
  avisoDeExpiracaoEmSegundos: 60,
};

/* ------------------------------------------------------------------ *
 * Senha (FR-028 / R-09)
 * ------------------------------------------------------------------ */

export const TAMANHO_MINIMO_DE_SENHA = 8;

export const REGRAS_DE_SENHA_EXIBIDAS: readonly RegraDeSenhaExibida[] = [
  { codigo: 'comprimento', texto: 'Ter pelo menos 8 caracteres' },
  { codigo: 'nao_comum', texto: 'Não ser uma senha muito comum ou fácil de adivinhar' },
  { codigo: 'sem_espacos_nas_pontas', texto: 'Não começar nem terminar com espaço' },
  { codigo: 'diferente_do_email', texto: 'Ser diferente do seu e-mail e do seu nome' },
];

/* ------------------------------------------------------------------ *
 * Textos em pt-BR (FR-048). Códigos de erro das portas → texto exibido.
 * ------------------------------------------------------------------ */

export const TEXTOS = {
  entrada: {
    titulo: 'Entrar',
    rotuloEmail: 'E-mail',
    rotuloSenha: 'Senha',
    acaoEntrar: 'Entrar',
    acaoEntrando: 'Entrando…',
    linkEsqueciSenha: 'Esqueci minha senha',
    avisoSessaoExpirada: 'Sua sessão expirou por inatividade. Entre novamente para continuar.',
    avisoSaidaConcluida: 'Você saiu do sistema.',
  },
  errosDeEntrada: {
    credenciais_invalidas: 'E-mail ou senha incorretos.',
    conta_indisponivel:
      'Não foi possível entrar. Procure a secretaria da escola para regularizar seu acesso.',
    contido_por_tentativas:
      'Muitas tentativas seguidas. Você poderá tentar novamente em {minutos} minuto(s).',
    indisponivel: 'O sistema está indisponível no momento. Tente novamente em alguns minutos.',
    campo_email_obrigatorio: 'Informe seu e-mail.',
    campo_senha_obrigatoria: 'Informe sua senha.',
  },
  errosDeSenha: {
    senha_fraca: 'A senha não atende às regras mínimas:',
    link_invalido: 'Este link não é mais válido. Solicite um novo link de redefinição.',
    sessao_expirada: 'Sua sessão expirou. Entre novamente para trocar a senha.',
    indisponivel: 'Não foi possível alterar a senha agora. Tente novamente em alguns minutos.',
    confirmacao_diferente: 'A confirmação não confere com a nova senha.',
  },
  errosDeGestao: {
    email_em_uso: 'Este e-mail já está sendo usado por outro usuário.',
    vinculo_professor_obrigatorio:
      'O perfil Professor exige o vínculo com um registro de professor da escola.',
    perfil_obrigatorio: 'Escolha ao menos um perfil para o usuário.',
    ultimo_administrador:
      'Esta é a última conta ativa com o perfil Administrador. Atribua o perfil a outra pessoa antes de continuar.',
    nao_autorizado: 'Você não tem permissão para executar esta ação.',
    indisponivel: 'Não foi possível concluir a operação agora. Tente novamente em alguns minutos.',
  },
  trocaDeSenha: {
    titulo: 'Trocar senha',
    explicacaoPrimeiroAcesso:
      'Este é o seu primeiro acesso. Defina uma senha pessoal para continuar.',
    rotuloNovaSenha: 'Nova senha',
    rotuloConfirmacao: 'Confirmar nova senha',
    acaoSalvar: 'Salvar nova senha',
    acaoSalvando: 'Salvando…',
    sucesso: 'Senha alterada.',
  },
  recuperacao: {
    titulo: 'Esqueci minha senha',
    explicacao:
      'Informe o e-mail cadastrado. Se houver uma conta ativa com esse endereço, enviaremos um link para redefinir a senha.',
    acaoEnviar: 'Enviar link',
    acaoEnviando: 'Enviando…',
    confirmacaoGenerica:
      'Se houver uma conta ativa com esse e-mail, enviamos um link para redefinir a senha. O link vale por 1 hora.',
    voltarParaEntrar: 'Voltar para a tela de entrada',
  },
  redefinicao: {
    titulo: 'Redefinir senha',
    explicacao: 'Defina a nova senha da sua conta.',
    acaoRedefinir: 'Redefinir senha',
    acaoRedefinindo: 'Redefinindo…',
    sucesso: 'Senha redefinida. Entre com a nova senha.',
    solicitarNovoLink: 'Solicitar um novo link',
  },
  usuarios: {
    titulo: 'Usuários',
    acaoNovo: 'Cadastrar usuário',
    rotuloBusca: 'Buscar por nome ou e-mail',
    rotuloFiltroPerfil: 'Filtrar por perfil',
    rotuloFiltroSituacao: 'Filtrar por situação',
    opcaoTodos: 'Todos',
    listaVazia: 'Nenhum usuário encontrado com esses filtros.',
    colunaNome: 'Nome',
    colunaEmail: 'E-mail',
    colunaPerfis: 'Perfis',
    colunaSituacao: 'Situação',
    colunaAcoes: 'Ações',
    marcaPrimeiroAcesso: 'Primeiro acesso pendente',
    acaoBloquear: 'Bloquear',
    acaoDesbloquear: 'Desbloquear',
    acaoDesativar: 'Desativar',
    confirmarBloqueio: 'Bloquear {nome}? A pessoa deixa de entrar até ser desbloqueada.',
    confirmarDesbloqueio: 'Desbloquear {nome}? A pessoa volta a entrar com a mesma senha.',
    confirmarDesativacao:
      'Desativar {nome}? A conta deixa de existir para uso, mas o histórico é preservado.',
    confirmar: 'Confirmar',
    cancelar: 'Cancelar',
    sucessoBloqueio: 'Usuário bloqueado.',
    sucessoDesbloqueio: 'Usuário desbloqueado.',
    sucessoDesativacao: 'Usuário desativado.',
  },
  novoUsuario: {
    titulo: 'Novo usuário',
    rotuloNome: 'Nome completo',
    rotuloEmail: 'E-mail',
    rotuloPerfis: 'Perfis (ao menos um)',
    rotuloProfessor: 'Registro de professor vinculado',
    explicacaoProfessor:
      'Obrigatório quando o perfil Professor está entre os selecionados: é o vínculo que define quais turmas a conta alcança.',
    acaoCriar: 'Cadastrar',
    acaoCriando: 'Cadastrando…',
    sucesso: 'Usuário {nome} cadastrado. A senha temporária foi enviada por e-mail.',
    cancelar: 'Cancelar',
  },
  auditoria: {
    titulo: 'Histórico de ações',
    rotuloFiltroAfetado: 'Usuário afetado',
    rotuloFiltroDe: 'De',
    rotuloFiltroAte: 'Até',
    acaoFiltrar: 'Filtrar',
    listaVazia: 'Nenhum registro no período.',
    colunaMomento: 'Data e hora',
    colunaAutor: 'Autor',
    colunaAfetado: 'Usuário afetado',
    colunaAcao: 'Ação',
    colunaAnterior: 'Valor anterior',
    colunaNovo: 'Valor novo',
  },
  acoesDeAuditoria: {
    usuario_criado: 'Usuário criado',
    perfil_atribuido: 'Perfil atribuído',
    perfil_removido: 'Perfil removido',
    usuario_bloqueado: 'Usuário bloqueado',
    usuario_desbloqueado: 'Usuário desbloqueado',
    usuario_desativado: 'Usuário desativado',
    senha_redefinida_admin: 'Senha redefinida pelo administrador',
    visao_ativa_alterada: 'Visão ativa alterada',
  },
  acessoNegado: {
    titulo: 'Acesso negado',
    explicacao: 'Seu perfil não alcança esta área. Se você precisa dela, procure a secretaria.',
    voltarAoPainel: 'Ir para o meu painel',
  },
  naoEncontrada: {
    titulo: 'Página não encontrada',
    explicacao: 'O endereço acessado não existe.',
    voltarAoPainel: 'Ir para o meu painel',
  },
  layout: {
    rotuloMenu: 'Menu principal',
    acaoSair: 'Sair',
    carregando: 'Carregando…',
    saudacao: 'Olá, {nome}',
    rotuloSeletorDeVisao: 'Visão ativa',
    visaoAtual: 'Visão ativa: {perfil}',
    trocarPara: 'Usar visão de {perfil}',
    avisoVisaoAjustada:
      'Seus perfis mudaram. Sua visão ativa passou a ser {perfil}, o perfil de maior alcance entre os que você possui.',
    avisoSemPerfil: 'Seus perfis foram removidos e a sessão foi encerrada. Procure a secretaria.',
    irParaConteudo: 'Ir para o conteúdo',
  },
  paineis: {
    administrador: 'Cadastro de contas, perfis e histórico de ações da escola.',
    secretaria: 'Atendimento e rotinas administrativas do dia a dia.',
    coordenacao: 'Acompanhamento pedagógico de turmas e alunos.',
    professor: 'Suas turmas e seus alunos.',
    professorSemVinculo:
      'Nenhuma turma vinculada à sua conta ainda. Procure a secretaria para concluir o vínculo.',
  },
} as const;
