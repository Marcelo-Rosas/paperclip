function truncateSummaryText(value: unknown, maxLength = 500) {
  if (typeof value !== "string") return null;
  return value.length > maxLength ? value.slice(0, maxLength) : value;
}

/**
 * Patterns that indicate the agent acknowledged its instructions but did not
 * perform any real work.  Used to flag runs that exit 0 without evidence of
 * task execution.
 */
const ACKNOWLEDGEMENT_PATTERNS = [
  /\b(?:instruções|instructions)\b.*\b(?:carregad[ao]s?|loaded)\b/i,
  /\b(?:aguard[oa]|waiting|ready)\b.*\b(?:novas?\s+tarefas?|new\s+tasks?|further\s+instructions?)\b/i,
  /\b(?:entendido|understood|acknowledged)\b/i,
  /\bpronto\s+para\s+receber\b/i,
  /\bready\s+to\s+receive\b/i,
  /\bno\s+(?:actionable\s+)?(?:tasks?|work)\s+(?:found|available|assigned)\b/i,
  /\bstanding\s+by\b/i,
];

/**
 * Patterns in stdout that indicate the agent performed concrete actions
 * (tool calls, file edits, git operations, API requests, etc.).
 * When present alongside an acknowledgement phrase, the run is NOT
 * classified as acknowledgement-only.
 */
const ACTION_EVIDENCE_PATTERNS = [
  /\btool_use\b/,
  /\btool_call\b/,
  /\btool_result\b/,
  /\b(?:created|modified|deleted|updated|wrote|committed|pushed|merged)\s+(?:file|branch|commit|PR|pull request)/i,
  /\bgit\s+(?:commit|push|checkout|merge|rebase)\b/i,
  /\b(?:POST|PUT|PATCH|DELETE)\s+\/api\//,
  /\bstatus.*(?:in_progress|done|blocked)/,
];

/**
 * Returns true when the provided text looks like a readiness/acknowledgement
 * message rather than evidence of operational work.
 *
 * The check is two-layered:
 * 1. The text must match an acknowledgement pattern.
 * 2. There must be NO evidence of concrete action in either the text itself
 *    or in an optional `stdoutRaw` blob (full run stdout).
 *
 * This prevents false positives when an agent includes "entendido" or
 * "understood" in a longer response that also contains real work.
 */
export function isAcknowledgementOnlyOutput(
  text: string | null | undefined,
  stdoutRaw?: string | null,
): boolean {
  if (!text || typeof text !== "string") return false;
  const trimmed = text.trim();
  // Long responses are unlikely to be pure acknowledgement
  if (trimmed.length > 2000) return false;
  // Must match at least one acknowledgement pattern
  if (!ACKNOWLEDGEMENT_PATTERNS.some((pattern) => pattern.test(trimmed))) return false;
  // Check for action evidence in both summary and raw stdout
  const haystack = stdoutRaw ? `${trimmed}\n${stdoutRaw}` : trimmed;
  if (ACTION_EVIDENCE_PATTERNS.some((pattern) => pattern.test(haystack))) return false;
  return true;
}

function readNumericField(record: Record<string, unknown>, key: string) {
  return key in record ? record[key] ?? null : undefined;
}

export function summarizeHeartbeatRunResultJson(
  resultJson: Record<string, unknown> | null | undefined,
): Record<string, unknown> | null {
  if (!resultJson || typeof resultJson !== "object" || Array.isArray(resultJson)) {
    return null;
  }

  const summary: Record<string, unknown> = {};
  const textFields = ["summary", "result", "message", "error"] as const;
  for (const key of textFields) {
    const value = truncateSummaryText(resultJson[key]);
    if (value !== null) {
      summary[key] = value;
    }
  }

  const numericFieldAliases = ["total_cost_usd", "cost_usd", "costUsd"] as const;
  for (const key of numericFieldAliases) {
    const value = readNumericField(resultJson, key);
    if (value !== undefined && value !== null) {
      summary[key] = value;
    }
  }

  return Object.keys(summary).length > 0 ? summary : null;
}
