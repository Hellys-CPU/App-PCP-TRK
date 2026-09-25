# TRK PCP 2026 — Total Express

Sistema de gestão de PCP (Planejamento e Controle de Produção) logística do hub **TZX**, usado pelo time de Torre de Controle, Doca, Fiscalização de Pátio, Operação CAF e Liderança.

> **Versão atual: v349** · Aplicativo single-file (HTML/CSS/JS), sem build step, sem framework.
>
> **Onde está cada coisa:** o `<script>` principal do `index.html` começa com um **MAPA DO CÓDIGO** listando as seções na ordem em que aparecem; cada função tem um comentário curto explicando o que faz.

---

## 📌 Sobre o projeto

O TRK PCP nasceu em junho/2026 pra substituir uma planilha Excel de FUP manual. Hoje é um sistema completo de PCP em tempo real: rastreia viagens (operações) desde a programação até a finalização, controla a produção e vinculação de CAFs em ruas físicas do pátio, gestão de docas, retorno de pallets/insumos, e gera relatórios e indicadores de operação.

Roda 100% no navegador — não tem backend próprio além do Supabase (Postgres + PostgREST). Um único arquivo `index.html` concentra HTML, CSS e JavaScript.

---

## 🏗️ Stack técnica

| Camada | Tecnologia |
|---|---|
| Frontend | HTML + CSS + JavaScript puro (sem framework, sem bundler) — PWA com Service Worker |
| Backend / banco | [Supabase](https://supabase.com) (PostgreSQL + PostgREST + RLS) |
| Hospedagem | Cloudflare Pages (deploy automático via push na branch `main`) |
| Tempo real | [Ably](https://ably.com) — presença, sincronização entre dispositivos, sinalização de troca de banco |
| Autenticação | Própria (não usa Supabase Auth) — tabela `usuarios` + `auth_tokens`, senha com bcrypt via `pgcrypto` |
| Config dinâmica | Cloudflare Pages Function (`functions/api/config.js`) + Cloudflare KV — controla qual projeto Supabase está ativo |

---

## 🗄️ Arquitetura: dois bancos Supabase (contingência de egress)

O sistema aponta pra **dois projetos Supabase diferentes** (`Projeto A` e `Projeto B`), configurados em `PROJETOS_SUPABASE` no `index.html`. Isso existe porque o plano Free da Supabase tem cota de egress (5 GB/ciclo, por **organização**) — se o Projeto A se aproximar do limite, um admin troca pro B em segundos, sem precisar editar código nem redeployar.

**Como funciona:**
1. O app consulta `/api/config` (Cloudflare Pages Function) no boot, que lê a chave `projeto_ativo` de um namespace do Cloudflare KV (`trk_config`).
2. O Admin troca o projeto ativo por um botão protegido por senha — grava no KV e publica um evento `db_switch` via Ably, que recarrega a página em **todos** os dispositivos conectados na hora.
3. Uma checagem de segurança roda dentro do próprio loop de sync (a cada 45–180s): se detectar que a config remota mudou mas a aba não recarregou, força o reload sozinha — protege contra dispositivos que perderam o evento do Ably.
4. **Antes de trocar de projeto**, é responsabilidade de quem troca restaurar um backup atualizado no projeto de destino — o sistema não sincroniza os dois bancos automaticamente, só aponta o app pra outro lugar.

> ⚠️ Egress é medido por **organização**, não por projeto — os dois bancos "de contingência" precisam estar em organizações Supabase diferentes pra esse esquema fazer sentido de verdade (resetar a cota).

---

## 👤 Perfis de usuário

| Perfil | Acesso |
|---|---|
| `admin` | Acesso total |
| `supervisor` | Quase total (sem trocar projeto Supabase) |
| `torre_controle` | Opera viagens e CAFs |
| `doca` | **Login compartilhado** — Painel, Lista, Gestão de Doca; só pode atrelar doca (viagem travada pro resto) |
| `fiscal_patio` | **Login compartilhado** — igual `doca`, focado em fiscalização de pátio |
| `operador_caf` | **Login compartilhado** — cria/edita CAFs, escolhe tablet no início do turno |
| `visualizador` | Somente leitura |
| `lideranca` | Checklist de turno, Insumos HUB, esteiras |
| `tv_publica` | Login fixo de monitor — alterna TV/TV Yard sozinho, kiosk mode |

Perfis com login compartilhado (`operador_caf`, `doca`, `fiscal_patio`) passam por um modal de **início de turno**: escolhem um dos **4 tablets físicos** disponíveis (compartilhados entre os três perfis, com disponibilidade em tempo real) e informam o nome de quem está operando. Um tablet pode ser marcado como quebrado/indisponível pelo painel de Insumos.

Permissões finas (por ação: criar CAF, editar viagem, exportar, etc.) ficam em `permissoes_custom` (JSONB por usuário), sobrepondo os padrões do perfil.

---

## 🧩 Módulos principais

- **Painel / Lista** — visão geral e lista completa de viagens (operações); no Painel o cartão "esquenta" com o tempo parado no status, desliza ao mudar de coluna e mostra a previsão de chegada no FC para quem está em trânsito
- **Gestão de Doca** — planta do pátio (docas + fila de entrada, arrastar/tocar para encostar), atribuição de doca, ocupação de piso (CAFs/pallets/docas)
- **Programação em Massa** — cria várias viagens de uma vez a partir de uma grade
- **CAFs** — tabela no PC e cartões com botão de próximo status no tablet; produção, vinculação a rua física, status (Em Produção → Produzida → Em Auditoria GRIS → Vinculada a Veículo → Processo de Entrega → Entrega Realizada)
- **Retorno de Pallets** — controle de pallets retornando das FCs, inventário por FC
- **Insumos HUB** — catálogo de equipamentos, checklist de turno, controle de tablets
- **Veículos** — cadastro com capacidade de pallets (PBR)
- **Report PCP** — CAFs prontas/produzindo, expedição por FC, backlog manual do turno (preenchimento por horário), exportável em PDF/print
- **Análise** — resumo fixo + seções (Visão Geral, Pontualidade, Descarga & Doca, CAFs, Operação & Frota, Monte sua Análise): SLA, OT, Pareto, mapa dia × horário dos atrasos, uso do app, consolidação de CAF
- **Ficha da transportadora / do motorista** — clique no nome em Lista, FUP FC, Análise ou no modal da viagem
- **TV / TV Yard** — modo kiosk; a TV tem torre de controle (painéis que se revezam e piscam em alerta), grid de ruas e ciclo automático
- **Admin** — usuários, permissões, monitoramento dos dois bancos (detecção de split-brain), histórico de turnos (com botão de desconectar sessão presa)

---

## 🗃️ Estrutura do banco (Postgres/Supabase)

Tabelas principais: `usuarios`, `auth_tokens`, `login_tentativas`, `sessoes` (presença), `sessoes_turno`, `auditoria`, `configuracoes`, `ruas`, `cafs`, `operacoes`, `retornos_pallets`, `inventario_pallets`, `insumos_hub`, `insumos_movimentacoes`, `checklist_turno`, `veiculos_cadastro`, `esteiras_colaborador`.

- **Autenticação e regras de negócio sensíveis** ficam em functions `SECURITY DEFINER` (`fazer_login`, `gerenciar_turno`, `validar_permissao`, `gerenciar_usuario_v2`, `status_tablets`, `admin_encerrar_turno`, etc.) — chamadas via RPC do PostgREST, nunca lógica sensível direto no client.
- **RLS (Row Level Security)** ativo em todas as tabelas. Tabelas sensíveis (`usuarios`, `auth_tokens`, `login_tentativas`, `sessoes_turno`) não têm policy pública — só acessíveis via functions `SECURITY DEFINER`.
- **Auditoria automática** via trigger (`fn_auditoria`) em `cafs`, `operacoes` e `usuarios` — grava diffs (não a linha inteira) em `auditoria`.
- IDs gerados no client usam timestamp + sufixo aleatório (`Date.now()+random`) — evita colisão entre dispositivos diferentes criando registros ao mesmo tempo.

---

## 🚀 Deploy

1. Commitar o `index.html` (e `functions/api/config.js`, se alterado) na branch `main`.
2. Cloudflare Pages faz o deploy automático.
3. **Sempre conferir o número da versão** no canto da tela (badge vermelho ao lado do título) depois do deploy — se não bateu, o deploy não pegou (cache de CDN, erro de commit, etc.).
4. Rodar qualquer migration de banco (SQL) **nos dois projetos Supabase** (A e B), já que os dois precisam ficar com o mesmo schema.

---

## 📐 Regras de negócio importantes

- **Consolidação de CAF**: todos os ID Clients de uma CAF devem ter a mesma data de promessa. Validado upstream (na cubadora) — o TRK PCP recebe CAFs já corretamente formadas.
- **Fluxo de rede**: coletas em São Paulo → matriz (transbordo) → TZX. Exceção: coleta SAO vai direto pra TZX, mas passa pela mesma auditoria completa/parcial.
- **Rotas de ida vs. retorno**: `TZX_FC` = ida (tem CAF). `FC_TZX` = retorno de pallets/insumos (sem CAF).
- **Liberação automática de rua**: quando uma viagem entra em "Em Trânsito" (`TRAN`), a rua da CAF vinculada é liberada automaticamente e a CAF avança pra "Processo de Entrega".

---

## 📝 Changelog

O histórico de versões completo fica dentro do próprio app (`APP_VERSION` + objeto de changelog no `index.html`, acessível pelo badge de versão no topo). Este README não duplica esse histórico — consulte lá pra ver o que mudou em cada versão.
