# Real-Sales — Repositório de Referência

Este repositório foi incorporado ao workspace em `/references/real-sales` como base de referência técnica e arquitetural para o **Leadflow** e aplicações complementares.

---

## 🏗️ Módulos e Recursos Mapeados

### 1. SDR AI Agent & WhatsApp
- **Localização:** `references/real-sales/app/(marketing)/marketing/agents`, `lib/llm/`, `lib/channels/`
- **Tecnologias:** LLM (Groq / Llama 3 70B ou Gemini), Waha WhatsApp Core, Redis Debounce (coalescência de mensagens de 5s).
- **Recursos:**
  - Persona do agente e `qualificationBoundary` (teto operacional de qualificação antes de passar para o corretor humano).
  - Reconhecimento e deduplicação de telefones via sufixo dos últimos 8 dígitos.
  - Histórico de conversas (`Conversation` e `Message`) com contagem de tokens.

### 2. Meta Ads & Ingestão de Leads
- **Localização:** `references/real-sales/app/api/facebook/`, `references/real-sales/lib/lead-ingestion.ts`
- **Recursos:**
  - Webhooks do Meta Lead Ads com verificação de assinatura e processamento em lote.
  - Mapeamento de campos de formulários (`FacebookFormMapping`).
  - Atribuição direta à roleta (`roletaId`) ou corretor padrão.

### 3. Meta Ads Analytics (MCP Server)
- **Localização:** `references/real-sales/mcp-meta-analytics/`
- **Ferramentas:**
  - `get_overall_stats`, `get_campaign_summary`, `get_top_campaigns`, `get_campaign_trend`, `compare_periods`.
  - Diagnóstico de CPL, detecção de fadiga de criativos e simulação de escala de budget.

### 4. CRM & Pipeline Imobiliário
- **Localização:** `references/real-sales/app/(app)/pipeline`, `client`, `properties`, `tasks`, `qualificacao`
- **Modelagem (`prisma/schema.prisma`):**
  - Clientes (`Client`), Imóveis (`Property`), Tarefas (`Task`), Notas (`Note`), Ofertas Ativas (`ActiveOffer`).
  - Integração nativa com a roleta (`roletaId`), corretores (`brokerId`) e supervisores (`supervisorId`).

### 5. Notificações Multicanal
- **Localização:** Web Push Notifications, Slack Webhooks (`slack_webhook_url`), e-mail e push subscribers.
