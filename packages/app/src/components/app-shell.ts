import { css, html, LitElement, nothing } from "lit";
import { customElement } from "lit/decorators.js";
import { fromStore } from "@zaymonoid/katha/lit";
import { store } from "../store/index.ts";
import type { AppState } from "../store/state.ts";
import { icon } from "./ui.ts";
import "./kits-view.ts";
import "./trips-view.ts";
import "./items-view.ts";

@customElement("app-shell")
export class AppShell extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      height: 100dvh;
      background: var(--bg);
      padding-top: env(safe-area-inset-top);
    }
    * {
      box-sizing: border-box;
    }
    .content {
      flex: 1;
      min-height: 0;
      display: flex;
      flex-direction: column;
      width: 100%;
      max-width: 720px;
      margin: 0 auto;
      padding-left: env(safe-area-inset-left);
      padding-right: env(safe-area-inset-right);
    }
    nav {
      display: flex;
      flex-shrink: 0;
      padding: 6px max(12px, env(safe-area-inset-right))
        calc(8px + env(safe-area-inset-bottom))
        max(12px, env(safe-area-inset-left));
      border-top: 1px solid var(--line);
      background: var(--panel);
    }
    .tab {
      flex: 1;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 5px;
      min-height: 52px;
      font: 500 11px var(--font-display);
      color: var(--ink-dim);
      border: 0;
      border-radius: 13px;
      background: none;
      cursor: pointer;
      -webkit-tap-highlight-color: transparent;
    }
    .tab.active {
      color: var(--accent);
    }
    .tab svg {
      width: 25px;
      height: 25px;
    }
    .tab:focus-visible {
      outline: 2px solid var(--accent);
    }
    .undo-banner {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 4px 8px 4px 16px;
      margin: 8px max(18px, env(safe-area-inset-left));
      border: 1px solid var(--line);
      border-radius: 14px;
      background: var(--panel-2);
      font-size: 15px;
      flex-shrink: 0;
    }
    .undo-banner span {
      flex: 1;
    }
    .undo-banner button {
      min-width: 44px;
      min-height: 44px;
      padding: 8px;
      border: 0;
      background: none;
      color: var(--accent);
      font: 600 15px var(--font-display);
      cursor: pointer;
    }
    .undo-banner .dismiss {
      color: var(--ink-dim);
      display: grid;
      place-items: center;
    }
    .banner {
      padding: 12px 18px;
      color: var(--warn);
      background: var(--panel);
      font-size: 14px;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .banner span {
      flex: 1;
    }
    .banner button {
      background: none;
      color: var(--accent);
      border: 0;
      min-height: 44px;
      font: inherit;
    }
  `;
  private undo = fromStore(this, store, (s: AppState) => s.undo);
  private view = fromStore(this, store, (s: AppState) => s.view);
  private loadStatus = fromStore(this, store, (s: AppState) => s.loadStatus);
  private persistence = fromStore(this, store, (s: AppState) => s.persistence);
  private navigate = (event: Event) =>
    this.setView((event as CustomEvent).detail);
  connectedCallback() {
    super.connectedCallback();
    document.addEventListener("app-navigate", this.navigate);
  }
  disconnectedCallback() {
    super.disconnectedCallback();
    document.removeEventListener("app-navigate", this.navigate);
  }
  private setView(view: AppState["view"]) {
    store.put({ id: "nav/set-view", data: { view } });
  }
  render() {
    const v = this.view.value;
    if (this.loadStatus.value !== "ready") {
      return html`
        <div
          class="content"
          style="justify-content:center;align-items:center;padding:24px;text-align:center"
        >
          <h1>Turbolists</h1>
          ${this.loadStatus.value === "loading"
            ? html`<p role="status">Getting your lists ready…</p>`
            : html`<p role="alert">
                  We couldn’t open your saved lists. Try loading them again.
                </p>
                <button
                  class="tab active"
                  style="flex:0"
                  @click=${() =>
                    document.dispatchEvent(new Event("app-retry-load"))}
                >
                  Try again
                </button>`}
        </div>
      `;
    }
    return html`
      ${this.persistence.value === "error"
        ? html`
            <div class="banner" role="alert">
              <span>Your changes couldn’t be saved.</span
              ><button
                @click=${() =>
                  store.put({
                    id: "store/retry-save",
                    data: {},
                  })}
              >
                Retry
              </button>
            </div>
          `
        : nothing}
      <main class="content">
        ${v === "trips" ? html`<trips-view></trips-view>` : nothing}
        ${v === "kits" ? html`<kits-view></kits-view>` : nothing}
        ${v === "items" ? html`<items-view></items-view>` : nothing}
      </main>
      ${this.undo.value
        ? html`<div class="undo-banner">
            <span role="status">${this.undo.value.message}</span
            ><button @click=${() => store.put({ id: "store/undo", data: {} })}>
              Undo</button
            ><button
              class="dismiss"
              aria-label="Dismiss undo"
              @click=${() => store.put({ id: "store/dismiss-undo", data: {} })}
            >
              ${icon("close")}
            </button>
          </div>`
        : nothing}
      <nav aria-label="Main navigation">
        ${(["trips", "kits", "items"] as const).map(
          (tab) => html`
            <button
              class="tab ${v === tab ? "active" : ""}"
              aria-current=${v === tab ? "page" : nothing}
              @click=${() => this.setView(tab)}
            >
              ${icon(tab)}<span>${tab[0].toUpperCase() + tab.slice(1)}</span>
            </button>
          `,
        )}
      </nav>
    `;
  }
}
