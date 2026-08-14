# Feature Specification: Autenticação e Controle de Acesso por Perfil

**Feature Branch**: `001-autenticacao-controle-acesso`

**Created**: 2026-08-10

**Status**: Draft

**Input**: User description: "Autenticação e Controle de Acesso por Perfil (Gestão Escolar da Escola da Árvore) — primeira funcionalidade P1 do MVP. Permitir que usuários da escola (Administrador, Secretaria, Coordenação, Professor) acessem o sistema com e-mail e senha, sejam direcionados a um painel inicial correspondente ao seu perfil, e que o Administrador gerencie usuários, perfis e bloqueios. O controle de acesso deve ser aplicado na camada de dados, não apenas na interface."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Entrar no sistema e chegar ao painel do meu perfil (Priority: P1)

Um profissional da escola abre o sistema, informa e-mail e senha, e é levado a um ponto de partida
que corresponde à sua função. Um professor chega a um painel voltado às suas aulas; secretaria,
coordenação e administração chegam a painéis próprios. O menu exibe somente o que aquele perfil pode
acessar. Quem acumula funções na escola — por exemplo, coordena e também dá aula — possui mais de um
perfil, entra direto na sua visão preferida e alterna para a outra quando precisa. Ao terminar, o
usuário sai do sistema e sua sessão deixa de valer.

**Why this priority**: Nenhuma outra funcionalidade do produto é utilizável sem identificar quem é o
usuário. É a menor fatia que já entrega valor demonstrável: acesso controlado ao sistema.

**Independent Test**: Com usuários previamente cadastrados de cada perfil, pode ser testada por
completo tentando entrar com credenciais válidas e inválidas, verificando o destino após a entrada,
o conteúdo do menu e o efeito da saída — sem que nenhuma outra funcionalidade exista.

**Acceptance Scenarios**:

1. **Given** um usuário ativo com perfil Professor, **When** informa e-mail e senha corretos, **Then**
   é autenticado e chega ao painel de Professor, com o menu limitado às opções desse perfil.
2. **Given** um usuário ativo com perfil Secretaria, **When** informa e-mail e senha corretos, **Then**
   é autenticado e chega ao painel de Secretaria, com o menu limitado às opções desse perfil.
3. **Given** um e-mail cadastrado, **When** informa senha incorreta, **Then** o acesso é negado com uma
   mensagem genérica que não revela se o e-mail existe.
4. **Given** um e-mail não cadastrado, **When** tenta entrar, **Then** recebe exatamente a mesma
   mensagem genérica do cenário anterior, no mesmo tempo de resposta aproximado.
5. **Given** um usuário desativado ou bloqueado, **When** informa a senha correta, **Then** o acesso é
   negado e ele é informado de que deve procurar a secretaria da escola.
6. **Given** um usuário autenticado, **When** aciona a opção de sair, **Then** a sessão é encerrada e
   qualquer tentativa de voltar a uma tela interna leva de volta à tela de entrada.
7. **Given** um usuário autenticado que ficou inativo além do tempo limite, **When** tenta qualquer
   ação, **Then** a sessão é encerrada e ele é levado à tela de entrada com aviso de expiração.
8. **Given** um visitante não autenticado, **When** acessa diretamente o endereço de uma tela interna,
   **Then** é levado à tela de entrada e, após autenticar-se, segue para o destino pretendido, desde
   que seu perfil tenha permissão para ele.
9. **Given** um usuário com mais de um perfil, **When** se autentica, **Then** chega direto ao painel
   da sua visão preferida, sem passar por tela intermediária de escolha, e o sistema indica de forma
   visível qual visão está ativa.
10. **Given** um usuário com mais de um perfil autenticado, **When** alterna para outra de suas
    visões, **Then** o painel e o menu passam a ser os daquela visão, sem exigir nova autenticação, e
    a escolha permanece válida no próximo acesso.

---

### User Story 2 - Administrador cadastra um usuário e define seus perfis (Priority: P1)

