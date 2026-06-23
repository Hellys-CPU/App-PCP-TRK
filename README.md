<div align="center">

# 🚛 TRK PCP 2026

**Sistema Operacional de Transferência · Total Express**

[![Deploy](https://img.shields.io/badge/deploy-GitHub%20Pages-cc0000?style=flat-square&logo=github)](https://hellys-cpu.github.io/App-PCP-TRK)
[![Status](https://img.shields.io/badge/status-ativo-22c55e?style=flat-square)]()
[![Versão](https://img.shields.io/badge/versão-v67-3b82f6?style=flat-square)]()
[![Stack](https://img.shields.io/badge/stack-HTML%20%2B%20Supabase-f59e0b?style=flat-square)]()

[🔗 Acessar o sistema](https://hellys-cpu.github.io/App-PCP-TRK) · [📖 Documentação completa](https://believed-magnesium-adb.notion.site/TRK_PCP_2026_Documentacao-3883f4071d1f80cf80b4fd7cc018b73a)

</div>

---

## O que é

O TRK PCP 2026 é um sistema web colaborativo para a equipe de **PCP Transferência** da Total Express. Substitui planilhas Excel manuais por um painel em tempo real acessível de qualquer dispositivo.

Ele acompanha viagens de transferência entre o **hub de origem (TZX)** e os **Fulfillment Centers (FC)**, do momento em que são programadas até a finalização da descarga.

---

## Funcionalidades

| Módulo | Descrição |
|---|---|
| 📊 **Painel de Status** | Kanban com 9 colunas e drag-and-drop entre status |
| ☰ **Lista** | Tabela com todos os campos e filtros avançados |
| 📅 **D-1** | Grade de operações programadas com alertas de horário |
| ⚡ **Em Massa** | Criação de múltiplas viagens por rota em dois passos |
| 📋 **FUP FC** | Follow-up consolidado com foco em SLA de chegada ao FC |
| 📈 **Análise** | Métricas, gráficos e SLA por semana, dia, rota e transportadora |
| ⚙️ **Admin** | Usuários, configurações, backup e gestão de rotas/transportadoras |

**Destaques técnicos:**
- Sincronização em tempo real via WebSocket (Supabase Realtime)
- Presença de usuários online com indicador de aba atual
- Dark mode persistente
- Instalável como PWA (Progressive Web App)
- Exportação CSV e backup JSON completo
- Funciona offline com fallback para `localStorage`

---

## Stack

```
Frontend    → HTML + CSS + JavaScript vanilla (single-file, sem frameworks)
Backend     → Supabase (PostgreSQL + PostgREST + Realtime WebSocket)
Hosting     → GitHub Pages
Auth        → SHA-256 hash verificado contra tabela usuarios no Supabase
```

---

## Estrutura do Repositório

```
App-PCP-TRK/
├── index.html              ← aplicação completa (único arquivo)
├── README.md               ← este arquivo
└── TRK_PCP_2026_Documentacao.md  ← documentação técnica detalhada
```

> Toda a aplicação vive em um único `index.html`. CSS, JavaScript e HTML estão inline — sem dependências externas, sem build step, sem `node_modules`.

---

## Banco de Dados (Supabase)

Três tabelas no projeto Supabase:

| Tabela | Finalidade |
|---|---|
| `operacoes` | Dados de todas as viagens de transferência |
| `usuarios` | Autenticação e perfis de acesso |
| `sessoes` | Presença online dos usuários ativos |

---

## Acesso e Perfis

| Perfil | Permissões |
|---|---|
| **ADMIN** | Acesso total incluindo gestão de usuários e configurações |
| **OPERADOR** | Criar, editar, mover e deletar operações |
| **VISUALIZADOR** | Somente leitura |

> Credenciais de acesso são gerenciadas pelo Admin diretamente no sistema (aba ⚙️ Admin → Gestão de Usuários).

---

## Segurança

| Item | Status |
|---|---|
| Senhas nunca armazenadas em texto puro | ✅ |
| Hash SHA-256 via `crypto.subtle` (API nativa) | ✅ |
| Senhas não trafegam pela rede | ✅ |
| Sessão expira em 8 horas | ✅ |
| Token aleatório anti-spoofing na sessão | ✅ |
| Rate limiting: bloqueio de 60s após 5 tentativas falhas | ✅ |
| HTTPS obrigatório (GitHub Pages) | ✅ |

**Pendente para produção corporativa:**
- Configurar RLS (Row Level Security) no Supabase para restringir acesso direto à API
- Migrar para autenticação via Azure AD

---

## Deploy

O sistema é estático — basta colocar o `index.html` em qualquer servidor web.

### GitHub Pages (atual)

```bash
# 1. Fazer push do index.html na branch main
git add index.html
git commit -m "update: v67"
git push origin main

# 2. Configurar em Settings → Pages → Source: main / root
# 3. Acessar: https://hellys-cpu.github.io/App-PCP-TRK
```

### Outros ambientes

```bash
# Servidor local simples
python3 -m http.server 8080
# Acessar: http://localhost:8080

# IIS / Apache / Nginx
# Copiar index.html para a pasta raiz do site — nenhuma configuração adicional necessária
```

---

## Atalhos de Teclado

| Tecla | Ação |
|---|---|
| `1` – `5` | Navegar entre abas |
| `N` | Nova operação |
| `/` | Focar na busca |
| `T` | Alternar dark/light mode |
| `Esc` | Fechar modal |

---

## Roadmap

- [ ] Autenticação via Azure AD (SSO corporativo)
- [ ] Integração com TMS (importação automática de SM e dados de viagem)
- [ ] Service Worker + manifest.json estático (PWA offline completo)
- [ ] Dashboards Power BI conectados ao Supabase
- [ ] RLS policies no Supabase

---

## Documentação

A documentação técnica completa está em [`TRK_PCP_2026_Documentacao.md`](./TRK_PCP_2026_Documentacao.md) e cobre:

- Arquitetura e stack
- Estrutura de dados e campos
- Todos os módulos detalhados
- Referência de funções JavaScript
- Schema SQL completo (SQL Server + PostgreSQL)
- Guia de integração corporativa com ETL e views analíticas

---

<div align="center">

**TRK PCP 2026 · Total Express · PCP Transferência**  
*Desenvolvido e mantido pela equipe de PCP*

</div>
