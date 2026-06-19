# 🚛 TRK PCP 2026
### Sistema Operacional Logístico — Total Express

> Substitui planilhas Excel manuais por uma interface visual interativa para controle de programação e execução de rotas de transferência.

---

## 🌐 Acesso

**URL:** [`https://hellys-cpu.github.io/App-PCP-TRK`](https://hellys-cpu.github.io/App-PCP-TRK)

---

## 📋 Funcionalidades

### 📊 Painel de Status
- Visão em colunas por status operacional (similar ao Kanban)
- Arraste cards entre colunas para atualizar o status
- Destaque visual automático para operações atrasadas
- 9 status: Programado → Ag. Carregamento → Em Carregamento → Em Trânsito → Ag. Descarga → Finalizado → Cancelado → Recusado → Em Pernoite

### ☰ Lista
- Visão tabular completa de todas as operações
- Cálculo automático de Δ Saída, Δ Chegada FC e Tempo de Doca

### 📅 Programação D-1
- Cadastro de operações para o dia seguinte
- Visão rápida de todas as operações com status PROGRAMADO

### ⚡ Programação em Massa
- Defina quantas viagens por rota de uma só vez
- Preencha motorista, placa, SM, TMS e horários em tabela inline
- Gere todas as operações com um clique

### 📋 FUP FC
- Painel consolidado para envio ao Centro de Distribuição
- Horários planejados vs realizados com delta colorido
- Indicadores de SLA por operação
- Agrupamento por rota
- Exportação CSV e impressão

---

## 🗂️ Campos por Operação

| Campo | Descrição |
|---|---|
| ID | Gerado automaticamente (OP-XXXX) |
| SM | Número da SM |
| ID TMS | Identificador no sistema TMS |
| ISA | Código ISA |
| Rota | TZX_GR8 / TZX_XC9 / TZX_JDU / TZX_GR9 / TZX_GR5 |
| Tipo de Carga | LTL / FLT / Inbound / Extra |
| Tipologia | CARRETA / TOCO / TRUCK / VAN / UTILITÁRIO |
| Transportadora | Lista pré-definida |
| Motorista | Nome do motorista |
| Placa | Placa do cavalo (e carreta se CARRETA) |
| Horários Planejados | Apresentação, Saída, Chegada FC |
| Horários Reais | Apresentação, Saída, Chegada FC, Descarga |
| CAFs | Múltiplas CAFs por operação |
| Observações | Campo livre |

---

## ⚡ Cálculos Automáticos

| Indicador | Fórmula |
|---|---|
| Δ Apresentação | Real − Planejado (min) |
| Δ Saída | Real − Planejado (min) |
| Δ Chegada FC | Real − Planejado (min) |
| Tempo de Doca | Descarga Real − Chegada FC Real (min) |
| SLA | Δ Chegada FC > 0 = Atraso / ≤ 0 = No Prazo |

---

## 🎨 Tema Visual

O sistema possui dois temas — clique no botão **🌙 Escuro / ☀️ Claro** no topo para alternar. A preferência é salva automaticamente.

---

## 🗄️ Banco de Dados (Supabase)

O sistema utiliza **Supabase** (PostgreSQL na nuvem) para armazenamento compartilhado entre dispositivos.

### Configuração

No arquivo `index.html`, localize e substitua:

```javascript
const SUPABASE_URL = 'https://SEU-PROJETO.supabase.co';
const SUPABASE_KEY = 'sua-anon-public-key';
```

### Credenciais do Projeto

| Item | Valor |
|---|---|
| Projeto | Hellys-CPU's Pcp |
| URL | `https://xolqsrcqvobfiiqqokkh.supabase.co` |
| Key | anon public (Legacy API Keys) |
| Plano | Free (500MB) |

### Tabela Principal: `operacoes`

```sql
CREATE TABLE operacoes (
  id text PRIMARY KEY,
  data_prog date, data_op date,
  rota text, tipo_carga text, tipologia text,
  transportadora text, motorista text, placa text, placa_carreta text,
  sm text, tms text, isa text,
  plan_apres text, plan_saida text, plan_cheg_fc text,
  real_apres text, real_saida text, real_cheg_fc text, real_descarga text,
  status text, obs text,
  cafs jsonb DEFAULT '[]',
  hist jsonb DEFAULT '[]',
  updated_by text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
ALTER TABLE operacoes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "allow_all" ON operacoes FOR ALL USING (true) WITH CHECK (true);
```

### Sincronização
- Dados salvos automaticamente no Supabase a cada alteração
- Sincronização automática a cada 15 segundos entre dispositivos
- Fallback para localStorage se o banco estiver offline

---

## 🔐 Segurança

- Senhas armazenadas como **SHA-256 hash** — nunca em texto puro
- Sessão expira automaticamente em **8 horas**
- Chave utilizada: **anon public** (segura para frontend)
- Nunca utilize a `service_role` (secret) no código do site

### Para adicionar novo usuário

1. Gere o hash da senha em: [emn178.github.io/online-tools/sha256.html](https://emn178.github.io/online-tools/sha256.html)
2. Adicione no array `USERS` no `index.html`:
```javascript
{user:'novo.usuario', nome:'Nome Completo', av:'NC', cor:'#1d4ed8', perfil:'OPERADOR', pw:'senha@2026'}
```

---

## 🚀 Deploy e Atualização

### Hospedagem
- **Plataforma:** GitHub Pages (gratuito)
- **URL:** `https://hellys-cpu.github.io/App-PCP-TRK`
- **Repositório:** `github.com/Hellys-CPU/App-PCP-TRK`

### Como atualizar o sistema

1. Baixe o `index.html` atualizado
2. Acesse o repositório no GitHub
3. Clique no arquivo `index.html`
4. Clique no ícone de lápis ✏️ (editar)
5. Selecione tudo e cole o novo código
6. Clique em **Commit changes**
7. Aguarde ~2 minutos e a URL já estará atualizada

---

## 🛠️ Stack Tecnológica

| Tecnologia | Uso |
|---|---|
| HTML5 + CSS3 | Estrutura e estilização |
| JavaScript (ES2020) | Lógica e interatividade |
| Supabase (PostgreSQL) | Banco de dados compartilhado |
| GitHub Pages | Hospedagem gratuita |
| Web Crypto API | Hash seguro de senhas (SHA-256) |

> Sistema desenvolvido como MVP operacional — arquivo único sem dependências de servidor ou build.

---

## 📈 Roadmap — Próximos Passos

- [ ] Integração com Azure Active Directory (SSO corporativo)
- [ ] API de integração com TMS
- [ ] Alertas automáticos via Microsoft Teams / WhatsApp
- [ ] Dashboard Power BI conectado ao Supabase
- [ ] Migração para Next.js + PostgreSQL corporativo
- [ ] Perfis de acesso com permissões por tela (Admin / Operador / Visualizador)
- [ ] Exportação automática do FUP por e-mail para o FC

---

## 📞 Contato e Suporte

| Item | Detalhe |
|---|---|
| Desenvolvido por | Hellys — PCP Transferência |
| Versão | MVP v1.0 |
| Data | Junho/2026 |

---

*TRK PCP 2026 — Sistema Operacional Logístico · Total Express*