O Administrador cria a conta de um profissional da escola, atribui um ou mais perfis e, quando um
deles é Professor, vincula a conta ao registro do professor. O sistema entrega uma senha temporária.
No primeiro acesso, o novo usuário é obrigado a trocar a senha antes de conseguir navegar por
qualquer outra tela. Somente o Administrador cria contas e altera perfis.

**Why this priority**: Sem cadastro de usuários não existe ninguém para autenticar. Não há
auto-cadastro, porque o sistema trata dados pessoais de menores e o acesso precisa ser concedido
deliberadamente pela escola.

**Independent Test**: Pode ser testada criando um usuário de cada perfil, verificando a entrega da
senha temporária, a obrigatoriedade da troca no primeiro acesso e o bloqueio de navegação enquanto a
troca não ocorre.

**Acceptance Scenarios**:

1. **Given** um Administrador autenticado, **When** cadastra um usuário informando nome, e-mail e ao
   menos um perfil, **Then** o usuário é criado como ativo, em estado de primeiro acesso, e o sistema
   confirma a criação exibindo o registro na lista de usuários.
2. **Given** o cadastro de um usuário que inclui o perfil Professor, **When** o Administrador não
   vincula a conta a um registro de professor, **Then** o sistema impede a conclusão e explica que o
   vínculo é obrigatório quando esse perfil está presente.
3. **Given** um e-mail já utilizado por outro usuário, **When** o Administrador tenta cadastrá-lo
   novamente, **Then** o sistema recusa e informa que o e-mail já está em uso.
4. **Given** um usuário recém-criado, **When** entra pela primeira vez com a senha temporária,
   **Then** é levado obrigatoriamente à troca de senha e não consegue alcançar nenhuma outra tela
   antes de concluí-la.
5. **Given** um usuário na tela de troca obrigatória, **When** informa uma nova senha que não atende
   às regras mínimas de força, **Then** a troca é recusada com a explicação do que falta.
6. **Given** um usuário que concluiu a troca de senha, **When** a confirma, **Then** segue para o
   painel do seu perfil e, em acessos futuros, entra direto com a nova senha.
7. **Given** um usuário sem o perfil Administrador, **When** procura a área de gestão de usuários,
   **Then** ela não aparece no menu e o acesso direto ao seu endereço é negado, inclusive para a
   Secretaria.
8. **Given** um Administrador autenticado, **When** atribui a um mesmo usuário os perfis Coordenação e
   Professor, **Then** o sistema aceita, exige o vínculo com o registro de professor e passa a
   oferecer a alternância de visão àquele usuário.

---

### User Story 3 - Dados restritos ao que cada perfil precisa ver (Priority: P1)

A escola guarda dados pessoais de crianças e adolescentes. Cada perfil enxerga apenas o conjunto de
dados necessário à sua função, e essa restrição vale mesmo quando alguém tenta obter os dados por
fora das telas do sistema — por exemplo, montando uma requisição direta ao armazenamento de dados.

**Why this priority**: Restrição aplicada apenas na interface não é controle de acesso: a aplicação
que roda no navegador é pública e pode ser inspecionada e contornada. Sem esta história, todo o
restante do sistema nasce com exposição indevida de dados de menores.

**Independent Test**: Pode ser testada emitindo requisições diretas ao armazenamento com a
credencial de cada perfil, sem passar pelas telas, e verificando quais registros retornam.

**Acceptance Scenarios**:

1. **Given** a credencial de um usuário Professor, **When** solicita diretamente ao armazenamento a
   lista completa de usuários do sistema, **Then** a solicitação é negada ou retorna apenas o
   próprio registro.
2. **Given** a credencial de um usuário Professor, **When** solicita diretamente dados de alunos de
   turmas às quais não está vinculado, **Then** nenhum desses registros é retornado.
3. **Given** a credencial de um usuário Secretaria, **When** tenta criar um usuário ou alterar o
   perfil de outro usuário por requisição direta, **Then** a operação é recusada; criar contas e
   alterar perfis é exclusivo do Administrador.
