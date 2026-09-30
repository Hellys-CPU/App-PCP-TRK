# TRK PCP 2026 — Total Express

Sistema de PCP (Planejamento e Controle de Produção) logístico do hub **TZX**. Usado pela Torre de Controle, Doca, Fiscalização de Pátio, Operação CAF, Liderança e pelo cliente Amazon (login externo).

> **Versão atual: v355** · App single-file (HTML + CSS + JS) · sem build, sem framework · funciona em PC, tablet e celular (PWA instalável).

---

## Sumário

1. [Sobre](#-sobre)
2. [Stack](#️-stack)
3. [Arquivos do repositório](#-arquivos-do-repositório)
4. [Como o código está organizado](#-como-o-código-está-organizado)
5. [Perfis e abas](#-perfis-e-abas)
6. [Módulos](#-módulos)
7. [Alertas e avisos](#-alertas-e-avisos)
8. [Indicadores (como são calculados)](#-indicadores-como-são-calculados)
9. [Banco de dados](#️-banco-de-dados)
10. [Dois bancos Supabase (contingência de egress)](#️-dois-bancos-supabase-contingência-de-egress)
11. [Consumo de egress](#-consumo-de-egress)
12. [Deploy](#-deploy)
13. [Regras de negócio](#-regras-de-negócio)
14. [Pontos de atenção](#️-pontos-de-atenção)
15. [Changelog](#-changelog)

---

## 📌 Sobre

O TRK PCP substituiu uma planilha Excel de FUP manual. Hoje rastreia em tempo real:

- **Viagens** (operações), da programação até a descarga no FC;
- **CAFs**: produção, auditoria, vínculo com rua física do pátio e com a viagem;
- **Docas e pátio**: quem está encostado, fila de entrada, previsão de lotação;
- **Retorno de pallets e insumos** do HUB;
- **Indicadores**: SLA, On Time, tempo de descarga, nota das transportadoras, relatórios em PDF/Excel/PowerPoint.

Roda 100% no navegador. Não existe backend próprio além do Supabase e de duas funções pequenas na Cloudflare.

---

## 🏗️ Stack

| Camada | Tecnologia |
|---|---|
| Frontend | HTML + CSS + JavaScript puro, num único `index.html` · PWA com Service Worker mínimo |
| Banco | [Supabase](https://supabase.com) (PostgreSQL + PostgREST + RLS) |
| Tempo real | [Ably](https://ably.com): sincronização entre aparelhos, presença online, aviso de troca de banco |
| Hospedagem | Cloudflare Pages (deploy automático no push da `main`) |
| Funções servidor | Cloudflare Pages Functions: `/api/config` (qual banco está ativo) e `/api/assistente` (Aurora, IA) |
| IA (opcional) | Google Gemini via `/api/assistente`; a chave fica só no servidor |
| Autenticação | Própria: tabelas `usuarios` + `auth_tokens`, senha com bcrypt (`pgcrypto`); não usa Supabase Auth |
| Bibliotecas via CDN | `pptxgenjs` (exportar RD em PowerPoint), `html2canvas` (imagem do Painel de Descarga para WhatsApp) |

---

## 📁 Arquivos do repositório

| Arquivo | O que é |
|---|---|
| `index.html` | O app inteiro (HTML, CSS e JS) |
| `sw.js` | Service Worker: só permite "Instalar app" e abre o esqueleto sem internet. **Sempre busca da rede primeiro**, sem cache de dados |
| `manifest.json` | Manifesto do PWA (nome, cores, ícones) |
| `icon-192.png`, `icon-512.png`, `apple-touch-icon.png` | Ícones do app |
| `functions/api/config.js` | `GET` devolve o projeto Supabase ativo (`A`/`B`); `POST` troca (exige senha) |
| `functions/api/assistente.js` | Ponte com o Gemini para a assistente Aurora (só responde com o que o app manda; nunca grava no banco) |

---

## 🧭 Como o código está organizado

- O `<script>` principal começa com um **MAPA DO CÓDIGO**, que lista as seções na ordem em que aparecem. Busque pelo título da seção.
- **Toda função tem um comentário** de uma linha dizendo o que faz.
- O conteúdo das abas é trocado por `setView(nome)`, e `render()` redesenha a aba atual.
- Dados principais em memória:
  - `ops`: viagens dos últimos ~90 dias;
  - `cafsDB`: CAFs;
  - `CFG`: configurações do Admin.
- As funções novas de análise, alertas e previsão **usam só o que já está em memória**. Não fazem consulta extra ao banco.

---

## 👤 Perfis e abas

| Perfil | Abas | Observação |
|---|---|---|
| `admin` | Todas | Acesso total |
| `supervisor` | Todas | Não exporta RD em PowerPoint nem faz crédito/débito de insumos por padrão |
| `torre_controle` | Painel, Lista, Gestão de Doca, Em Massa, FUP FC, FUP Amazon, CAFs, Pallets, Veículos, Análise, Report PCP, Painel de Descarga, TV, TV Yard | Opera viagens |
| `doca` | Painel, Lista, Gestão de Doca, Pallets, Painel de Descarga, TV, TV Yard | **Login compartilhado.** Só atrela doca e faz auditoria de pallets |
| `fiscal_patio` | Painel, Lista, Gestão de Doca | **Login compartilhado.** Só atrela doca |
| `operador_caf` | Painel, Lista, CAFs | **Login compartilhado.** Cria/edita CAF e rua; no tablet vê as CAFs em cartões |
| `visualizador` | Painel, Lista, FUP FC, FUP Amazon, CAFs, Análise, Painel de Descarga, TV, TV Yard | Somente leitura |
| `lideranca` | Painel, Insumos, Report PCP, Painel de Descarga, TV, TV Yard | Checklist de turno, insumos, esteiras |
| `tv_publica` | TV, TV Yard | Monitor fixo: alterna as duas telas sozinho (modo kiosk) |
| `cliente_amazon` | FUP Amazon | Login externo: vê só os FCs liberados e preenche justificativa de atraso de descarga |

- **Login compartilhado** (`operador_caf`, `doca`, `fiscal_patio`): no início do turno a pessoa escolhe um dos **4 tablets físicos** (disponibilidade em tempo real, compartilhada entre os três perfis) e informa o nome. Um tablet pode ser marcado como quebrado no painel de Insumos.
- **Permissões finas** por ação (criar CAF, editar viagem, exportar, usar a Aurora etc.) ficam em `permissoes_custom` (JSONB por usuário) e sobrepõem o padrão do perfil. A Aurora vem **desligada** para todos os perfis e é liberada usuário a usuário.

---

## 🧩 Módulos

### Operação do dia

- **Painel (kanban)**
  - O cartão "esquenta" conforme o tempo parado no status.
  - O cartão desliza ao mudar de coluna.
  - Em trânsito, mostra a **previsão de chegada no FC**.
  - Selo **"sem motivo"** em viagem atrasada sem justificativa.
  - No topo, a faixa **"Conferir dados"** mostra viagens esquecidas e placas repetidas.
- **Lista**: todas as viagens com filtros, SLA e OT por linha.
- **Modal da viagem**
  - Linha do tempo plano × real e formulário completo.
  - **Checagem antes da saída**: ao virar "Em Trânsito", lista o que falta (motorista, placa, carreta, saída real, CAF sem pallets ou ainda em produção).
  - **Motivo de atraso**: o campo aparece quando o atraso passa de 30min.
  - **Sugestão de horário** de apresentação e saída pelo tempo real da rota.
- **Gestão de Doca**
  - **Planta do pátio**: docas desenhadas e fila de entrada; arraste ou toque para encostar.
  - **Previsão de docas lotadas** por hora do dia.
  - Ocupação de piso.
- **Programação em Massa**: cria várias viagens de uma vez. O botão **"Ajustar pelo tempo real da rota"** recalcula os horários.
  - **Distribuir motoristas**: cola a lista das transportadoras (Notion, WhatsApp ou Excel) e o app preenche a tabela.
    - Confere quem ainda está aguardando descarga ou em trânsito e calcula quando ele fica livre de verdade: espera que ainda falta pelo histórico do FC + volta até a TZX (os 10% mais rápidos do histórico; padrão de 4h30).
    - Respeita as rotas marcadas para cada transportadora (configuração `transp_rotas`, compartilhada).
    - Também preenche viagens **já criadas** do dia sem motorista (botão "Distribuir em viagens já criadas" no Passo 1). Essas são gravadas ao aplicar, com confirmação e registro no histórico.
    - Opção de dividir entre as transportadoras na proporção de motoristas enviados.
    - Linhas da tabela só gravam no "✅ Gerar". O CPF só serve para conferir duplicados e não é guardado.
- **CAFs**
  - No PC, tabela.
  - No tablet, cartões com botão de próximo status.
  - Ciclo: Em Produção → Produzida → Em Auditoria GRIS → Vinculada a Veículo → Processo de Entrega → Entrega Realizada.
  - Para virar **Produzida**, pallets e volume são obrigatórios e maiores que zero.
- **Painel de Descarga**: fila aguardando descarga com cronômetro ao vivo, filtro por FC e imagem para mandar no WhatsApp.
- **FUP FC / FUP Amazon**: acompanhamento por FC. O FUP Amazon tem justificativas de atraso de descarga.

### Apoio

- **Retorno de Pallets**: retorno das FCs, saldo devedor por FC e estoque da TZX.
- **Insumos HUB**: catálogo, movimentações, checklist de passagem de turno e controle de tablets.
- **Veículos**: cadastro com medidas e capacidade de pallets (PBR).
- **Report PCP**
  - CAFs prontas/produzindo e expedição por FC.
  - Backlog manual do turno, preenchido por horário.
  - Imprime/gera PDF.

### Análise e relatórios

- **Análise**, organizada em um resumo fixo mais seções:
  - **Visão Geral**: comparativo semanal e **"Comparar dois períodos"** (A × B com a diferença).
  - **Pontualidade**:
    - SLA por etapa;
    - OT;
    - Pareto de atrasos;
    - mapa dia × horário dos atrasos;
    - **"Meta de SLA por rota — mês atual"**, mostrando quantas viagens seguidas no prazo faltam.
  - **Descarga & Doca**: tempos de espera e de descarga, mapa das docas.
  - **CAFs**: consolidação e tempo por status.
  - **Operação & Frota**:
    - **Nota das transportadoras (0–100)**;
    - **Transportadoras × Rotas** (quem mais atua), com **veículos únicos** por transportadora (cavalo + carreta = 1), % da frota, viagens por veículo e placas que já rodaram por mais de uma transportadora;
    - uso do app pelos motoristas.
  - **Monte sua Análise**: filtros livres.
- **Ficha da transportadora / do motorista**
  - Abre ao clicar no nome (Lista, FUP FC, Análise, modal da viagem).
  - Mostra a nota dos últimos 30 dias.
  - Transportadora: **veículos que já atuaram** (placas únicas, cavalo + carreta = 1), com aviso nas que também rodaram por outra transportadora.
  - Botão **"Relatório da semana (PDF)"**.
- **Exportações**:
  - CSV/backup;
  - Extração Completa em Excel;
  - tempo por status da CAF;
  - **RD em PowerPoint**.

### Telas de parede

- **TV**: **torre de controle** com painéis que se revezam e piscam em alerta, grid de ruas e ciclo automático.
- **TV Yard**: visão do pátio.

### Administração

- **Admin**:
  - usuários e permissões;
  - configurações (alertas, limite de atraso, meta de SLA geral e por rota, docas, piso);
  - monitoramento dos dois bancos (detecta split-brain);
  - sessões ativas;
  - histórico de turnos, com botão para desconectar uma sessão presa.
- **Aurora (IA)**, opcional e por permissão:
  - responde perguntas com os dados já carregados na tela;
  - sugere criação de viagens com prévia. Quem confirma e salva é o usuário.
- **Busca global** (`Ctrl+K`) e **duplicar dia**.

---

## 🔔 Alertas e avisos

| Alerta | Onde aparece | Regra |
|---|---|---|
| Saída passou do horário | Toast + bipe (se "Alertas de Atraso" ligado) | Viagem de hoje ainda não saiu, até 2h após a saída planejada |
| Viagem esquecida | Faixa "Conferir dados" (Painel) | Em trânsito 6h+ depois da chegada prevista (ou 18h+ após a saída), ou programada/carregando em dia que já passou |
| Placa repetida | Faixa "Conferir dados" | Mesma placa em mais de uma viagem ativa |
| Atraso sem motivo | Selo no cartão + lembrete ao salvar | Atraso acima de 30min sem motivo preenchido |
| Pendências de saída | Confirmação ao marcar "Em Trânsito" | Falta motorista, placa, carreta, saída real ou CAF pronta |
| CAFs vencendo / sem baixa | Toast | CAFs que vencem em até 3 dias; CAFs sem baixa |
| **Aviso do navegador** | Notificação do sistema (botão 🔕/🔔 na conta) | Com a aba em **segundo plano**: descarga parada há 4h+, chegada no FC prevista com 30min+ de atraso, saída 30min+ atrasada |

Como funciona o aviso do navegador:

- É opcional e ligado por aparelho.
- Cada alerta é avisado uma única vez, com no máximo 3 por minuto; se houver mais, chega um resumo.
- Tocar no aviso abre a viagem.
- A aba do app precisa estar aberta, mesmo que em segundo plano.
- No iPhone só funciona com o app instalado na tela inicial.

---

## 📐 Indicadores (como são calculados)

- **SLA geral** = chegada no FC **50%** + saída **25%** + apresentação **25%**.
  - Meta padrão: **92%**.
  - Metas por rota são configuradas no Admin.
- **Previsão de chegada (ETA)**:
  - saída real + **mediana do tempo real da rota** nos últimos ~90 dias;
  - com menos de 3 viagens na rota, usa o tempo planejado.
- **Sugestão de horário**: parte da chegada planejada no FC e volta pelo tempo real da rota e pelo tempo típico de carregamento.
- **Nota da transportadora (0–100)**:
  - Pesos: SLA **40** · On Time **25** · uso do app **15** · viagens sem ocorrência **10** · atraso médio **10**.
  - Se uma parte não tem dado, as outras são reescaladas.
  - Período: últimos 30 dias, comparados com os 30 anteriores.

---

## 🗃️ Banco de dados

Tabelas principais:

| Grupo | Tabelas |
|---|---|
| Acesso e sessões | `usuarios`, `auth_tokens`, `login_tentativas`, `sessoes`, `sessoes_turno`, `auditoria`, `configuracoes` |
| Operação | `ruas`, `cafs`, `operacoes`, `veiculos_cadastro`, `esteiras_colaborador` |
| Pallets | `retornos_pallets`, `inventario_pallets` |
| Insumos e turno | `insumos_hub`, `insumos_movimentacoes`, `checklist_turno` |

- **Regras sensíveis** ficam em functions `SECURITY DEFINER`, chamadas por RPC. Exemplos: `fazer_login`, `gerenciar_turno`, `validar_permissao`, `gerenciar_usuario_v2`, `status_tablets`, `admin_encerrar_turno`.
- **RLS ativo** em todas as tabelas. `usuarios`, `auth_tokens`, `login_tentativas` e `sessoes_turno` não têm policy pública; só são acessadas via RPC.
- **Auditoria automática** por trigger (`fn_auditoria`) em `cafs`, `operacoes` e `usuarios`. Grava só o que mudou.
- **IDs gerados no navegador** usam timestamp + sufixo aleatório, o que evita colisão entre aparelhos.

---

## 🗄️ Dois bancos Supabase (contingência de egress)

O app conhece dois projetos Supabase, **A** e **B**, definidos em `PROJETOS_SUPABASE` no `index.html`. Se um se aproximar da cota de egress, o admin troca para o outro sem editar código.

1. No boot, o app chama `GET /api/config`, que lê a chave `activeProject` do KV da Cloudflare (binding `CONFIG_KV`, namespace `trk_config`). Se a rota falhar ou o KV estiver vazio, usa o **Projeto A**; o boot nunca trava.
2. O admin troca pelo botão "Trocar Projeto Supabase Ativo" (protegido por senha). A troca grava no KV e publica `db_switch` no Ably, e **todos os aparelhos recarregam**.
3. O loop de sincronização também confere a config. Se a aba perdeu o evento do Ably, ela mesma recarrega.
4. **Antes de trocar, restaure um backup atualizado no projeto de destino.** Os bancos não se sincronizam sozinhos.

> ⚠️ A cota de egress é por **organização** Supabase. Os dois projetos precisam estar em organizações diferentes para a contingência valer.

---

## 📶 Consumo de egress

- **Primeiro carregamento**: viagens dos últimos ~90 dias, em páginas de 1000, **sem o histórico** (`hist`).
- **Depois**: só o que mudou (`updated_at` maior que o último sync), a cada ~45s. O tempo real principal é o Ably, que não gasta egress do Supabase.
- **Painel de Descarga, FUP Amazon, alertas, previsões, notas, comparações e avisos do navegador** usam os dados já em memória, sem consulta extra.
- **Histórico (`hist`) de uma viagem** só é baixado quando é preciso: ao abrir ou alterar aquela viagem, ou na Extração Completa (em lotes).

---

## 🚀 Deploy

1. Commit na branch `main`. A Cloudflare Pages publica sozinha.
2. **Confira o número da versão** no badge vermelho ao lado do título. Se não bateu, o deploy não pegou (cache, erro de commit etc.). O app também confere a versão publicada a cada 3 minutos e avisa quem está com a versão antiga.
3. Toda migration SQL deve rodar **nos dois projetos (A e B)**.
4. Configuração na Cloudflare Pages (Settings → Functions / Environment variables):

| Nome | Tipo | Para quê |
|---|---|---|
| `CONFIG_KV` | KV binding (namespace `trk_config`) | Guardar o projeto Supabase ativo |
| `GEMINI_API_KEY` | Variável de ambiente (secreta) | Aurora (IA). Sem ela, só a Aurora deixa de funcionar |

**Rodar localmente:** sirva a pasta com qualquer servidor estático (ex.: `npx serve .`). Sem as Pages Functions, `/api/config` falha e o app usa o Projeto A; a Aurora não responde.

---

## 📏 Regras de negócio

- **Consolidação de CAF**: todos os ID Clients de uma CAF têm a mesma data de promessa. Isso é validado antes, na cubadora; o TRK PCP recebe as CAFs já formadas.
- **Fluxo de rede**:
  - Regra geral: coletas em São Paulo → matriz (transbordo) → TZX.
  - Exceção: a coleta SAO vai direto para a TZX, mas passa pela mesma auditoria completa/parcial.
- **Rotas**:
  - `TZX_FC` = ida (tem CAF);
  - `FC_TZX` = retorno de pallets/insumos (sem CAF).
- **Liberação automática de rua**: quando a viagem vira "Em Trânsito" (`TRAN`), a rua da CAF vinculada é liberada e a CAF passa para "Processo de Entrega".
- **Uma aba por vez**: o app bloqueia uso simultâneo em duas abas do mesmo navegador. Dá para forçar, com confirmação.

---

## ⚠️ Pontos de atenção

- `functions/api/config.js` tem a **senha de troca de banco escrita no código**. O ideal é movê-la para uma variável de ambiente da Cloudflare.
- A **chave do Ably** está no `index.html`, visível para qualquer um que abra o app. O ideal é usar token auth do Ably (chave só no servidor) ou uma chave restrita a publicar/assinar nos canais do app.

---

## 📝 Changelog

O histórico completo fica **dentro do app**: clique no badge da versão, no topo. No código, é o objeto `CHANGELOG` junto de `APP_VERSION` no `index.html`. Este README não duplica o histórico.

Últimas versões:

- **v355**: veículos únicos por transportadora (Análise + ficha) e CAF Produzida exige pallets e volume.
- **v354**: Distribuir motoristas em viagens já criadas + divisão proporcional entre transportadoras.
- **v353**: leitor da lista de motoristas aceita mais formatos (WhatsApp, tudo numa linha, rótulo sem ":" etc.).
- **v352**: Distribuir motoristas na Programação em Massa, com rotas por transportadora.
- **v351**
  - checagem antes da saída;
  - motivo de atraso;
  - faixa "Conferir dados";
  - nota da transportadora + relatório semanal em PDF;
  - meta de SLA por rota no mês;
  - comparar dois períodos;
  - sugestão de horário;
  - previsão de docas lotadas;
  - avisos do navegador.
- **v350**: quadro Transportadoras × Rotas.
- **v349**:
  - linha do tempo da viagem;
  - cartão que esquenta;
  - previsão de chegada;
  - planta do pátio;
  - CAFs no tablet;
  - ficha da transportadora/motorista;
  - mapa dia × horário;
  - TV torre de controle.
