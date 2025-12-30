import { describe, it, expect } from "vitest";
import {
  parseTargetLanguage,
  formatSummaryForSlack,
} from "../../../listeners/commands/helpers.js";

describe("parseTargetLanguage", () => {
  it("should parse 'ja' to Japanese", () => {
    expect(parseTargetLanguage("ja")).toBe("ja");
  });

  it("should parse 'japanese' to Japanese", () => {
    expect(parseTargetLanguage("japanese")).toBe("ja");
  });

  it("should parse 'en' to English", () => {
    expect(parseTargetLanguage("en")).toBe("en");
  });

  it("should parse 'english' to English", () => {
    expect(parseTargetLanguage("english")).toBe("en");
  });

  it("should parse 'zh' to Chinese", () => {
    expect(parseTargetLanguage("zh")).toBe("zh");
  });

  it("should parse 'chinese' to Chinese", () => {
    expect(parseTargetLanguage("chinese")).toBe("zh");
  });

  it("should parse 'ko' to Korean", () => {
    expect(parseTargetLanguage("ko")).toBe("ko");
  });

  it("should parse 'korean' to Korean", () => {
    expect(parseTargetLanguage("korean")).toBe("ko");
  });

  it("should parse 'es' to Spanish", () => {
    expect(parseTargetLanguage("es")).toBe("es");
  });

  it("should parse 'spanish' to Spanish", () => {
    expect(parseTargetLanguage("spanish")).toBe("es");
  });

  it("should parse 'fr' to French", () => {
    expect(parseTargetLanguage("fr")).toBe("fr");
  });

  it("should parse 'french' to French", () => {
    expect(parseTargetLanguage("french")).toBe("fr");
  });

  it("should parse 'de' to German", () => {
    expect(parseTargetLanguage("de")).toBe("de");
  });

  it("should parse 'german' to German", () => {
    expect(parseTargetLanguage("german")).toBe("de");
  });

  it("should be case-insensitive", () => {
    expect(parseTargetLanguage("JA")).toBe("ja");
    expect(parseTargetLanguage("ENGLISH")).toBe("en");
    expect(parseTargetLanguage("Japanese")).toBe("ja");
  });

  it("should trim whitespace", () => {
    expect(parseTargetLanguage("  ja  ")).toBe("ja");
    expect(parseTargetLanguage("\ten\n")).toBe("en");
  });

  it("should default to Japanese for unknown input", () => {
    expect(parseTargetLanguage("unknown")).toBe("ja");
    expect(parseTargetLanguage("")).toBe("ja");
    expect(parseTargetLanguage("xyz")).toBe("ja");
  });
});

describe("formatSummaryForSlack", () => {
  const baseSummary = {
    title: "Test Summary",
    overview: "This is a test overview",
    decisions: [],
    todos: [],
    blockers: [],
    techNotes: [],
  };

  it("should include header and overview blocks", () => {
    const blocks = formatSummaryForSlack(baseSummary);

    expect(blocks[0]).toEqual({
      type: "header",
      text: { type: "plain_text", text: "Test Summary" },
    });

    expect(blocks[1]).toEqual({
      type: "section",
      text: { type: "mrkdwn", text: "*Overview*\nThis is a test overview" },
    });
  });

  it("should include decisions when present", () => {
    const summary = {
      ...baseSummary,
      decisions: ["Decision 1", "Decision 2"],
    };

    const blocks = formatSummaryForSlack(summary);
    const decisionBlock = blocks.find(
      (b) =>
        b.type === "section" && b.text?.text?.includes("*Decisions*")
    );

    expect(decisionBlock).toBeDefined();
    expect(decisionBlock?.text?.text).toContain("• Decision 1");
    expect(decisionBlock?.text?.text).toContain("• Decision 2");
  });

  it("should include todos when present", () => {
    const summary = {
      ...baseSummary,
      todos: [
        { text: "Task 1" },
        { text: "Task 2", assignee: "U123" },
      ],
    };

    const blocks = formatSummaryForSlack(summary);
    const todoBlock = blocks.find(
      (b) => b.type === "section" && b.text?.text?.includes("*TODOs*")
    );

    expect(todoBlock).toBeDefined();
    expect(todoBlock?.text?.text).toContain("• Task 1");
    expect(todoBlock?.text?.text).toContain("• Task 2 (<@U123>)");
  });

  it("should include blockers when present", () => {
    const summary = {
      ...baseSummary,
      blockers: ["Blocker 1"],
    };

    const blocks = formatSummaryForSlack(summary);
    const blockerBlock = blocks.find(
      (b) => b.type === "section" && b.text?.text?.includes("*Blockers*")
    );

    expect(blockerBlock).toBeDefined();
    expect(blockerBlock?.text?.text).toContain("• Blocker 1");
  });

  it("should include tech notes when present", () => {
    const summary = {
      ...baseSummary,
      techNotes: ["Note 1", "Note 2"],
    };

    const blocks = formatSummaryForSlack(summary);
    const techBlock = blocks.find(
      (b) =>
        b.type === "section" && b.text?.text?.includes("*Technical Notes*")
    );

    expect(techBlock).toBeDefined();
    expect(techBlock?.text?.text).toContain("• Note 1");
    expect(techBlock?.text?.text).toContain("• Note 2");
  });

  it("should always include context block at the end", () => {
    const blocks = formatSummaryForSlack(baseSummary);
    const lastBlock = blocks[blocks.length - 1];

    expect(lastBlock.type).toBe("context");
    expect(lastBlock.elements?.[0].text).toContain(
      "Generated by Slack Thread Summarizer"
    );
  });

  it("should not include empty sections", () => {
    const blocks = formatSummaryForSlack(baseSummary);

    expect(
      blocks.find((b) => b.text?.text?.includes("*Decisions*"))
    ).toBeUndefined();
    expect(
      blocks.find((b) => b.text?.text?.includes("*TODOs*"))
    ).toBeUndefined();
    expect(
      blocks.find((b) => b.text?.text?.includes("*Blockers*"))
    ).toBeUndefined();
    expect(
      blocks.find((b) => b.text?.text?.includes("*Technical Notes*"))
    ).toBeUndefined();
  });
});