4. **Given** a credencial de um usuário Coordenação, **When** solicita dados de alunos e turmas,
   **Then** recebe os registros de toda a escola, em ambos os segmentos, e nenhum dado de gestão de
   contas de usuário.
5. **Given** a credencial de qualquer perfil que não seja Administrador, **When** tenta alterar
   registros do log de auditoria, **Then** a alteração é recusada; o log é somente leitura para todos.
6. **Given** uma requisição sem credencial válida, **When** solicita qualquer dado pessoal, **Then**
   nada é retornado.
7. **Given** um usuário desativado cuja sessão ainda não expirou, **When** faz qualquer solicitação de
   dados, **Then** a solicitação é negada.
8. **Given** um usuário com os perfis Coordenação e Professor, **When** solicita dados com a visão de
   Professor ativa, **Then** ainda assim alcança o que a Coordenação alcança: o alcance de dados é a
   união dos perfis atribuídos, e a visão ativa muda apenas painel e menu, nunca amplia nem reduz
   permissões.

---

### User Story 4 - Recuperar a senha esquecida (Priority: P2)

Um profissional que esqueceu a senha solicita a recuperação informando o e-mail, recebe uma mensagem
com um link temporário, define uma nova senha e volta a entrar normalmente.

**Why this priority**: Alto volume de ocorrência no dia a dia e, sem isso, cada esquecimento vira
trabalho manual da secretaria. Não bloqueia o MVP porque o Administrador pode reemitir senha
temporária enquanto a funcionalidade não existir.

**Independent Test**: Pode ser testada solicitando recuperação para um e-mail cadastrado e para um
não cadastrado, e concluindo a redefinição pelo link recebido.

**Acceptance Scenarios**:

1. **Given** um e-mail de usuário ativo, **When** o usuário solicita recuperação, **Then** recebe uma
   mensagem com link de redefinição válido por tempo limitado.
2. **Given** um e-mail não cadastrado, **When** alguém solicita recuperação, **Then** a tela exibe a
   mesma confirmação genérica do caso anterior e nenhuma mensagem é enviada, para não revelar quais
   e-mails existem.
3. **Given** um link de redefinição válido, **When** o usuário define uma nova senha que atende às
   regras de força, **Then** a senha é alterada e ele consegue entrar com ela.
4. **Given** um link de redefinição já utilizado ou expirado, **When** o usuário o abre, **Then** o
   sistema recusa e oferece solicitar um novo link.
5. **Given** um usuário bloqueado ou desativado, **When** solicita recuperação, **Then** nenhuma
   mensagem é enviada e a tela exibe a mesma confirmação genérica.
6. **Given** uma redefinição concluída, **When** ela é confirmada, **Then** as sessões abertas
   daquele usuário em outros dispositivos deixam de valer.

---

### User Story 5 - Bloquear, desbloquear e desativar contas (Priority: P2)

O Administrador suspende temporariamente o acesso de alguém (afastamento, suspeita de uso indevido),
restabelece esse acesso, ou desativa em definitivo a conta de quem deixou a escola. Nenhum usuário é
apagado, para que o histórico de quem registrou o quê continue íntegro.

**Why this priority**: Necessária para operar com segurança ao longo do ano letivo, mas o MVP
sobrevive brevemente sem ela porque o Administrador pode redefinir a senha como paliativo.

**Independent Test**: Pode ser testada bloqueando um usuário, verificando que ele não entra,
desbloqueando e verificando que volta a entrar.

**Acceptance Scenarios**:

1. **Given** um usuário ativo, **When** o Administrador o bloqueia, **Then** o sistema pede confirmação
   e, ao confirmar, a conta passa a bloqueada e a lista de usuários reflete o novo estado.
2. **Given** um usuário que acaba de ser bloqueado e estava com sessão aberta, **When** faz sua
   próxima ação, **Then** a sessão é encerrada e ele não consegue entrar de novo.
