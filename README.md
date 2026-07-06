<div align="center">

# 🚛 TRK PCP 2026

**Sistema de Gestão de Transferências — Total Express**

[![Version](https://img.shields.io/badge/versão-v103-cc0000?style=for-the-badge)](https://app-pcp-trk.pages.dev)
[![Status](https://img.shields.io/badge/status-em_produção-22c55e?style=for-the-badge)]()
[![Stack](https://img.shields.io/badge/stack-HTML5_%7C_Supabase_%7C_Ably-3b82f6?style=for-the-badge)]()
[![License](https://img.shields.io/badge/licença-privado-6b7280?style=for-the-badge)]()

Controle completo das operações de transferência entre o hub **TZX** e os Fulfillment Centers da Amazon — do planejamento à entrega, em tempo real.

[Acessar Sistema](https://app-pcp-trk.pages.dev) · [Documento de Riscos](./TRK_PCP_Riscos_e_Prevencao.md)

</div>

---

## 📋 Índice

- [Visão Geral](#-visão-geral)
- [Arquitetura](#-arquitetura)
- [Funcionalidades](#-funcionalidades)
- [Guia por Aba](#-guia-por-aba)
- [Regras de Negócio](#-regras-de-negócio)
- [Perfis de Acesso](#-perfis-de-acesso)
- [Importador de Planilha](#-importador-de-planilha)
- [Treinamento Rápido (15 min)](#-treinamento-rápido)
- [Deploy](#-deploy)
- [Segurança](#-segurança)
- [Manutenção e Monitoramento](#-manutenção-e-monitoramento)
- [FAQ da Operação](#-faq-da-operação)
- [Stack Técnica](#-stack-técnica)

---

## 🎯 Visão Geral

| | |
|---|---|
| **O que faz** | Gerencia toda a operação de transferência: programação de viagens, acompanhamento em tempo real, gestão de docas/pátio, CAFs, análise de desempenho e relatórios para Amazon |
| **Quem usa** | Equipe PCP Transferência (operadores, supervisores, portaria) |
| **FCs atendidos** | GR8 · GR9 · XC9 · GR5 · JDU |
| **Rotas** | 13 rotas ativas (Inbound, LTL, Extra) |
| **Capacidade** | 1.500+ viagens/mês · 30 usuários simultâneos |
| **Disponibilidade** | 24/7 · qualquer navegador · funciona offline (cache local) |

---

## 🏗 Arquitetura

```
┌──────────────────────────────────────────────────┐
│                   NAVEGADOR                       │
│  ┌─────────────────────────────────────────────┐ │
│  │  index.html (344 KB · single-file · PWA)    │ │
│  │  HTML5 + CSS3 + JavaScript vanilla          │ │
│  └────────────┬────────────────┬───────────────┘ │
└───────────────┼────────────────┼─────────────────┘
                │                │
         REST API          WebSocket
                │                │
    ┌───────────▼──┐    ┌───────▼────────┐
    │  Supabase    │    │     Ably       │
    │  PostgreSQL  │    │  Realtime      │
    │  (Free tier) │    │  (Free tier)   │
    │              │    │                │
    │ • 8 tabelas  │    │ • Presença     │
    │ • 14 RPCs    │    │ • Sync ops     │
    │ • 4 pg_cron  │    │ • Session ctrl │
    │ • Auditoria  │    │ • < 1s latency │
    └──────────────┘    └────────────────┘
```

| Camada | Tecnologia | Plano | Custo |
|---|---|---|---|
| **Hospedagem** | Cloudflare Pages | Free | R$ 0 |
| **Banco de dados** | Supabase PostgreSQL 17 | Free (500k req/mês) | R$ 0 |
| **Tempo real** | Ably Realtime | Free (6M msg/mês) | R$ 0 |
| **Repositório** | GitHub (privado) | Free | R$ 0 |

> **Sem servidor próprio · Sem TI · Sem instalação · 100% navegador**

---

## ⚡ Funcionalidades

### Core

| Feature | Descrição |
|---|---|
| 🏠 **Kanban visual** | Cards arrastáveis por status (9 estados) |
| 📋 **Lista completa** | Tabela com sort ▲▼ em 17 colunas + filtros inline |
| 📦 **FUP Amazon** | Relatório por FC agrupado (independente de sufixo LTL/EX) com export PDF A4 landscape |
| 📦 **Gestão de CAFs** | CRUD completo · vencimento · badge de alerta na aba |
| 📈 **Análise/BI** | Dashboards: SLA, distribuição por tipo/rota/transportadora, docas, heatmap semanal |
| 📺 **TV Operacional** | Modo monitor — estrada animada com veículos por rota (modo compacto automático >25 viagens) |
| 🚪 **Gestão de Docas** | Ocupação visual de docas + barras CAFs/Pallets/Docas |
| ⚡ **Programação em Massa** | Criar N viagens de uma vez para D-1 |

### Tempo Real

| Feature | Descrição |
|---|---|
| 🔴 **Live sync** | Mudanças propagam em < 1 segundo via Ably |
| 👥 **Presença online** | Quem está online + em qual aba · atualiza instantaneamente |
| 🔒 **Sessão única** | 1 máquina por usuário · login novo desloga máquina antiga instantaneamente |
| 🔄 **Sync adaptativo** | Ably OK: verificação backup a cada 180s · Ably caído: 45s automático |

### Dados e Segurança

| Feature | Descrição |
|---|---|
| 📊 **Importador Excel** | Lê `.xlsb`/`.xlsx` (aba BASE) · preview antes de confirmar · insere novas + atualiza status |
| 📥 **Exportar CSV** | Lista com filtros/ordenação aplicados · separador `;` · Excel BR compatível |
| 💾 **Backup JSON** | Exporta/importa todos os dados · 1 clique |
| 🔐 **bcrypt custo 12** | Senhas nunca trafegam em texto |
| 🛡 **Rate limit** | 5 tentativas de login / 60s por usuário |
| 📝 **Auditoria** | Toda alteração registrada com diff (30 dias de retenção) |
| 🕐 **Lock otimista** | Avisa se outro usuário alterou a mesma operação |

---

## 📱 Guia por Aba

### 🏠 Painel (tela principal)

> Quadro Kanban com as viagens do dia organizadas por status em colunas.

**Uso no dia a dia:**
- Ao abrir, mostra viagens de **hoje** automaticamente
- **Arrastar card** entre colunas = muda status da viagem
- **Clicar no card** = editar todos os campos
- Ao mover para "Em Carregamento" → **doca obrigatória**
- Filtros: data, rota, transportadora, busca por texto

**Regra de ouro:** *mova o card na hora que acontecer na vida real*

---

### 📋 Lista

> Mesmas viagens, em tabela detalhada com 18 colunas.

- **Clique no cabeçalho** → ordena ▲▼
- **Mini-filtros inline** em Rota, Tipo, Transportadora, Status
- Coluna `#` = posição na lista filtrada
- Coluna `Δ Saída` / `Δ FC` = atraso em minutos (verde = adiantou, vermelho = atrasou)
- **📥 CSV** → exporta com filtros aplicados

---

### 🚪 Gestão de Doca

> Controle visual do pátio: docas ocupadas, ocupação de piso.

- Cada doca: verde = livre · ocupada mostra a viagem
- Barras de ocupação: **CAFs** · **Pallets** · **Docas** (verde/amarelo/vermelho por nível)
- Mover para "Em Trânsito" → libera doca automaticamente

---

### ⚡ Em Massa

> Criar várias viagens de uma vez (programação D-1).

1. Escolhe data, rota, quantidade
2. Define horário de início + intervalo
3. Sistema gera todas com horários sequenciais
4. Depois edita cada uma com transportadora/motorista

---

### 📋 FUP FC

> Acompanhamento detalhado: planejado vs real para todas as viagens.

- KPIs: total, em carregamento, em trânsito, finalizado, no prazo, atrasado
- Colunas: Apresentação → Saída TZX → Chegada FC → Descarga, com `Δ`
- Verde = no prazo · Vermelho = atrasado

---

### 📦 FUP Amazon

> Relatório formatado para enviar à Amazon via WhatsApp (foto ou PDF).

1. Seleciona **FC** (GR8, XC9...) → agrupa TODAS as rotas daquele destino
2. Seleciona a **data**
3. Blocos por status: Programado → Aguard. Carregamento → Em Carregamento → Em Trânsito → Aguard. Descarga
4. Cada viagem: **Planejado → Real** (Apres, Saída, FC, Descarga) + SLA + CAFs
5. Finalizados/Cancelados = só contagem + chips de ID
6. **📄 Exportar PDF** → A4 paisagem limpo
7. **Auto-refresh** a cada 30s (deixa aberto, sempre atual)

---

### 📦 CAFs

> Banco de todas as CAFs (Confirmação de Autorização de Frete).

- Criar, vincular a viagem, dar baixa
- **Badge vermelho** na aba: conta CAFs vencidas + vencendo em 2 dias
- Cabeçalhos clicáveis ▲▼ + filtros por rota, tipo, status, data de criação
- CAF vencida = só se status em aberto (entregue/cancelada **nunca** aparece como vencida)
- Ao selecionar rota → **tipo preenche automaticamente** (Inbound / _EX=Extra / _LTL=LTL)

---

### 📈 Análise

> Dashboards de desempenho da operação.

- SLA do período (meta: 92%)
- Distribuição por tipo de carga (Inbound/Extra/LTL) — gráfico pizza
- Viagens por transportadora, rota, status
- Ocupação de docas
- Comparativo semanal · Heatmap

---

### 📺 TV / TV Yard

> Telas para monitor fixo na parede da operação.

- **TV:** estrada animada com veículos por rota + KPIs
  - **Modo compacto automático** quando >25 viagens (cards menores + agregação quando >6 veículos na mesma posição)
- **TV Yard:** foco no pátio — docas ocupadas (card grande) + CAFs + Pallets
- Atualização automática em tempo real

---

### ⚙️ Admin

> Centro de controle (só perfil ADMIN).

| Seção | O que faz |
|---|---|
| **Usuários** | Criar · editar (nome, login, perfil, senha, cor) · desativar |
| **Rotas** | Adicionar/remover (salva no banco para todos) |
| **Transportadoras** | Adicionar/remover |
| **Metas SLA** | Meta geral e por rota |
| **Docas** | Quantidade e nomes |
| **Backup** | Exportar/importar JSON · **📊 Importar Planilha BASE** |

---

## 📐 Regras de Negócio

| Regra | Lógica |
|---|---|
| **Tipo de carga** | Automático pelo sufixo da rota: `_EX` = Extra · `_LTL` = LTL · resto = **Inbound** |
| **FC = destino** | Segundo segmento da rota: `TZX_GR8` → GR8 · `TZX_XC9_LTL` → XC9 |
| **Fluxo de status** | `PROG → AGUCARR → EMCARR → TRAN → AGUDESC → FIN` (+ CANC, REC, PERN) |
| **Doca obrigatória** | Para mover para EMCARR, precisa escolher doca |
| **CAF vencida** | Só conta se status em aberto/vinculada/processo E data passou |
| **SLA** | Chegada real no FC vs planejada · meta 92% |
| **Piso** | 27 CAFs × 30 pallets = 810 pallets (configurável) |

---

## 👥 Perfis de Acesso

| Perfil | Criar/Editar viagens | Gerenciar CAFs | Admin | Importar |
|:---:|:---:|:---:|:---:|:---:|
| **ADMIN** | ✅ | ✅ | ✅ | ✅ |
| **SUPERVISOR** | ✅ | ✅ | ❌ | ❌ |
| **OPERADOR** | ✅ | ✅ | ❌ | ❌ |
| **PORTARIA** | Status apenas | ❌ | ❌ | ❌ |
| **VISUALIZADOR** | ❌ | ❌ | ❌ | ❌ |

**Sessão única:** cada usuário só pode estar logado em 1 dispositivo. Login novo → aviso + opção de derrubar sessão anterior (logout instantâneo via Ably).

---

## 📊 Importador de Planilha

> Admin → Backup & Dados → **📊 Importar Planilha BASE (.xlsb/.xlsx)**

### Passo a passo

1. Clica no botão → seleciona o arquivo
2. Sistema lê a aba `BASE` e processa todas as linhas de 2026
3. **Preview:** mostra quantas são novas / quantos status mudaram / quantas já estão ok
4. **LER O PREVIEW** → se os números fizerem sentido → **Confirmar**
5. Insere novas + atualiza status divergentes. **Nunca apaga nada.**

### Regras automáticas do importador

| Dado na planilha | Tratamento |
|---|---|
| ID com `/` (ex: `1349/192672013984`) | Antes da `/` = ID, depois = campo TMS |
| Rota `TZX_GR8_LTL` | Tipo = LTL (pelo sufixo) |
| Transportadora `FRATELI` | Normaliza → FRATELLI |
| Transportadora `0.0` | Cancelada sem transportadora → NULL |
| Motorista `CANCELADA` | → NULL |
| Linhas duplicadas | Mantém a última |
| Linhas sem data | Descartadas |

---

## 🎓 Treinamento Rápido

> **15 minutos** para novos usuários

| Min | Tópico | O que mostrar |
|:---:|---|---|
| 0-1 | **Login** | URL, usuário e senha individuais. Nunca compartilhar |
| 1-5 | **Painel** | Colunas de status, arrastar card, abrir edição, preencher horário real |
| 5-8 | **Nova viagem** | Criar do zero com todos os campos |
| 8-10 | **Lista** | Ordenar por cabeçalho, filtros, achar viagem antiga |
| 10-12 | **CAFs** | Criar CAF, vincular à viagem, dar baixa |
| 12-14 | **FUP Amazon** | Gerar relatório do FC, botão PDF |
| 14-15 | **Regra de ouro** | "O sistema só é bom se o status estiver atualizado — mova o card na hora que acontecer" |

---

## 🚀 Deploy

### Atualizar versão

```
1. Recebe o index.html novo
2. GitHub → repo App-PCP-TRK → Upload files → substitui index.html → Commit
3. Cloudflare publica em ~1 min
4. Todos fazem Ctrl+Shift+R (hard refresh)
```

---

## 🔐 Segurança

| Camada | Implementação |
|---|---|
| **Senhas** | bcrypt custo 12 · SHA-256 no frontend → bcrypt no servidor |
| **Login** | RPC `fazer_login` server-side · rate limit 5/60s |
| **Sessões** | Token 256-bit · rolling 7 dias · refresh 15min · max 1 por usuário |
| **CRUD usuários** | Via RPC `gerenciar_usuario_v2` (só ADMIN com token válido) |
| **DELETE** | Revogado para anon em todas as tabelas · só via RPCs |
| **Auditoria** | Trigger unificado · grava apenas diff em UPDATEs · retenção 30 dias |
| **XSS** | `esc()` em 86+ pontos de innerHTML |
| **Fuso** | `hojeLocal()` / `dateLocal()` — resolve bug UTC após 21h |
| **Lock** | Otimista: verifica `updated_at` antes de salvar |

### Vulnerabilidades aceitas (piloto)

| ID | Risco | Severidade | Resolução |
|---|---|---|---|
| F-01 | Anon key com SELECT/INSERT/UPDATE | CRÍTICA | Supabase Pro + Auth |
| F-03 | Chave Ably root no frontend | CRÍTICA | Criar chave restrita (pendente) |
| F-07 | Sem rate limit nas APIs de dados | SÉRIA | Supabase Pro |

---

## 🔧 Manutenção e Monitoramento

### ✅ Checklist semanal (5 min — toda segunda)

- [ ] Supabase Dashboard → Usage: API requests < 60%?
- [ ] Supabase Dashboard → Database size < 350MB?
- [ ] Admin → Exportar backup JSON → salvar no Drive
- [ ] Sistema abre normal e presença online aparece?

### ✅ Checklist mensal (10 min — todo dia 1º)

- [ ] Testar login com 1 usuário de cada perfil
- [ ] Conferir contagem de operações vs planilha do mês anterior

### 🚨 Se o sistema cair

| Passo | Diagnóstico | Ação |
|---|---|---|
| 1 | Todos ou só um PC? | Só um → F12 → Application → Clear site data → F5 |
| 2 | Erro de conexão? | Supabase: projeto pausado? Cota estourada? |
| 3 | Erro 401 em todos? | Chave API regenerada → chamar admin imediatamente |
| 4 | Site não abre? | Cloudflare fora ou deploy quebrado → reverter commit |

### 📊 Consumo de cota atual

| Recurso | Uso mensal | Limite Free | Utilização |
|---|---|---|---|
| API requests | ~99.000 | 500.000 | **20%** |
| Database | ~13 MB (proj. 150 MB/ano) | 500 MB | 3% |
| Ably mensagens | ~260.000 | 6.000.000 | 4% |

---

## ❓ FAQ da Operação

<details>
<summary><b>Não aparecem as viagens de amanhã/ontem</b></summary>
O filtro de data está em "hoje". Limpe o campo de data ou selecione a data desejada.
</details>

<details>
<summary><b>Criei uma viagem e o colega não está vendo</b></summary>
Normal ter delay de até 3s se o Ably estiver reconectando. Se persistir, o colega dá F5.
</details>

<details>
<summary><b>"Outro usuário alterou esta operação"</b></summary>
Duas pessoas editaram a mesma viagem. Escolha: sobrescrever ou cancelar e recarregar.
</details>

<details>
<summary><b>Esqueci minha senha</b></summary>
Peça a um ADMIN para resetar no Admin → Usuários → ✏️.
</details>

<details>
<summary><b>A tela está estranha/quebrada</b></summary>
F12 → Application → Clear site data → recarregar.
</details>

<details>
<summary><b>CAF aparece vencida mas já foi entregue</b></summary>
O status dela não foi atualizado. Abra a CAF e corrija para "Entregue".
</details>

<details>
<summary><b>Minha sessão foi encerrada</b></summary>
Alguém logou com o mesmo usuário em outra máquina. Cada conta permite apenas 1 dispositivo.
</details>

<details>
<summary><b>Quero ver viagens de 2+ meses atrás</b></summary>
O sistema carrega os últimos 90 dias. Dados mais antigos: consultar a planilha original.
</details>

---

## 🛠 Stack Técnica

| Componente | Detalhe |
|---|---|
| Frontend | HTML5 · CSS3 · JavaScript ES2020 (vanilla, zero frameworks) |
| Arquivo | `index.html` single-file (344 KB) |
| Banco | Supabase PostgreSQL 17 (us-east-2) |
| Realtime | Ably Realtime (WebSocket) |
| Hospedagem | Cloudflare Pages (auto-deploy via GitHub) |
| Leitor Excel | SheetJS 0.20.3 (CDN) |
| Presença | Ably Presence API nativa |
| Criptografia | SHA-256 (frontend) + bcrypt custo 12 (servidor) |
| Auditoria | Trigger PL/pgSQL com diff |
| Limpeza automática | 4 jobs pg_cron |

### Estrutura do banco

```
operacoes ─── cafs
    │
usuarios ─── auth_tokens ─── sessoes
    │
configuracoes   auditoria   login_tentativas
```

---

<div align="center">

**TRK PCP 2026** · Equipe PCP Transferência · Total Express

*Sistema independente do TI — 100% gerenciado pelo PCP*

</div>
