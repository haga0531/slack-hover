// Hover UI Manager for Slack Thread Summarizer

class HoverUIManager {
  constructor(options) {
    this.onSummarizeRequest = options.onSummarizeRequest;
  }

  // Attach hover listeners to a message element
  attachHoverListeners(messageElement) {
    // Skip if already attached
    if (messageElement.dataset.stmAttached) return;
    messageElement.dataset.stmAttached = "true";

    messageElement.addEventListener("mouseenter", () => {
      this.showIcon(messageElement);
    });

    messageElement.addEventListener("mouseleave", (e) => {
      // Don't hide if moving to the icon
      const relatedTarget = e.relatedTarget;
      if (relatedTarget && relatedTarget.closest(".stm-summarize-icon")) {
        return;
      }
      this.hideIcon(messageElement);
    });
  }

  // Show summarize icon on message
  showIcon(messageElement) {
    // Check if icon already exists
    if (messageElement.querySelector(".stm-summarize-icon")) return;

    const icon = this.createSummarizeIcon(messageElement);
    messageElement.style.position = "relative";
    messageElement.appendChild(icon);
  }

  // Hide summarize icon
  hideIcon(messageElement) {
    const icon = messageElement.querySelector(".stm-summarize-icon");
    if (icon) {
      icon.remove();
    }
  }

  // Create the summarize icon button
  createSummarizeIcon(messageElement) {
    const button = document.createElement("button");
    button.className = "stm-summarize-icon";
    button.title = "Summarize this thread";
    button.innerHTML = this.getSvgIcon();

    button.addEventListener("click", (e) => {
      e.stopPropagation();
      e.preventDefault();
      this.onSummarizeRequest(messageElement);
    });

    // Keep icon visible while hovering over it
    button.addEventListener("mouseenter", () => {
      button.classList.add("stm-icon-hover");
    });

    button.addEventListener("mouseleave", () => {
      button.classList.remove("stm-icon-hover");
      this.hideIcon(messageElement);
    });

    return button;
  }

  // SVG icon for summarize button
  getSvgIcon() {
    return `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        <polyline points="14 2 14 8 20 8"></polyline>
        <line x1="16" y1="13" x2="8" y2="13"></line>
        <line x1="16" y1="17" x2="8" y2="17"></line>
        <polyline points="10 9 9 9 8 9"></polyline>
      </svg>
    `;
  }
}

// Summary Popup UI
class SummaryPopup {
  constructor() {
    this.container = null;
  }

  // Show popup at position
  show(position) {
    this.hide(); // Remove any existing popup
    this.createContainer();
    this.setPosition(position);
    this.showLoading();
    document.body.appendChild(this.container);
  }

  // Create popup container
  createContainer() {
    this.container = document.createElement("div");
    this.container.className = "stm-popup-container";

    // Close on click outside
    document.addEventListener("click", this.handleOutsideClick.bind(this), {
      once: true,
    });

    // Close on escape key
    document.addEventListener("keydown", this.handleEscapeKey.bind(this));
  }

  handleOutsideClick(e) {
    if (this.container && !this.container.contains(e.target)) {
      this.hide();
    }
  }

  handleEscapeKey(e) {
    if (e.key === "Escape") {
      this.hide();
    }
  }

  // Set popup position
  setPosition(position) {
    if (!this.container) return;

    const { x, y } = position;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Default position to the right of the element
    let left = x + 10;
    let top = y;

    // Adjust if would go off screen
    if (left + 400 > viewportWidth) {
      left = x - 410;
    }

    if (top + 300 > viewportHeight) {
      top = viewportHeight - 320;
    }

    this.container.style.left = `${left}px`;
    this.container.style.top = `${top}px`;
  }

  // Show loading state
  showLoading() {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="stm-popup-content">
        <div class="stm-popup-header">
          <span>Thread Summary</span>
          <button class="stm-popup-close" onclick="this.closest('.stm-popup-container').remove()">&times;</button>
        </div>
        <div class="stm-popup-body stm-loading">
          <div class="stm-spinner"></div>
          <span>Summarizing thread...</span>
        </div>
      </div>
    `;
  }

  // Show summary result
  showSummary(summary) {
    if (!this.container) return;

    const { title, overview, decisions, todos, blockers, techNotes } = summary;

    let html = `
      <div class="stm-popup-content">
        <div class="stm-popup-header">
          <span>${this.escapeHtml(title)}</span>
          <button class="stm-popup-close" onclick="this.closest('.stm-popup-container').remove()">&times;</button>
        </div>
        <div class="stm-popup-body">
          <div class="stm-section">
            <h4>Overview</h4>
            <p>${this.escapeHtml(overview)}</p>
          </div>
    `;

    if (decisions && decisions.length > 0) {
      html += `
        <div class="stm-section">
          <h4>Decisions</h4>
          <ul>${decisions.map((d) => `<li>${this.escapeHtml(d)}</li>`).join("")}</ul>
        </div>
      `;
    }

    if (todos && todos.length > 0) {
      html += `
        <div class="stm-section">
          <h4>TODOs</h4>
          <ul>${todos.map((t) => `<li>${this.escapeHtml(t.text)}${t.assignee ? ` (${t.assignee})` : ""}</li>`).join("")}</ul>
        </div>
      `;
    }

    if (blockers && blockers.length > 0) {
      html += `
        <div class="stm-section stm-blockers">
          <h4>Blockers</h4>
          <ul>${blockers.map((b) => `<li>${this.escapeHtml(b)}</li>`).join("")}</ul>
        </div>
      `;
    }

    if (techNotes && techNotes.length > 0) {
      html += `
        <div class="stm-section">
          <h4>Technical Notes</h4>
          <ul>${techNotes.map((n) => `<li>${this.escapeHtml(n)}</li>`).join("")}</ul>
        </div>
      `;
    }

    html += `
        </div>
      </div>
    `;

    this.container.innerHTML = html;
  }

  // Show error message
  showError(message) {
    if (!this.container) return;

    this.container.innerHTML = `
      <div class="stm-popup-content">
        <div class="stm-popup-header stm-error-header">
          <span>Error</span>
          <button class="stm-popup-close" onclick="this.closest('.stm-popup-container').remove()">&times;</button>
        </div>
        <div class="stm-popup-body stm-error-body">
          <div class="stm-error-icon">!</div>
          <p>${this.escapeHtml(message)}</p>
          <button class="stm-retry-button" onclick="window.STMController?.retryLastRequest()">Retry</button>
        </div>
      </div>
    `;
  }

  // Hide popup
  hide() {
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
    document.removeEventListener("keydown", this.handleEscapeKey);
  }

  // Escape HTML to prevent XSS
  escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
  }
}

// Make available globally
window.HoverUIManager = HoverUIManager;
window.SummaryPopup = SummaryPopup;