3. **Given** um usuário bloqueado, **When** o Administrador o desbloqueia, **Then** ele volta a entrar
   com a mesma senha de antes.
4. **Given** um usuário desativado, **When** consultado na lista, **Then** continua visível com o
   estado "desativado" e seu histórico de ações permanece íntegro.
5. **Given** o único usuário Administrador ativo do sistema, **When** ele tenta bloquear, desativar ou
   rebaixar a si mesmo, **Then** o sistema recusa e explica que precisa existir ao menos um
   Administrador ativo.
6. **Given** um usuário que errou a senha mais vezes que o limite permitido, **When** tenta de novo
   dentro da janela de contenção, **Then** o acesso é recusado mesmo com a senha correta e ele é
   informado de quando poderá tentar novamente.

---

### User Story 6 - Consultar o histórico de ações administrativas (Priority: P3)

O Administrador consulta quem criou, alterou, bloqueou, desbloqueou ou desativou contas, e quem
mudou perfis, com data e hora. O registro não pode ser editado nem apagado por ninguém.

**Why this priority**: Exigido para responsabilização e para responder a incidentes envolvendo dados
de menores, mas não impede o uso diário do sistema.

**Independent Test**: Pode ser testada executando uma sequência de ações administrativas e conferindo
que cada uma aparece no histórico com autor, alvo, tipo de ação e momento.

**Acceptance Scenarios**:

1. **Given** que o Administrador criou, alterou o perfil, bloqueou e desativou usuários, **When**
   abre o histórico, **Then** vê um registro por ação, com autor, usuário afetado, tipo de ação, valor
   anterior, valor novo e data e hora.
2. **Given** um histórico com muitos registros, **When** o Administrador filtra por usuário afetado ou
   por período, **Then** vê apenas os registros correspondentes.
3. **Given** qualquer usuário, incluindo o Administrador, **When** tenta alterar ou apagar um registro
   do histórico, **Then** a operação é recusada.
4. **Given** um usuário não-Administrador, **When** tenta acessar o histórico, **Then** o acesso é
   negado.

---

### Edge Cases

- **Senha correta em conta bloqueada por tentativas**: o sistema recusa e informa quando será possível
  tentar de novo, sem confirmar que a senha estava certa.
- **Sessão aberta quando os perfis do usuário mudam**: as permissões passam a valer na próxima ação,
  sem necessidade de o usuário sair e entrar de novo.
- **Perfil removido enquanto era a visão ativa**: na ação seguinte o usuário é levado ao painel de
  outro perfil que ainda possui, com aviso da mudança; se não restar nenhum perfil, a sessão é
  encerrada e o acesso passa a ser negado.
- **Usuário com mais de um perfil sem preferência registrada**: entra no painel do perfil de maior
  alcance entre os que possui, sem tela intermediária de escolha.
- **Duas abas abertas, saída em uma delas**: a outra aba, na próxima ação, também encontra a sessão
  encerrada.
- **Queda de conexão durante a troca obrigatória de senha**: ao voltar, o usuário continua em estado
  de primeiro acesso e a troca é exigida de novo; nenhuma senha parcial é aceita.
- **Link de redefinição aberto em outro dispositivo**: funciona, desde que válido e não utilizado.
- **Vários pedidos de recuperação seguidos**: apenas o link mais recente vale; os anteriores deixam de
  valer.
- **Tentativas automatizadas em massa contra a tela de entrada**: contenção por sucessivas falhas se
  aplica por conta e por origem, sem travar permanentemente usuários legítimos.
- **Professor cuja conta perdeu o vínculo com o registro de professor**: entra, mas encontra um painel
  vazio com orientação para procurar a secretaria, em vez de erro.
- **Último Administrador**: o sistema impede ficar sem nenhum Administrador ativo.
- **Endereço interno acessado por quem não tem permissão para aquele perfil**: negado com aviso claro,
  sem revelar o conteúdo da tela.
