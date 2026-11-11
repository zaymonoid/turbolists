import { repeat } from "lit/directives/repeat.js";
import { listMotion } from "./list-motion.ts";
import { css, html, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";
import { fromStore } from "@zaymonoid/katha/lit";
import { store } from "../store/index.ts";
import type { AppState } from "../store/state.ts";
import { newFacetId, newItemId } from "../ids.ts";
import type { Facet } from "@turbolists/core/facet";
import type { Item } from "@turbolists/core/item";
import { facetUsage } from "@turbolists/core/views";
import { icon, showDialog, viewStyles } from "./ui.ts";

@customElement("facets-view")
export class FacetsView extends LitElement {
  static styles = [
    viewStyles,
    css`
      .facet-body {
        border-top: 1px solid var(--line);
        padding: 18px;
      }
      .facet-body .search {
        margin: 16px 0 8px;
      }
      .chip {
        padding-right: 0;
        color: var(--ink);
      }
      .chip .icon-button {
        width: 40px;
        min-height: 40px;
      }
      .chip svg {
        width: 17px;
        height: 17px;
      }
      .suggestion {
        display: block;
        width: 100%;
        text-align: left;
        background: none;
        border: 0;
        border-top: 1px solid var(--line);
        min-height: 48px;
        padding: 12px 4px;
        font-size: 16px;
        overflow-wrap: anywhere;
      }
      .suggestion.create {
        color: var(--accent);
      }
      .hint {
        color: var(--ink-dim);
        font-size: 14px;
        line-height: 1.5;
        margin: 0;
      }
    `,
  ];
  private facets = fromStore(this, store, (s: AppState) => s.data.facets);
  private items = fromStore(this, store, (s: AppState) => s.data.items);
  private usage = fromStore(
    this,
    store,
    (s: AppState) => facetUsage(s.data.facets, s.data.trips),
  );
  @state()
  private expanded: string | null = null;
  @state()
  private query = "";
  @state()
  private facetQuery = "";

  private async add() {
    const name = await showDialog({
      title: "New facet",
      message:
        "A facet is a reusable group of items, like Essentials, Beach, or Cold weather.",
      value: this.facetQuery.trim(),
      placeholder: "e.g. Essentials",
      confirm: "Add",
    });
    if (!name) return;
    const id = newFacetId();
    store.put({ id: "facet/create", data: { id, name } });
    this.facetQuery = "";
    this.expanded = id;
    this.query = "";
    await this.updateComplete;
    this.renderRoot
      .querySelector(`[data-facet-id="${id}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }
  private async useEssentials() {
    const id = newFacetId();
    const essentials = [
      "Phone charger",
      "Toothbrush",
      "Toothpaste",
      "Underwear",
      "Socks",
      "ID & wallet",
    ];
    store.put({ id: "facet/create", data: { id, name: "Essentials" } });
    for (const name of essentials) {
      const existing = this.items.value.find(
        (item) =>
          item.name.trim().toLocaleLowerCase() === name.toLocaleLowerCase(),
      );
      const itemId = existing?.id ?? newItemId();
      if (!existing) {
        store.put({ id: "item/create", data: { id: itemId, name } });
      }
      store.put({ id: "facet/add-item", data: { facetId: id, itemId } });
    }
    this.expanded = id;
    this.query = "";
    await this.updateComplete;
    this.renderRoot
      .querySelector(`[data-facet-id="${id}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }
  private async rename(facet: Facet) {
    const name = await showDialog({ title: "Rename facet", value: facet.name });
    if (name) store.put({ id: "facet/rename", data: { id: facet.id, name } });
  }
  private async handleDelete(facet: Facet) {
    const count = this.usage.value.get(facet.id) ?? 0;
    const confirmed = await showDialog({
      title: `Delete “${facet.name}”?`,
      message: `Your items stay in the library.${
        count
          ? ` This facet will also be removed from ${count} trip${
            count === 1 ? "" : "s"
          }.`
          : ""
      }`,
      confirm: "Delete",
      destructive: true,
    });
    if (confirmed) store.put({ id: "facet/delete", data: { id: facet.id } });
  }
  private suggestions(facet: Facet) {
    const q = this.query.trim().toLocaleLowerCase();
    return this.items.value
      .filter(
        (i) =>
          !facet.itemIds.includes(i.id) &&
          i.name.toLocaleLowerCase().includes(q),
      )
      .sort((a, b) => {
        const rank = (name: string) => {
          const normalized = name.trim().toLocaleLowerCase();
          return normalized === q ? 0 : normalized.startsWith(q) ? 1 : 2;
        };
        return rank(a.name) - rank(b.name);
      })
      .slice(0, 8);
  }
  private select(facet: Facet, item?: Item) {
    const name = this.query.trim();
    if (!item && !name) return;
    const id = item?.id ?? newItemId();
    if (!item) store.put({ id: "item/create", data: { id, name } });
    store.put({
      id: "facet/add-item",
      data: { facetId: facet.id, itemId: id },
    });
    this.query = "";
    // The event's owning facet is explicit; no positional DOM lookup is needed.
  }
  render() {
    const facets = this.facets.value;
    const search = this.facetQuery.trim().toLocaleLowerCase();
    const itemMap = new Map(this.items.value.map((item) => [item.id, item]));
    const matching = facets.filter(
      (facet) =>
        facet.name.toLocaleLowerCase().includes(search) ||
        facet.itemIds.some((id) =>
          itemMap.get(id)?.name.toLocaleLowerCase().includes(search)
        ),
    );
    return html`
      <header class="header">
        <div>
          <h1>Facets</h1>
          <p class="subtitle">Pack for every part of your trip.</p>
        </div>
        <button class="add-button" aria-label="New facet" @click=${this.add}>
          ${icon("plus")}
        </button>
      </header>
      <div class="body">
        ${facets.length
          ? html`
            <label class="search"
            >${icon("search")}<input
                            type="search"
                            aria-label="Search facets"
                            placeholder="Search facets or their items"
                            .value=${this.facetQuery}
                            @input=${(e: Event) => {
                              this.facetQuery =
                                (e.target as HTMLInputElement).value;
                            }}
                        /></label>
          `
          : null}
        ${facets.length && !matching.length
          ? html`
            <div class="empty">
              <h2>No facets found</h2>
              <p>Search by a facet name or an item it contains.</p>
              <button
                class="text-button"
                @click=${() => {
                  this.facetQuery = "";
                }}
              >
                            Clear search
                          </button>
            </div>
          `
          : null}
        ${!facets.length
          ? html`
            <div class="empty">
              <div class="empty-icon">${icon("facets")}</div>
              <h2>Build once. Pack again.</h2>
              <p>
                Group items into facets like Essentials or Beach. Combine them
                for a trip and we’ll handle the overlap.
              </p>
              <button class="primary" @click=${this.add}>
                ${icon("plus")} Create your first facet
              </button>
              <p class="hint" style="margin-top:24px;margin-bottom:4px">
                Want a head start?
              </p>
              <button class="text-button" @click=${this.useEssentials}>
                Start with 6 essentials
              </button>
            </div>
          `
          : repeat(matching, (facet) => facet.id, (facet) => {
            const expanded = this.expanded === facet.id;
            const count = this.usage.value.get(facet.id) ?? 0;
            const suggestions = this.suggestions(facet);
            const q = this.query.trim();
            const exactMatch = this.items.value.find(
              (i) =>
                i.name.trim().toLocaleLowerCase() === q.toLocaleLowerCase(),
            );
            return html`
              <section class="card" data-facet-id=${facet.id} ${listMotion()}>
                <button
                  class="card-main"
                  aria-expanded=${expanded}
                  @click=${() => {
                    this.expanded = expanded ? null : facet.id;
                    this.query = "";
                  }}
                >
                  <span class="card-title"
                    >${facet.name}${icon(
                      expanded ? "close" : "chevron",
                    )}</span
                  >
                  <div class="meta">
                    ${facet.itemIds.length}
                    item${facet.itemIds.length === 1 ? "" : "s"} ·
                    ${count
                      ? `Used in ${count} trip${count === 1 ? "" : "s"}`
                      : "Ready for your next trip"}
                  </div>
                </button>
                ${expanded
                  ? html`
                    <div class="facet-body">
                      ${count
                        ? html`<p class="meta">Changes here update ${
                          count === 1
                            ? "the trip using this facet"
                            : `all ${count} trips using this facet`
                        }, including archived trips.</p>`
                        : null}
                      ${facet.itemIds.length
                        ? html`<div class="chips">
                                ${
                          facet.itemIds.map((id) => {
                            const name = this.items.value.find((i) =>
                              i.id === id
                            )
                              ?.name ?? "Missing item";
                            return html`
                              <span class="chip"
                              >${name}<button
                                  class="icon-button"
                                  aria-label=${`Remove ${name} from ${facet.name}`}
                                  @click=${() =>
                                    store.put({
                                      id: "facet/remove-item",
                                      data: {
                                        facetId: facet.id,
                                        itemId: id,
                                      },
                                    })}
                                >
                                  ${icon("close")}
                                </button></span>
                            `;
                          })
                        }
                              </div>`
                        : html`<p class="hint">
                                Add items from your library or create something
                                new below.
                              </p>`}
                      <label class="search"
                        >${icon("search")}<input
                          aria-label=${`Add item to ${facet.name}`}
                          placeholder="Find or create an item"
                          .value=${this.query}
                          @input=${(e: Event) => {
                            this.query = (
                              e.target as HTMLInputElement
                            ).value;
                          }}
                          @keydown=${(e: KeyboardEvent) => {
                            if (e.key === "Enter") {
                              e.preventDefault();
                              if (suggestions[0]) {
                                this.select(facet, suggestions[0]);
                              } else if (q && !exactMatch) {
                                this.select(facet);
                              }
                            }
                            if (e.key === "Escape") {
                              this.query = "";
                            }
                          }}
                          enterkeyhint="done"
                          autocomplete="off"
                          maxlength="120"
                      /></label>
                      ${suggestions.map(
                        (item) =>
                          html`
                            <button
                              class="suggestion"
                              @click=${() => this.select(facet, item)}
                            >
                                                            ＋ ${item.name}
                                                          </button>
                          `,
                      )}
                      ${q && !exactMatch
                        ? html`
                          <button
                            class="suggestion create"
                            @click=${() => this.select(facet)}
                          >
                            ＋ Create “${q}”
                          </button>
                        `
                        : q &&
                            exactMatch &&
                            facet.itemIds.includes(exactMatch.id)
                        ? html`<p class="hint">Already in this facet.</p>`
                        : null}
                    </div>
                    <div class="toolbar">
                      <button
                        class="text-button"
                        @click=${() => this.rename(facet)}
                      >
                        Rename</button
                      ><button
                        class="icon-button danger"
                        aria-label=${`Delete ${facet.name}`}
                        @click=${() => this.handleDelete(facet)}
                      >
                        ${icon("trash")}
                      </button>
                    </div>
                  `
                  : null}
              </section>
            `;
          })}
      </div>
    `;
  }
}
