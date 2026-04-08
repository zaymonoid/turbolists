import { LitElement, html, css } from "lit";
import { customElement } from "lit/decorators.js";
import { fromStore } from "@zaymonoid/katha/lit";
import { store } from "../store/index.ts";
import type { AppState } from "../store/state.ts";
import { newItemId } from "../ids.ts";
import type { Item } from "@turbolists/core/item";
import { itemUsage } from "@turbolists/core/views";

@customElement("items-view")
export class ItemsView extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      flex: 1;
      position: relative;
    }

    /* ---- Screen header ---- */
    .screen-header {
      padding: 8px 20px 16px;
      border-bottom: 1px solid var(--line, #2a2e26);
    }
    .screen-eyebrow {
      font-family: var(--font-mono, 'JetBrains Mono', monospace);
      font-size: 9px;
      color: var(--ink-dim, #8a8c82);
      text-transform: uppercase;
      letter-spacing: 0.15em;
      margin-bottom: 6px;
      display: flex;
      justify-content: space-between;
    }
    .screen-eyebrow .accent { color: var(--accent, #d4ff3a); }
    .screen-title {
      font-family: var(--font-display, 'Archivo', sans-serif);
      font-weight: 900;
      font-size: 28px;
      letter-spacing: -0.02em;
      line-height: 1;
      margin-bottom: 8px;
    }
    .screen-sub {
      font-family: var(--font-mono, 'JetBrains Mono', monospace);
      font-size: 10px;
      color: var(--ink-dim, #8a8c82);
      letter-spacing: 0.05em;
    }

    /* ---- Screen body ---- */
    .screen-body {
      flex: 1;
      overflow-y: auto;
      padding: 14px 0 80px;
    }

    /* ---- Add form ---- */
    .add-form {
      margin: 0 16px 12px;
      display: flex;
      gap: 8px;
    }
    .add-form input {
      flex: 1;
      padding: 10px 14px;
      background: var(--panel, #161814);
      border: 1px solid var(--line, #2a2e26);
      border-radius: 4px;
      font-family: var(--font-mono, 'JetBrains Mono', monospace);
      font-size: 12px;
      color: var(--ink, #e8e6df);
      outline: none;
    }
    .add-form input::placeholder { color: var(--ink-faint, #555852); }
    .add-form input:focus { border-color: var(--accent, #d4ff3a); }
    .add-form button {
      padding: 10px 16px;
      background: var(--accent, #d4ff3a);
      color: var(--bg, #0e0f0c);
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-family: var(--font-mono, 'JetBrains Mono', monospace);
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.1em;
    }

    /* ---- Item rows ---- */
    .item-row {
      margin: 0 16px 8px;
      padding: 12px 16px;
      background: var(--panel, #161814);
      border: 1px solid var(--line, #2a2e26);
      border-radius: 4px;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .item-name {
      font-family: var(--font-display, 'Archivo', sans-serif);
      font-weight: 500;
      font-size: 14px;
      flex: 1;
    }
    .item-badge {
      font-family: var(--font-mono, 'JetBrains Mono', monospace);
      font-size: 9px;
      color: var(--accent, #d4ff3a);
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    .item-badge.unused {
      color: var(--ink-faint, #555852);
    }
    .delete-btn {
      background: none;
      border: none;
      cursor: pointer;
      color: var(--ink-faint, #555852);
      font-size: 16px;
      padding: 4px 8px;
      font-family: var(--font-display);
    }
    .delete-btn:hover { color: var(--warn, #ff7a3a); }
    .delete-btn:disabled {
      opacity: 0.3;
      cursor: not-allowed;
    }
    .delete-btn:disabled:hover { color: var(--ink-faint, #555852); }

    .empty {
      color: var(--ink-faint, #555852);
      font-family: var(--font-mono, 'JetBrains Mono', monospace);
      font-size: 11px;
      text-align: center;
      padding: 40px 20px;
    }
  `;

  private items = fromStore(this, store, (s: AppState) => s.data.items);
  private usage = fromStore(this, store, (s: AppState) =>
    itemUsage(s.data.items, s.data.facets),
  );

  private handleAdd(e: SubmitEvent) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const input = form.querySelector("input") as HTMLInputElement;
    const name = input.value.trim();
    if (!name) return;
    store.put({ id: "item/create", data: { id: newItemId(), name } });
    input.value = "";
    input.focus();
  }

  private handleDelete(item: Item) {
    store.put({ id: "item/delete", data: { id: item.id } });
  }

  render() {
    const items = this.items.value;
    const usage = this.usage.value;

    return html`
      <div class="screen-header">
        <div class="screen-eyebrow">
          <span>SECTION 03</span>
          <span class="accent">${items.length} ITEM${items.length !== 1 ? "S" : ""}</span>
        </div>
        <div class="screen-title">Items</div>
        <div class="screen-sub">The atomic units</div>
      </div>
      <div class="screen-body">
        <form class="add-form" @submit=${this.handleAdd}>
          <input type="text" placeholder="New item name..." />
          <button type="submit">Add</button>
        </form>

        ${items.length === 0
          ? html`<p class="empty">No items yet. Add one above.</p>`
          : items.map((item) => {
              const refs = usage.get(item.id);
              const refCount = refs ? refs.size : 0;
              return html`
                <div class="item-row">
                  <span class="item-name">${item.name}</span>
                  <span class="item-badge ${refCount === 0 ? "unused" : ""}">
                    ${refCount} FACET${refCount !== 1 ? "S" : ""}
                  </span>
                  <button
                    class="delete-btn"
                    title=${refCount > 0 ? "Remove from facets first" : "Delete"}
                    ?disabled=${refCount > 0}
                    @click=${() => this.handleDelete(item)}
                  >&times;</button>
                </div>
              `;
            })}
      </div>
    `;
  }
}