- **Uso em celular a 320px, com uma mão**: todas as telas desta funcionalidade permanecem operáveis.
- **Relógio do dispositivo adiantado ou atrasado**: a expiração de sessão e de link é decidida pelo
  servidor, não pelo dispositivo.

## Requirements *(mandatory)*

### Functional Requirements

#### Acesso e sessão

- **FR-001**: O sistema MUST autenticar usuários por e-mail e senha.
- **FR-002**: O sistema MUST recusar credenciais inválidas com mensagem genérica, idêntica para
  e-mail inexistente e senha incorreta, sem revelar qual dos dois falhou.
- **FR-003**: O sistema MUST recusar a entrada de usuários bloqueados ou desativados, mesmo com senha
  correta, orientando o usuário a procurar a secretaria.
- **FR-004**: O sistema MUST conter tentativas sucessivas de entrada malsucedidas na mesma conta,
  recusando novas tentativas por uma janela de tempo e informando quando será possível tentar de novo.
- **FR-005**: O sistema MUST encerrar a sessão por inatividade e MUST permitir que o usuário encerre a
  sessão explicitamente a qualquer momento.
- **FR-006**: O sistema MUST impedir o acesso a qualquer tela interna sem sessão válida, levando o
  visitante à tela de entrada e, após a autenticação, ao destino originalmente pretendido quando o
  perfil o permitir.
- **FR-007**: O sistema MUST decidir validade e expiração de sessões e de links com base no tempo do
  servidor, nunca no relógio do dispositivo do usuário.

#### Perfis e roteamento

- **FR-008**: O sistema MUST oferecer exatamente os perfis Administrador, Secretaria, Coordenação e
  Professor, e cada usuário MUST possuir ao menos um deles, podendo possuir mais de um.
- **FR-009**: O sistema MUST determinar as permissões efetivas do usuário pela união dos perfis a ele
  atribuídos.
- **FR-010**: O sistema MUST manter, para cada usuário, uma visão ativa correspondente a um dos seus
  perfis, que define o painel inicial e o menu apresentados.
- **FR-011**: O sistema MUST levar o usuário, após a autenticação, direto ao painel da sua visão
  ativa, sem tela intermediária de escolha; na ausência de preferência registrada, a visão ativa MUST
  ser a do perfil de maior alcance entre os que ele possui.
- **FR-012**: O sistema MUST permitir ao usuário com mais de um perfil alternar a visão ativa sem
  nova autenticação, MUST indicar de forma visível qual visão está ativa e MUST preservar a última
  escolha para os acessos seguintes.
- **FR-013**: A alternância de visão MUST NOT ampliar nem reduzir as permissões efetivas do usuário;
  ela altera apenas painel e menu.
- **FR-014**: O sistema MUST exibir no menu somente as áreas permitidas à visão ativa do usuário.
- **FR-015**: O sistema MUST negar o acesso direto a endereços de áreas não permitidas às permissões
  efetivas do usuário, sem expor o conteúdo da área.
- **FR-016**: O sistema MUST aplicar mudanças de perfis na próxima ação do usuário, sem exigir nova
  entrada; se a visão ativa deixar de existir, o usuário MUST ser levado ao painel de outro perfil que
  ainda possua, com aviso, ou ter a sessão encerrada caso não reste nenhum.

#### Gestão de usuários

- **FR-017**: O sistema MUST permitir exclusivamente ao Administrador cadastrar usuários, informando
  nome, e-mail e ao menos um perfil, e MUST NOT oferecer qualquer forma de auto-cadastro.
- **FR-018**: O sistema MUST exigir vínculo com um registro de professor sempre que o perfil Professor
  estiver entre os atribuídos ao usuário, e MUST recusar a conclusão do cadastro sem esse vínculo.
- **FR-019**: O sistema MUST recusar o cadastro de e-mail já utilizado por outro usuário.
- **FR-020**: O sistema MUST permitir exclusivamente ao Administrador atribuir, remover e alterar
  perfis e permissões de usuários; nenhum outro perfil, inclusive a Secretaria, pode criar contas nem
  alterar perfis, seja pela interface, seja por requisição direta ao armazenamento.
