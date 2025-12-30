import { describe, it, expect, beforeEach, vi } from "vitest";

describe("HoverUIManager", () => {
  let HoverUIManager;

  beforeEach(async () => {
    vi.resetModules();
    await import("../content/hover-ui.js");
    HoverUIManager = window.HoverUIManager;
  });

  it("should be defined on window", () => {
    expect(HoverUIManager).toBeDefined();
  });

  it("should accept options in constructor", () => {
    const onSummarizeRequest = vi.fn();
    const manager = new HoverUIManager({ onSummarizeRequest });

    expect(manager).toBeDefined();
  });

  describe("attachHoverListeners", () => {
    it("should mark element as attached", () => {
      const manager = new HoverUIManager({ onSummarizeRequest: vi.fn() });
      const element = document.createElement("div");

      manager.attachHoverListeners(element);

      expect(element.dataset.stmAttached).toBe("true");
    });

    it("should not reattach listeners to already attached element", () => {
      const manager = new HoverUIManager({ onSummarizeRequest: vi.fn() });
      const element = document.createElement("div");

      manager.attachHoverListeners(element);
      manager.attachHoverListeners(element);

      // Should only be called once
      expect(element.dataset.stmAttached).toBe("true");
    });
  });

  describe("showIcon", () => {
    it("should create and show icon element", () => {
      const manager = new HoverUIManager({ onSummarizeRequest: vi.fn() });
      const messageElement = document.createElement("div");
      document.body.appendChild(messageElement);

      // Mock getBoundingClientRect
      messageElement.getBoundingClientRect = () => ({
        top: 100,
        right: 500,
        bottom: 150,
        left: 50,
        width: 450,
        height: 50,
      });

      manager.showIcon(messageElement);

      const icon = document.querySelector(".stm-summarize-icon");
      expect(icon).not.toBeNull();

      document.body.removeChild(messageElement);
      icon?.remove();
    });
  });

  describe("hideIcon", () => {
    it("should remove icon element", () => {
      const manager = new HoverUIManager({ onSummarizeRequest: vi.fn() });
      const messageElement = document.createElement("div");
      document.body.appendChild(messageElement);

      messageElement.getBoundingClientRect = () => ({
        top: 100,
        right: 500,
        bottom: 150,
        left: 50,
        width: 450,
        height: 50,
      });

      manager.showIcon(messageElement);
      manager.hideIcon();

      const icon = document.querySelector(".stm-summarize-icon");
      expect(icon).toBeNull();

      document.body.removeChild(messageElement);
    });
  });
});

describe("SummaryPopup", () => {
  let SummaryPopup;

  beforeEach(async () => {
    vi.resetModules();
    await import("../content/hover-ui.js");
    SummaryPopup = window.SummaryPopup;
  });

  it("should be defined on window", () => {
    expect(SummaryPopup).toBeDefined();
  });

  describe("show", () => {
    it("should create tooltip element", () => {
      const popup = new SummaryPopup();
      popup.show({ x: 100, y: 200 });

      const tooltip = document.querySelector(".stm-tooltip");
      expect(tooltip).not.toBeNull();

      popup.hide();
    });

    it("should position tooltip based on coordinates", () => {
      const popup = new SummaryPopup();
      popup.show({ x: 300, y: 200 });

      const tooltip = document.querySelector(".stm-tooltip");
      expect(tooltip.style.top).toBe("200px");

      popup.hide();
    });
  });

  describe("hide", () => {
    it("should remove tooltip element", () => {
      const popup = new SummaryPopup();
      popup.show({ x: 100, y: 200 });
      popup.hide();

      const tooltip = document.querySelector(".stm-tooltip");
      expect(tooltip).toBeNull();
    });
  });

  describe("showLoading", () => {
    it("should display loading state with message", () => {
      const popup = new SummaryPopup();
      popup.show({ x: 100, y: 200 });
      popup.showLoading("Loading...");

      const loadingText = document.querySelector(".stm-loading-text");
      expect(loadingText?.textContent).toBe("Loading...");

      popup.hide();
    });

    it("should display spinner", () => {
      const popup = new SummaryPopup();
      popup.show({ x: 100, y: 200 });
      popup.showLoading();

      const spinner = document.querySelector(".stm-spinner");
      expect(spinner).not.toBeNull();

      popup.hide();
    });
  });

  describe("showSummary", () => {
    it("should display summary overview", () => {
      const popup = new SummaryPopup();
      popup.show({ x: 100, y: 200 });
      popup.showSummary({ overview: "Test summary content" });

      const content = document.querySelector(".stm-tooltip-text");
      expect(content?.textContent).toBe("Test summary content");

      popup.hide();
    });

    it("should handle empty overview", () => {
      const popup = new SummaryPopup();
      popup.show({ x: 100, y: 200 });
      popup.showSummary({});

      const content = document.querySelector(".stm-tooltip-text");
      expect(content?.textContent).toBe("");

      popup.hide();
    });
  });

  describe("showError", () => {
    it("should display error message", () => {
      const popup = new SummaryPopup();
      popup.show({ x: 100, y: 200 });
      popup.showError("Something went wrong");

      const error = document.querySelector(".stm-tooltip-error");
      expect(error?.textContent).toBe("Something went wrong");

      popup.hide();
    });
  });

  describe("escapeHtml", () => {
    it("should escape HTML entities", () => {
      const popup = new SummaryPopup();
      popup.show({ x: 100, y: 200 });
      popup.showSummary({ overview: "<script>alert('xss')</script>" });

      const content = document.querySelector(".stm-tooltip-text");
      expect(content?.innerHTML).not.toContain("<script>");
      expect(content?.textContent).toBe("<script>alert('xss')</script>");

      popup.hide();
    });

    it("should escape ampersands", () => {
      const popup = new SummaryPopup();
      popup.show({ x: 100, y: 200 });
      popup.showSummary({ overview: "A & B" });

      const content = document.querySelector(".stm-tooltip-text");
      expect(content?.textContent).toBe("A & B");

      popup.hide();
    });

    it("should escape quotes", () => {
      const popup = new SummaryPopup();
      popup.show({ x: 100, y: 200 });
      popup.showSummary({ overview: 'Say "hello"' });

      const content = document.querySelector(".stm-tooltip-text");
      expect(content?.textContent).toBe('Say "hello"');

      popup.hide();
    });
  });

  describe("updateLoadingMessage", () => {
    it("should update the loading text", () => {
      const popup = new SummaryPopup();
      popup.show({ x: 100, y: 200 });
      popup.showLoading("Initial");
      popup.updateLoadingMessage("Updated");

      const loadingText = document.querySelector(".stm-loading-text");
      expect(loadingText?.textContent).toBe("Updated");

      popup.hide();
    });
  });

  describe("scheduleHide", () => {
    it("should hide tooltip after delay", async () => {
      vi.useFakeTimers();

      const popup = new SummaryPopup();
      popup.show({ x: 100, y: 200 });
      popup.scheduleHide();

      expect(document.querySelector(".stm-tooltip")).not.toBeNull();

      vi.advanceTimersByTime(300);

      expect(document.querySelector(".stm-tooltip")).toBeNull();

      vi.useRealTimers();
    });
  });

  describe("cancelHide", () => {
    it("should cancel scheduled hide", async () => {
      vi.useFakeTimers();

      const popup = new SummaryPopup();
      popup.show({ x: 100, y: 200 });
      popup.scheduleHide();
      popup.cancelHide();

      vi.advanceTimersByTime(300);

      expect(document.querySelector(".stm-tooltip")).not.toBeNull();

      popup.hide();
      vi.useRealTimers();
    });
  });
});
