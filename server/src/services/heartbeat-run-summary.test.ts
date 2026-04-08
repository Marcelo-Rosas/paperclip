import { describe, expect, it } from "vitest";
import { isAcknowledgementOnlyOutput, summarizeHeartbeatRunResultJson } from "./heartbeat-run-summary.js";

describe("isAcknowledgementOnlyOutput", () => {
  it("returns false for null/undefined/empty", () => {
    expect(isAcknowledgementOnlyOutput(null)).toBe(false);
    expect(isAcknowledgementOnlyOutput(undefined)).toBe(false);
    expect(isAcknowledgementOnlyOutput("")).toBe(false);
  });

  it("detects Portuguese acknowledgement pattern", () => {
    expect(
      isAcknowledgementOnlyOutput(
        "Entendido. As instruções do agente foram carregadas e estou pronto para receber novas tarefas."
      ),
    ).toBe(true);
  });

  it("detects English acknowledgement pattern", () => {
    expect(
      isAcknowledgementOnlyOutput(
        "Understood. Agent instructions loaded. Ready to receive new tasks."
      ),
    ).toBe(true);
  });

  it("detects 'standing by' pattern", () => {
    expect(isAcknowledgementOnlyOutput("Instructions loaded. Standing by for tasks.")).toBe(true);
  });

  it("detects 'no tasks found' pattern", () => {
    expect(isAcknowledgementOnlyOutput("No actionable tasks found in my queue.")).toBe(true);
  });

  it("detects 'waiting for new tasks' pattern", () => {
    expect(
      isAcknowledgementOnlyOutput("Aguardo novas tarefas para prosseguir."),
    ).toBe(true);
  });

  it("returns false for legitimate work output", () => {
    expect(
      isAcknowledgementOnlyOutput(
        "Created branch feature/cto-agent. Implemented CTO agent with delegation capabilities. " +
        "Added 3 new files and updated the agent registry. Tests pass."
      ),
    ).toBe(false);
  });

  it("returns false for long operational output", () => {
    const longOutput = "Completed integration of CFN with Navi service. " + "x".repeat(2500);
    expect(isAcknowledgementOnlyOutput(longOutput)).toBe(false);
  });

  it("returns false for work that includes acknowledgement word but has substance", () => {
    expect(
      isAcknowledgementOnlyOutput(
        "Created the CTO agent configuration. Set up delegation pipeline. " +
        "The hiring process is complete and the agent is now active in the org chart."
      ),
    ).toBe(false);
  });
});

describe("summarizeHeartbeatRunResultJson", () => {
  it("returns null for empty input", () => {
    expect(summarizeHeartbeatRunResultJson(null)).toBeNull();
    expect(summarizeHeartbeatRunResultJson(undefined)).toBeNull();
  });

  it("extracts summary field", () => {
    const result = summarizeHeartbeatRunResultJson({ summary: "Work done" });
    expect(result).toEqual({ summary: "Work done" });
  });
});