- **FR-021**: O sistema MUST permitir ao Administrador bloquear, desbloquear e desativar usuários.
- **FR-022**: O sistema MUST NOT excluir usuários de forma definitiva; a saída de um usuário MUST ser
  representada por desativação, preservando seu histórico de ações.
- **FR-023**: O sistema MUST impedir que a última conta ativa que possui o perfil Administrador seja
  bloqueada, desativada ou tenha esse perfil removido.
- **FR-024**: O sistema MUST exibir, após cada criação, alteração ou desativação, uma confirmação e a
  lista atualizada de usuários.
- **FR-025**: O sistema MUST permitir localizar usuários na lista por nome, e-mail, perfil e situação,
  de modo utilizável quando houver dezenas de contas.

#### Senha

- **FR-026**: O sistema MUST criar usuários em estado de primeiro acesso, com senha temporária.
- **FR-027**: O sistema MUST exigir a troca da senha no primeiro acesso e MUST impedir a navegação
  para qualquer outra tela enquanto a troca não for concluída.
- **FR-028**: O sistema MUST recusar senhas que não atendam às regras mínimas de força e MUST explicar
  o que falta.
- **FR-029**: Usuários MUST ser capazes de solicitar recuperação de senha informando o e-mail,
  recebendo um link temporário e de uso único.
- **FR-030**: O sistema MUST exibir a mesma confirmação genérica em qualquer pedido de recuperação,
  independentemente de o e-mail existir, estar bloqueado ou desativado.
- **FR-031**: O sistema MUST invalidar links de redefinição anteriores quando um novo é emitido, e MUST
  invalidar o link após o uso ou o vencimento do prazo.
- **FR-032**: O sistema MUST encerrar as demais sessões abertas do usuário após uma redefinição de
  senha concluída.
- **FR-033**: O sistema MUST NOT exibir, registrar ou transmitir senhas em texto legível em nenhum
  ponto, inclusive em mensagens de erro e registros de auditoria.

#### Proteção dos dados

- **FR-034**: O sistema MUST aplicar as restrições de acesso no armazenamento de dados, de modo que
  requisições que contornem a interface sejam igualmente negadas.
- **FR-035**: O sistema MUST restringir a leitura de dados pessoais ao mínimo necessário à função de
  cada perfil, considerando a união dos perfis atribuídos ao usuário.
- **FR-036**: O sistema MUST restringir o Professor aos dados dos alunos e turmas aos quais está
  vinculado.
- **FR-037**: O sistema MUST conceder à Coordenação a leitura de alunos e turmas de toda a escola, em
  ambos os segmentos, sem acesso à gestão de contas de usuário nem ao histórico de auditoria.
- **FR-038**: O sistema MUST negar qualquer requisição de dados feita sem credencial válida ou com
  credencial de usuário bloqueado ou desativado.
- **FR-039**: O sistema MUST NOT embutir na aplicação distribuída aos usuários qualquer credencial que
  conceda acesso além do que o próprio usuário autenticado já possui.

#### Auditoria

- **FR-040**: O sistema MUST registrar criação de usuário, alteração de perfil, bloqueio, desbloqueio,
  desativação e redefinição administrativa de senha, com autor, usuário afetado, tipo de ação, valor
  anterior, valor novo e data e hora.
- **FR-041**: O sistema MUST tornar o histórico de auditoria imutável: nenhum perfil pode alterá-lo ou
  apagá-lo.
- **FR-042**: O sistema MUST restringir a consulta ao histórico de auditoria ao perfil Administrador e
  MUST permitir filtrar por usuário afetado e por período.

#### Acessibilidade e uso

- **FR-043**: Todas as telas desta funcionalidade MUST ser operáveis em telas de 320px de largura, sem
  rolagem horizontal da página.
