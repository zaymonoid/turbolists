import { LitElement, html, css } from "lit";
import { customElement } from "lit/decorators.js";
import { fromStore } from "@zaymonoid/katha/lit";
import { store } from "../store/index.ts";
import type { AppState } from "../store/state.ts";
import { newFacetId } from "../ids.ts";
import { newItemId } from "../ids.ts";
import type { Facet } from "@turbolists/core/facet";
import type { Item } from "@turbolists/core/item";
import { facetUsage } from "@turbolists/core/views";

@customElement("facets-view")
export class FacetsView extends LitElement {
  static styles = css`
    :host {
      display: flex;
      flex-direction: column;
      flex: 1;
      position: relative;
    }

    /* ---- Screen header ---- */
    .screen-header {
      padding: 20px 20px 16px;
      border-bottom: 1px solid var(--line, #2a2e26);
    }
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

    /* ---- Facet list item ---- */
    .facet-list-item {
      margin: 0 16px 8px;
      padding: 14px 16px;
      background: var(--panel, #161814);
      border: 1px solid var(--line, #2a2e26);
      border-radius: 4px;
      border-left: 3px solid var(--accent-dim, #7a8f1f);
      position: relative;
    }
    .facet-list-item.featured {
      border-left-color: var(--accent, #d4ff3a);
    }
    .facet-list-name {
      font-family: var(--font-display, 'Archivo', sans-serif);
      font-weight: 700;
      font-size: 15px;
      margin-bottom: 4px;
      letter-spacing: -0.01em;
    }
    .facet-list-meta {
      font-family: var(--font-mono, 'JetBrains Mono', monospace);
      font-size: 9px;
      color: var(--ink-dim, #8a8c82);
      text-transform: uppercase;
      letter-spacing: 0.1em;
      display: flex;
      gap: 12px;
    }
    .facet-list-meta .dot { color: var(--ink-faint, #555852); }
    .facet-list-meta .used { color: var(--accent, #d4ff3a); }

    .delete-btn {
      position: absolute;
      top: 8px;
      right: 8px;
      background: none;
      border: none;
      cursor: pointer;
      color: var(--ink-faint, #555852);
      font-size: 16px;
      padding: 4px 8px;
      font-family: var(--font-display);
    }
    .delete-btn:hover { color: var(--warn, #ff7a3a); }

    /* ---- Expanded facet body ---- */
    .facet-body {
      margin: 10px -16px 0;
      padding: 10px 16px 0;
      border-top: 1px solid var(--line, #2a2e26);
    }

    .chips {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-bottom: 10px;
    }
    .chip {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 3px 8px;
      border: 1px solid var(--line-bright, #3a3f35);
      border-radius: 2px;
      font-family: var(--font-mono, 'JetBrains Mono', monospace);
      font-size: 9px;
      color: var(--ink, #e8e6df);
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    .chip button {
      background: none;
      border: none;
      cursor: pointer;
      font-size: 12px;
      padding: 0;
      color: var(--ink-faint, #555852);
      line-height: 1;
    }
    .chip button:hover { color: var(--warn, #ff7a3a); }

    /* ---- Item search ---- */
    .item-search {
      position: relative;
    }
    .item-search input {
      width: 100%;
      padding: 8px 12px;
      background: var(--bg, #0e0f0c);
      border: 1px solid var(--line, #2a2e26);
      border-radius: 4px;
      font-family: var(--font-mono, 'JetBrains Mono', monospace);
      font-size: 11px;
      color: var(--ink, #e8e6df);
      outline: none;
    }
    .item-search input::placeholder { color: var(--ink-faint, #555852); }
    .item-search input:focus { border-color: var(--accent, #d4ff3a); }

    .suggestions {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: var(--panel-2, #1d201b);
      border: 1px solid var(--line, #2a2e26);
      border-top: none;
      border-radius: 0 0 4px 4px;
      max-height: 180px;
      overflow-y: auto;
      z-index: 10;
    }
    .suggestion {
      padding: 10px 12px;
      cursor: pointer;
      font-family: var(--font-display, 'Archivo', sans-serif);
      font-size: 13px;
      font-weight: 500;
      color: var(--ink, #e8e6df);
      border-top: 1px solid var(--line, #2a2e26);
    }
    .suggestion:first-child { border-top: none; }
    .suggestion:hover, .suggestion.active {
      background: var(--panel, #161814);
      border-left: 2px solid var(--accent, #d4ff3a);
      padding-left: 10px;
    }
    .suggestion.create {
      font-family: var(--font-mono, 'JetBrains Mono', monospace);
      font-size: 11px;
      color: var(--ink, #e8e6df);
      background: var(--panel, #161814);
      border-top: 1px solid var(--line, #2a2e26);
    }
    .suggestion.create strong {
      color: var(--accent, #d4ff3a);
      font-weight: 700;
    }

    .empty {
      color: var(--ink-faint, #555852);
      font-family: var(--font-mono, 'JetBrains Mono', monospace);
      font-size: 11px;
      text-align: center;
      padding: 40px 20px;
    }
  `;

