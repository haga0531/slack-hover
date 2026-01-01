// Hover UI Manager for Slack Thread Summarizer

class HoverUIManager {
  constructor(options) {
    this.onSummarizeRequest = options.onSummarizeRequest;
    this.currentIcon = null;
    this.currentMessage = null;
  }

  attachHoverListeners(messageElement) {
    if (messageElement.dataset.stmAttached) return;
    messageElement.dataset.stmAttached = "true";

    messageElement.addEventListener("mouseenter", () => {
      this.showIcon(messageElement);
    });

    messageElement.addEventListener("mouseleave", (e) => {
      const relatedTarget = e.relatedTarget;
      if (relatedTarget && relatedTarget.closest(".stm-summarize-icon")) {
        return;
      }
      this.hideIcon();
    });
  }

  showIcon(messageElement) {
    this.hideIcon();

    const icon = this.createSummarizeIcon(messageElement);
    const rect = messageElement.getBoundingClientRect();

    icon.style.position = "fixed";
    icon.style.top = `${rect.top + 8}px`;
    icon.style.left = `${rect.right - 53}px`;
    icon.style.opacity = "1";

    document.body.appendChild(icon);
    this.currentIcon = icon;
    this.currentMessage = messageElement;
  }

  hideIcon() {
    if (this.currentIcon) {
      this.currentIcon.remove();
      this.currentIcon = null;
      this.currentMessage = null;
    }
  }

  createSummarizeIcon(messageElement) {
    const button = document.createElement("button");
    button.className = "stm-summarize-icon";
    button.title = "Translate / Summarize";
    // Globe icon with language symbol for translation/summary
    button.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="2" y1="12" x2="22" y2="12"></line>
        <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
      </svg>
    `;

    button.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      this.onSummarizeRequest(messageElement);
    });

    button.addEventListener("mouseenter", () => {
      button.classList.add("stm-icon-hover");
    });

    button.addEventListener("mouseleave", () => {
      button.classList.remove("stm-icon-hover");
      this.hideIcon();
    });

    return button;
  }
}

// Tooltip-style Summary Popup
class SummaryPopup {
  constructor() {
    this.container = null;
    this.hideTimeout = null;
  }

  show(position) {
    this.hide();
    this.createContainer();
    this.setPosition(position);
    this.showLoading();
    document.body.appendChild(this.container);
  }

  createContainer() {
    this.container = document.createElement("div");
    this.container.className = "stm-tooltip";

    // Hover management - stay open while hovering tooltip
    this.container.addEventListener("mouseenter", () => {
      this.cancelHide();
    });

    this.container.addEventListener("mouseleave", () => {
      this.scheduleHide();
    });

    // Close on escape key
    this.escapeHandler = (e) => {
      if (e.key === "Escape") {
        this.hide();
      }
    };
    document.addEventListener("keydown", this.escapeHandler);
  }

  setPosition(position) {
    if (!this.container) return;

    const { x, y } = position;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const tooltipWidth = 500;
    const padding = 20;

    // Center the tooltip horizontally, but keep within viewport
    let left = x - tooltipWidth / 2;
    let top = y;

    // Keep within viewport with padding
    if (left + tooltipWidth + padding > viewportWidth) {
      left = viewportWidth - tooltipWidth - padding;
    }
    if (left < padding) {
      left = padding;
    }

    if (top + 200 > viewportHeight) {
      top = viewportHeight - 220;
    }

    this.container.style.left = `${left}px`;
    this.container.style.top = `${top}px`;
  }

  showLoading(message = "Loading...") {
    if (!this.container) return;
    this.container.innerHTML = `
      <div class="stm-tooltip-loading">
        <div class="stm-spinner"></div>
        <span class="stm-loading-text">${this.escapeHtml(message)}</span>
      </div>
    `;
  }

  updateLoadingMessage(message) {
    if (!this.container) return;
    const textEl = this.container.querySelector(".stm-loading-text");
    if (textEl) {
      textEl.textContent = message;
    }
  }

  showSummary(summary) {
    if (!this.container) return;
    const overview = summary.overview || "";
    this.container.innerHTML = `<div class="stm-tooltip-text">${this.escapeHtml(overview)}</div>`;
  }

  showError(message) {
    if (!this.container) return;
    this.container.innerHTML = `<div class="stm-tooltip-error">${this.escapeHtml(message)}</div>`;
  }

  scheduleHide() {
    this.cancelHide();
    this.hideTimeout = setTimeout(() => {
      this.hide();
    }, 300);
  }

  cancelHide() {
    if (this.hideTimeout) {
      clearTimeout(this.hideTimeout);
      this.hideTimeout = null;
    }
  }

  hide() {
    this.cancelHide();
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
    if (this.escapeHandler) {
      document.removeEventListener("keydown", this.escapeHandler);
      this.escapeHandler = null;
    }
  }

  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
}

window.HoverUIManager = HoverUIManager;
window.SummaryPopup = SummaryPopup;