- **FR-044**: Todas as telas desta funcionalidade MUST ser inteiramente operáveis por teclado, com
  foco visível e ordem de foco coerente com a ordem visual.
- **FR-045**: Todos os links e controles MUST possuir rótulo acessível, todas as imagens MUST possuir
  texto alternativo e o contraste MUST atender ao nível AA das diretrizes de acessibilidade.
- **FR-046**: Erros de formulário MUST ser anunciados a leitores de tela e associados ao campo
  correspondente.
- **FR-047**: O sistema MUST informar o andamento de operações demoradas (entrada, envio de
  recuperação, salvamento) e MUST impedir envio duplicado por acionamento repetido.
- **FR-048**: Toda a interface desta funcionalidade MUST ser apresentada em português do Brasil.

### Key Entities

- **Usuário**: pessoa autorizada a acessar o sistema. Atributos: nome, e-mail (único), situação
  (ativo, bloqueado, desativado), indicador de primeiro acesso, visão ativa preferida, momento do
  último acesso. Nunca é removido, apenas desativado.
- **Perfil**: papel que determina o painel inicial, o menu e o alcance de leitura e escrita.
  Valores: Administrador, Secretaria, Coordenação, Professor.
- **Atribuição de Perfil**: ligação entre um usuário e um perfil. Um usuário possui de um a quatro
  perfis; suas permissões efetivas são a união dos perfis atribuídos. Somente o Administrador cria e
  remove atribuições.
- **Visão Ativa**: perfil atualmente selecionado pelo usuário entre os que possui. Define painel e
  menu, nunca as permissões. Persiste entre acessos; na ausência de escolha, assume o perfil de maior
  alcance entre os atribuídos.
- **Vínculo Usuário–Professor**: ligação obrigatória entre uma conta que possui o perfil Professor e o
  registro do professor na escola; é o que delimita quais turmas e alunos aquela conta alcança.
- **Sessão**: período de acesso autenticado, com início, momento da última atividade e término por
  saída explícita, inatividade, bloqueio, desativação ou redefinição de senha.
- **Pedido de Redefinição de Senha**: solicitação de uso único, com prazo de validade, vinculada a um
  usuário; é invalidada por uso, por vencimento ou pela emissão de um pedido mais recente.
- **Registro de Auditoria**: anotação imutável de uma ação administrativa, contendo autor, usuário
  afetado, tipo de ação, valor anterior, valor novo e data e hora.
- **Tentativa de Acesso**: ocorrência de entrada malsucedida, usada para a contenção por tentativas
  sucessivas; guarda a conta alvo, a origem e o momento.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Um usuário que sabe suas credenciais conclui a entrada e chega ao painel do seu perfil
  em menos de 15 segundos, em celular e em rede móvel comum.
- **SC-002**: 100% dos usuários de primeiro acesso concluem a troca obrigatória de senha sem apoio da
  secretaria, em até 3 minutos.
- **SC-003**: 100% das tentativas de acesso a dados por perfil não autorizado são negadas, incluindo
  as feitas por requisição direta ao armazenamento, sem passar pelas telas do sistema.
- **SC-004**: Nenhuma resposta do sistema permite distinguir e-mail cadastrado de não cadastrado, nem
  pelo texto exibido nem por diferença perceptível de tempo de resposta.
- **SC-005**: 100% das ações administrativas sobre contas aparecem no histórico de auditoria com autor
  e momento, e nenhuma tentativa de alterar esse histórico é bem-sucedida.
- **SC-006**: 100% das telas desta funcionalidade permanecem utilizáveis a 320px de largura, sem
  rolagem horizontal, e navegáveis apenas por teclado.
- **SC-007**: Uma verificação automatizada de acessibilidade nas telas desta funcionalidade não aponta
  falhas de contraste, de rótulo acessível ou de texto alternativo.
- **SC-008**: Um usuário que esqueceu a senha volta a acessar o sistema sozinho em até 5 minutos, sem
  abrir chamado com a secretaria.
