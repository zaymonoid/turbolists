import { LitElement, html, css, nothing } from "lit";
import { customElement } from "lit/decorators.js";
import { fromStore } from "@zaymonoid/katha/lit";
import { store } from "../store/index.ts";
import type { AppState } from "../store/state.ts";
import "./facets-view.ts";
import "./trips-view.ts";
import "./items-view.ts";

@customElement("app-shell")
export class AppShell extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100dvh;
      background: var(--bg, #0e0f0c);
    }

    /* Keeps content clear of the status bar / notch on iOS */
    .safe-top {
      height: env(safe-area-inset-top);
      flex-shrink: 0;
    }

    .screen-content {
      flex: 1;
      overflow-y: auto;
      display: flex;
      flex-direction: column;
    }

    /* ---- Tab bar ---- */
    .tab-bar {
      height: calc(64px + env(safe-area-inset-bottom));
      padding-bottom: env(safe-area-inset-bottom);
      border-top: 1px solid var(--line, #2a2e26);
      background: var(--panel, #161814);
      display: flex;
      flex-shrink: 0;
    }

    .tab {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 4px;
      font-family: var(--font-mono, 'JetBrains Mono', monospace);
      font-size: 9px;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--ink-faint, #555852);
      position: relative;
      padding-top: 6px;
      cursor: pointer;
      border: none;
      background: none;
      -webkit-tap-highlight-color: transparent;
    }

    .tab.active {
      color: var(--accent, #d4ff3a);
    }

    .tab.active::before {
      content: '';
      position: absolute;
      top: 0;
      left: 30%;
      right: 30%;
      height: 1px;
      background: var(--accent, #d4ff3a);
    }

    /* Tab icons */
    .tab-icon {
      width: 18px;
      height: 18px;
      position: relative;
    }

    .tab-icon.trips {
      border: 1.5px solid currentColor;
    }
    .tab-icon.trips::after {
      content: '';
      position: absolute;
      top: 3px; left: 3px; right: 3px;
      height: 2px;
      background: currentColor;
      box-shadow: 0 4px 0 currentColor, 0 8px 0 currentColor;
    }

    .tab-icon.facets {
      border: none;
      height: 14px;
      background:
        linear-gradient(currentColor, currentColor) 0 0 / 100% 1.5px no-repeat,
        linear-gradient(currentColor, currentColor) 0 50% / 100% 1.5px no-repeat,
        linear-gradient(currentColor, currentColor) 0 100% / 100% 1.5px no-repeat;
    }

    .tab-icon.items {
      border: none;
      background:
        linear-gradient(currentColor, currentColor) 0 0 / 7px 7px no-repeat,
        linear-gradient(currentColor, currentColor) 11px 0 / 7px 7px no-repeat,
        linear-gradient(currentColor, currentColor) 0 11px / 7px 7px no-repeat,
        linear-gradient(currentColor, currentColor) 11px 11px / 7px 7px no-repeat;
    }
  `;

  private view = fromStore(this, store, (s: AppState) => s.view);

  private setView(view: AppState["view"]) {
    store.put({ id: "nav/set-view", data: { view } });
  }

  render() {
    const v = this.view.value;
    return html`
      <div class="safe-top"></div>
      <div class="screen-content">
        ${v === "trips" ? html`<trips-view></trips-view>` : nothing}
        ${v === "facets" ? html`<facets-view></facets-view>` : nothing}
        ${v === "items" ? html`<items-view></items-view>` : nothing}
      </div>
      <div class="tab-bar">
        <button class="tab ${v === "trips" ? "active" : ""}" @click=${() => this.setView("trips")}>
          <div class="tab-icon trips"></div>
          Trips
        </button>
        <button class="tab ${v === "facets" ? "active" : ""}" @click=${() => this.setView("facets")}>
          <div class="tab-icon facets"></div>
          Facets
        </button>
        <button class="tab ${v === "items" ? "active" : ""}" @click=${() => this.setView("items")}>
          <div class="tab-icon items"></div>
          Items
        </button>
      </div>
    `;
  }
}
