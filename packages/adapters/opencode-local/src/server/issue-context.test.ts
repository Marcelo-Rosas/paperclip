import { describe, expect, it } from "vitest";
import { buildIssueContextSection } from "@paperclipai/adapter-utils/server-utils";

describe("buildIssueContextSection", () => {
  it("returns empty string when no issue title in context", () => {
    expect(buildIssueContextSection({})).toBe("");
    expect(buildIssueContextSection({ issueId: "abc" })).toBe("");
    expect(buildIssueContextSection({ issueTitle: "" })).toBe("");
    expect(buildIssueContextSection({ issueTitle: "  " })).toBe("");
  });

  it("builds section with title only", () => {
    const section = buildIssueContextSection({
      issueTitle: "Contratar agente CTO",
    });
    expect(section).toContain("## Current Issue");
    expect(section).toContain("Contratar agente CTO");
    expect(section).toContain("Execute the task");
    expect(section).not.toContain("undefined");
  });

  it("builds section with identifier and title", () => {
    const section = buildIssueContextSection({
      issueTitle: "Integrate CFN/Navi/Paperclip",
      issueIdentifier: "PAP-42",
    });
    expect(section).toContain("**PAP-42**: Integrate CFN/Navi/Paperclip");
  });

  it("includes description when present", () => {
    const section = buildIssueContextSection({
      issueTitle: "Hire CTO agent",
      issueDescription: "Create a CTO agent that manages the engineering team.",
    });
    expect(section).toContain("Create a CTO agent that manages the engineering team.");
  });

  it("includes wake reason when present", () => {
    const section = buildIssueContextSection({
      issueTitle: "Deploy service",
      wakeReason: "issue_assigned",
    });
    expect(section).toContain("Wake reason: issue_assigned");
  });

  it("always includes execution instruction to prevent passive behaviour", () => {
    const section = buildIssueContextSection({
      issueTitle: "Any task",
    });
    expect(section).toContain("Do not just acknowledge");
    expect(section).toContain("take concrete action");
  });

  it("produces prompt that would guide agent to work on the actual issue", () => {
    const section = buildIssueContextSection({
      issueTitle: "Contratar agente CTO e delegar integração CFN/Navi/Paperclip",
      issueIdentifier: "PAP-100",
      issueDescription:
        "Criar um agente CTO que gerencie a equipe de engenharia e delegue a integração entre os serviços CFN, Navi e Paperclip.",
      wakeReason: "issue_assigned",
    });
    // Must include the operational context
    expect(section).toContain("PAP-100");
    expect(section).toContain("Contratar agente CTO");
    expect(section).toContain("CFN, Navi e Paperclip");
    expect(section).toContain("issue_assigned");
    // Must NOT be the generic fallback
    expect(section).not.toContain("Continue your Paperclip work");
  });
});