- **SC-009**: Após a desativação ou o bloqueio de uma conta, nenhuma ação daquele usuário é aceita a
  partir da sua solicitação seguinte.
- **SC-010**: 100% dos usuários chegam, após autenticar-se, ao painel correspondente à sua visão
  ativa, sem passar por tela intermediária de escolha, inclusive quem possui mais de um perfil.
- **SC-011**: Um usuário com mais de um perfil alterna entre suas visões em até 2 toques ou cliques, a
  partir de qualquer tela interna, sem precisar autenticar-se de novo.

## Assumptions

- **Perfis**: um usuário possui um ou mais perfis, porque na escola há quem acumule funções — por
  exemplo, coordenar e também dar aula. As permissões efetivas são a união dos perfis atribuídos; a
  visão ativa altera apenas painel e menu. Ordem de alcance, da maior para a menor, usada para
  escolher a visão inicial na ausência de preferência: Administrador, Secretaria, Coordenação,
  Professor.
- **Criação de contas**: exclusiva do Administrador. A Secretaria não cria contas nem altera perfis
  nesta etapa; se o gargalo se mostrar relevante na operação, isso será reavaliado em funcionalidade
  posterior.
- **Alcance da Coordenação**: enxerga alunos e turmas de toda a escola, nos dois segmentos. Não há
  vínculo de coordenador a segmento nesta etapa.
- **Sessão**: expiração por inatividade de 30 minutos e duração máxima absoluta de 12 horas, adequadas
  a dispositivos frequentemente compartilhados dentro da escola.
- **Contenção por tentativas**: 5 tentativas malsucedidas na mesma conta acionam uma janela de espera
  de 15 minutos.
- **Força de senha**: mínimo de 8 caracteres, com verificação contra senhas notoriamente comuns; não
  se exige troca periódica obrigatória.
- **Validade do link de redefinição**: 1 hora, de uso único.
- **Senha temporária**: entregue ao novo usuário por mensagem no e-mail cadastrado, com validade
  limitada; o Administrador pode reemiti-la.
- **Envio de e-mail**: a escola dispõe de um meio confiável de envio de mensagens; entrega em caixa de
  spam é tratada como orientação de suporte, não como requisito do sistema.
- **Painéis iniciais**: esta funcionalidade entrega apenas o roteamento correto e um painel mínimo por
  perfil. O conteúdo real de cada painel pertence às funcionalidades seguintes.
- **Cadastro de professores, turmas e alunos**: não faz parte desta funcionalidade. Para os testes,
  assume-se um pequeno conjunto de registros de professor previamente disponível, necessário apenas
  para exercitar o vínculo obrigatório do perfil Professor.
- **Acesso de responsáveis e alunos**: fora do escopo. Somente profissionais da escola acessam o
  sistema nesta etapa.
- **Autenticação por segundo fator e entrada por conta institucional externa**: fora do escopo desta
  etapa.
- **Escala**: dezenas de usuários e algumas centenas de alunos; não há requisito de alta concorrência.
- **Idioma**: português do Brasil, sem previsão de outros idiomas.
- **Privacidade**: por envolver dados de crianças e adolescentes, vale o princípio da minimização —
  cada perfil enxerga apenas o necessário à sua função; a definição de retenção e de descarte de dados
  será tratada em funcionalidade própria.
- **Restrições de tecnologia e qualidade**: valem as definidas na constituição do projeto
  (`.specify/memory/constitution.md`, v1.0.0), incluindo camada de dados substituível, ausência de
  segredos na aplicação distribuída, publicação como conteúdo estático e cobertura por testes
  automatizados.

## Dependencies

- Registro de professores disponível para o vínculo obrigatório do perfil Professor (mínimo necessário
  para esta funcionalidade; o cadastro completo pertence à funcionalidade de cadastros base).
- Meio de envio de mensagens por e-mail para senha temporária e recuperação de senha.
- Definição de cores, tipografia e espaçamento em `docs/design-system.md` (v1.0.0), já disponível.
