# Fix: Agent CEO Acknowledgement-Only Bug

**Date:** 2026-04-08
**Branch:** `claude/restore-claude-memory-VkqVx`
**Commit:** `4c879c3`

## Problema

Uma issue operacional como:

> "Contratar agente CTO e delegar integração CFN/Navi/Paperclip"

produzia runs onde o agente respondia apenas:

> "Entendido. As instruções do agente foram carregadas e estou pronto para receber novas tarefas."

e parava por aí — marcado como `succeeded`.

## Causa Raiz

Três falhas combinadas (classificação **F — múltiplas causas**):

### Causa A — Issue title/description nunca chegava ao adapter

**Arquivo:** `server/src/services/heartbeat.ts:1973-1990`

O `issueContext` (com `title`, `description`, `identifier`) era buscado do banco de dados mas usado **exclusivamente para resolução de workspace**. O objeto `context` passado ao adapter na linha 2520 continha apenas `issueId` — sem título, sem descrição, sem nada que dissesse ao agente *o que fazer*.

### Causa B — Prompt padrão genérico demais

**Arquivo:** `packages/adapters/*/execute.ts` (todos os 6 adapters locais)

O `promptTemplate` padrão:

```
"You are agent {{agent.id}} ({{agent.name}}). Continue your Paperclip work."
```

Não referenciava a issue de nenhuma forma. Mesmo com `context.issueId` presente, o agente acordava sem saber o que a issue pedia.

### Causa E — Exit code 0 = sucesso sem verificar trabalho real

**Arquivo:** `server/src/services/heartbeat.ts:2618`

```ts
if ((adapterResult.exitCode ?? 0) === 0 && !adapterResult.errorMessage) {
  outcome = "succeeded";
}
```

Um agente que respondesse "Entendido, estou pronto" e saísse com exit 0 era marcado como **succeeded**.

## Fluxo Antes do Fix

```
issue atribuída
  → queueIssueAssignmentWakeup (issueId no payload)
  → enrichWakeContextSnapshot (context.issueId = "abc-123")
  → executeRun (busca issueContext com title/description do DB)
  → context passado ao adapter = { issueId: "abc-123" }    ← SEM TÍTULO/DESCRIÇÃO
  → adapter monta prompt: "Continue your Paperclip work."  ← GENÉRICO
  → agente responde: "Entendido. Aguardo novas tarefas."
  → exitCode=0 → outcome="succeeded"                      ← FALSO SUCESSO
```

## Fluxo Depois do Fix

```
issue atribuída
  → queueIssueAssignmentWakeup (issueId no payload)
  → enrichWakeContextSnapshot (context.issueId = "abc-123")
  → executeRun (busca issueContext com title/description do DB)
  → context = { issueId, issueTitle, issueDescription, issueIdentifier }  ← ENRIQUECIDO
  → adapter monta prompt com seção "## Current Issue" + instrução operacional
  → agente recebe contexto completo da task e age
  → SE responder só acknowledgement → outcome="failed", errorCode="acknowledgement_only"
```

## Correções Aplicadas

### 1. heartbeat.ts — Injeção de contexto de issue

Adicionado `description` ao SELECT da issue e injeção de `issueTitle`, `issueDescription`, `issueIdentifier` no objeto `context` antes de passá-lo ao adapter.

```ts
if (issueContext) {
  context.issueTitle = issueContext.title;
  context.issueIdentifier = issueContext.identifier ?? null;
  if (issueContext.description) {
    context.issueDescription = issueContext.description;
  }
}
```

### 2. adapter-utils — Nova função `buildIssueContextSection()`

Utilidade compartilhada que produz uma seção de prompt estruturada:

```
## Current Issue
**PAP-42**: Contratar agente CTO e delegar integração CFN/Navi/Paperclip

Criar um agente CTO que gerencie a equipe de engenharia...

Wake reason: issue_assigned

Execute the task described above. Do not just acknowledge — take concrete action,
make progress, and report results.
```

Retorna string vazia quando não há issue — seguro para sempre incluir em `joinPromptSections`.

### 3. Todos os 6 adapters locais atualizados

Adapters modificados:
- `opencode-local`
- `claude-local`
- `codex-local`
- `pi-local`
- `gemini-local`
- `cursor-local`

Cada um agora importa `buildIssueContextSection` e insere a seção no prompt via `joinPromptSections`, entre o session handoff e o prompt template.

### 4. Detecção de acknowledgement-only

Nova função `isAcknowledgementOnlyOutput()` em `heartbeat-run-summary.ts` com patterns em PT e EN:

- "instruções carregadas"
- "aguardo novas tarefas" / "waiting for new tasks"
- "entendido" / "understood" / "acknowledged"
- "pronto para receber" / "ready to receive"
- "no tasks found" / "standing by"

Integrada na determinação de outcome: quando há `issueId` e a saída é acknowledgement-only, o run é classificado como `failed` com `errorCode: "acknowledgement_only"`.

## Arquivos Modificados

| Arquivo | Tipo | Mudança |
|---------|------|---------|
| `server/src/services/heartbeat.ts` | fix | Injetar issue context + detectar acknowledgement-only |
| `server/src/services/heartbeat-run-summary.ts` | fix | `isAcknowledgementOnlyOutput()` com patterns PT/EN |
| `packages/adapter-utils/src/server-utils.ts` | feat | `buildIssueContextSection()` |
| `packages/adapters/opencode-local/src/server/execute.ts` | fix | Usar `buildIssueContextSection` no prompt |
| `packages/adapters/claude-local/src/server/execute.ts` | fix | Usar `buildIssueContextSection` no prompt |
| `packages/adapters/codex-local/src/server/execute.ts` | fix | Usar `buildIssueContextSection` no prompt |
| `packages/adapters/pi-local/src/server/execute.ts` | fix | Usar `buildIssueContextSection` no prompt |
| `packages/adapters/gemini-local/src/server/execute.ts` | fix | Usar `buildIssueContextSection` no prompt |
| `packages/adapters/cursor-local/src/server/execute.ts` | fix | Usar `buildIssueContextSection` no prompt |

## Testes Adicionados

| Arquivo | Testes | Cobertura |
|---------|--------|-----------|
| `packages/adapters/opencode-local/src/server/issue-context.test.ts` | 7 | `buildIssueContextSection`: título, identifier, descrição, wake reason, instrução anti-passividade, cenário real PAP-100 |
| `server/src/services/heartbeat-run-summary.test.ts` | 11 | `isAcknowledgementOnlyOutput`: patterns PT/EN, null/empty, edge cases (saída longa, trabalho real contendo "entendido"), `summarizeHeartbeatRunResultJson` |

## Verificação

```
pnpm -r typecheck    ✅ limpo
pnpm test:run        ✅ 18 novos testes passam (falhas são pre-existentes em git worktree)
pnpm build           ✅ limpo
```

## Riscos Remanescentes

1. **Prompts customizados duplicando info**: Se um agente já tem `promptTemplate` customizado com `{{context.issueTitle}}`, a informação aparecerá duas vezes. Risco baixo — a seção é aditiva e não conflita.

2. **False positives no detector**: Patterns curtos podem pegar output legítimo em edge cases raros. Mitigado com limite de 2000 chars — saída longa nunca é flagged.

3. **Adapters HTTP/process**: Não afetados por esta mudança (não usam `joinPromptSections`). Se tiverem o mesmo problema, precisam de fix separado.

4. **Logs temporários**: O `logger.debug` adicionado em heartbeat.ts para rastrear injeção de context pode ser removido quando a correção for confirmada em produção.