  private facets = fromStore(this, store, (s: AppState) => s.data.facets);
  private items = fromStore(this, store, (s: AppState) => s.data.items);
  private usage = fromStore(this, store, (s: AppState) =>
    facetUsage(s.data.facets, s.data.trips),
  );

  private expandedFacetId: string | null = null;
  private searchState = new Map<string, { query: string; activeIndex: number }>();

  private handleAddFacet(e: SubmitEvent) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const input = form.querySelector("input") as HTMLInputElement;
    const name = input.value.trim();
    if (!name) return;
    store.put({ id: "facet/create", data: { id: newFacetId(), name } });
    input.value = "";
    input.focus();
  }

  private handleDeleteFacet(facet: Facet) {
    store.put({ id: "facet/delete", data: { id: facet.id } });
  }

  private handleRemoveItem(facet: Facet, itemId: string) {
    store.put({
      id: "facet/remove-item",
      data: { facetId: facet.id, itemId: itemId as any },
    });
  }

  private toggleExpand(facetId: string) {
    this.expandedFacetId = this.expandedFacetId === facetId ? null : facetId;
    this.requestUpdate();
  }

  private getSuggestions(facet: Facet, query: string): Array<Item | { create: string }> {
    const allItems = this.items.value;
    const existingIds = new Set(facet.itemIds);
    const q = query.toLowerCase();

    const matches = allItems
      .filter((item) => !existingIds.has(item.id) && item.name.toLowerCase().includes(q))
      .slice(0, 8);

    if (q && !allItems.some((item) => item.name.toLowerCase() === q)) {
      return [...matches, { create: query }];
    }
    return matches;
  }

  private handleSearchInput(facet: Facet, e: Event) {
    const input = e.target as HTMLInputElement;
    const query = input.value;
    this.searchState.set(facet.id, { query, activeIndex: 0 });
    this.requestUpdate();
  }

  private handleSearchKeydown(facet: Facet, e: KeyboardEvent) {
    const state = this.searchState.get(facet.id);
    if (!state || !state.query) return;

    const suggestions = this.getSuggestions(facet, state.query);
    if (suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      state.activeIndex = Math.min(state.activeIndex + 1, suggestions.length - 1);
      this.requestUpdate();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      state.activeIndex = Math.max(state.activeIndex - 1, 0);
      this.requestUpdate();
    } else if (e.key === "Enter") {
      e.preventDefault();
      const selected = suggestions[state.activeIndex];
      if (selected) this.selectSuggestion(facet, selected, e.target as HTMLInputElement);
    } else if (e.key === "Escape") {
      this.searchState.delete(facet.id);
      (e.target as HTMLInputElement).value = "";
      this.requestUpdate();
    }
  }

  private selectSuggestion(
    facet: Facet,
    suggestion: Item | { create: string },
    input: HTMLInputElement,
  ) {
    if ("create" in suggestion) {
      const id = newItemId();
      store.put({ id: "item/create", data: { id, name: suggestion.create } });
      store.put({ id: "facet/add-item", data: { facetId: facet.id, itemId: id } });
    } else {
      store.put({
        id: "facet/add-item",
        data: { facetId: facet.id, itemId: suggestion.id },
      });
    }
    input.value = "";
    this.searchState.delete(facet.id);
    this.requestUpdate();
    input.focus();
  }

  private resolveItemName(itemId: string): string {
    const item = this.items.value.find((i) => i.id === itemId);
    return item ? item.name : "(deleted)";
  }

  render() {
    const facets = this.facets.value;
    const usage = this.usage.value;

    return html`
      <div class="screen-header">
        <div class="screen-title">Facets</div>
        <div class="screen-sub">The composable units</div>
      </div>
      <div class="screen-body">
        <form class="add-form" @submit=${this.handleAddFacet}>
          <input type="text" placeholder="New facet name..." />
          <button type="submit">Add</button>
        </form>

        ${facets.length === 0
          ? html`<p class="empty">No facets yet. Add one above.</p>`
          : facets.map((facet) => {
              const itemCount = facet.itemIds.length;
              const tripCount = usage.get(facet.id) ?? 0;
              const expanded = this.expandedFacetId === facet.id;
              const searchQuery = this.searchState.get(facet.id)?.query ?? "";
              const activeIndex = this.searchState.get(facet.id)?.activeIndex ?? 0;
              const suggestions = searchQuery ? this.getSuggestions(facet, searchQuery) : [];

              return html`
                <div
                  class="facet-list-item ${itemCount > 5 ? "featured" : ""}"
                  @click=${() => this.toggleExpand(facet.id)}
                >
                  <div class="facet-list-name">${facet.name}</div>
                  <div class="facet-list-meta">
                    <span>${itemCount} ITEM${itemCount !== 1 ? "S" : ""}</span>
                    <span class="dot">\u00b7</span>
                    <span class="used">USED ${tripCount}\u00d7</span>
                  </div>
                  <button
                    class="delete-btn"
                    @click=${(e: Event) => {
                      e.stopPropagation();
                      this.handleDeleteFacet(facet);
                    }}
                  >&times;</button>

                  ${expanded
                    ? html`
                      <div class="facet-body" @click=${(e: Event) => e.stopPropagation()}>
                        <div class="chips">
                          ${facet.itemIds.map(
                            (itemId) => html`
                              <span class="chip">
                                ${this.resolveItemName(itemId)}
                                <button @click=${() => this.handleRemoveItem(facet, itemId)}>&times;</button>
                              </span>
                            `,
                          )}
                        </div>
                        <div class="item-search">
                          <input
                            type="text"
                            placeholder="Add item..."
                            .value=${searchQuery}
                            @input=${(e: Event) => this.handleSearchInput(facet, e)}
                            @keydown=${(e: KeyboardEvent) => this.handleSearchKeydown(facet, e)}
                          />
                          ${suggestions.length > 0
                            ? html`
                              <div class="suggestions">
                                ${suggestions.map((s, i) =>
                                  "create" in s
                                    ? html`<div
                                        class="suggestion create ${i === activeIndex ? "active" : ""}"
                                        @click=${() => {
                                          const input = this.renderRoot.querySelector(
                                            `.facet-list-item:nth-child(${facets.indexOf(facet) + 1}) .item-search input`,
                                          ) as HTMLInputElement;
                                          this.selectSuggestion(facet, s, input);
                                        }}
                                      >Create <strong>"${s.create}"</strong></div>`
                                    : html`<div
                                        class="suggestion ${i === activeIndex ? "active" : ""}"
                                        @click=${() => {
                                          const input = this.renderRoot.querySelector(
                                            `.facet-list-item:nth-child(${facets.indexOf(facet) + 1}) .item-search input`,
                                          ) as HTMLInputElement;
                                          this.selectSuggestion(facet, s, input);
                                        }}
                                      >${s.name}</div>`,
                                )}
                              </div>
                            `
                            : null}
                        </div>
                      </div>
                    `
                    : null}
                </div>
              `;
            })}
      </div>
    `;
  }
}
