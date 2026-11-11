import { repeat } from "lit/directives/repeat.js";
import { listMotion } from "./list-motion.ts";
import { css, html, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";
import { fromStore } from "@zaymonoid/katha/lit";
import { store } from "../store/index.ts";
import type { AppState } from "../store/state.ts";
import { newKitId, newItemId } from "../ids.ts";
import type { Kit } from "@turbolists/core/kit";
import type { Item } from "@turbolists/core/item";
import { kitUsage } from "@turbolists/core/views";
import { icon, showDialog, viewStyles } from "./ui.ts";

@customElement("kits-view")
export class KitsView extends LitElement {
  static styles = [
    viewStyles,
    css`
      .kit-body {
        border-top: 1px solid var(--line);
        padding: 18px;
      }
      .kit-body .search {
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
  private kits = fromStore(this, store, (s: AppState) => s.data.kits);
  private items = fromStore(this, store, (s: AppState) => s.data.items);
  private usage = fromStore(
    this,
    store,
    (s: AppState) => kitUsage(s.data.kits, s.data.trips),
  );
  @state()
  private expanded: string | null = null;
  @state()
  private query = "";
  @state()
  private kitQuery = "";

  private async add() {
    const name = await showDialog({
      title: "New kit",
      message:
        "A kit is a reusable group of items, like Essentials, Beach, or Cold weather.",
      value: this.kitQuery.trim(),
      placeholder: "e.g. Essentials",
      confirm: "Add",
    });
    if (!name) return;
    const id = newKitId();
    store.put({ id: "kit/create", data: { id, name } });
    this.kitQuery = "";
    this.expanded = id;
    this.query = "";
    await this.updateComplete;
    this.renderRoot
      .querySelector(`[data-kit-id="${id}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }
  private async useEssentials() {
    const id = newKitId();
    const essentials = [
      "Phone charger",
      "Toothbrush",
      "Toothpaste",
      "Underwear",
      "Socks",
      "ID & wallet",
    ];
    store.put({ id: "kit/create", data: { id, name: "Essentials" } });
    for (const name of essentials) {
      const existing = this.items.value.find(
        (item) =>
          item.name.trim().toLocaleLowerCase() === name.toLocaleLowerCase(),
      );
      const itemId = existing?.id ?? newItemId();
      if (!existing) {
        store.put({ id: "item/create", data: { id: itemId, name } });
      }
      store.put({ id: "kit/add-item", data: { kitId: id, itemId } });
    }
    this.expanded = id;
    this.query = "";
    await this.updateComplete;
    this.renderRoot
      .querySelector(`[data-kit-id="${id}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }
  private async rename(kit: Kit) {
    const name = await showDialog({ title: "Rename kit", value: kit.name });
    if (name) store.put({ id: "kit/rename", data: { id: kit.id, name } });
  }
  private async handleDelete(kit: Kit) {
    const count = this.usage.value.get(kit.id) ?? 0;
    const confirmed = await showDialog({
      title: `Delete “${kit.name}”?`,
      message: `Your items stay in the library.${
        count
          ? ` This kit will also be removed from ${count} trip${
            count === 1 ? "" : "s"
          }.`
          : ""
      }`,
      confirm: "Delete",
      destructive: true,
    });
    if (confirmed) store.put({ id: "kit/delete", data: { id: kit.id } });
  }
  private suggestions(kit: Kit) {
    const q = this.query.trim().toLocaleLowerCase();
    return this.items.value
      .filter(
        (i) =>
          !kit.itemIds.includes(i.id) &&
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
  private select(kit: Kit, item?: Item) {
    const name = this.query.trim();
    if (!item && !name) return;
    const id = item?.id ?? newItemId();
    if (!item) store.put({ id: "item/create", data: { id, name } });
    store.put({
      id: "kit/add-item",
      data: { kitId: kit.id, itemId: id },
    });
    this.query = "";
    // The event's owning kit is explicit; no positional DOM lookup is needed.
  }
  render() {
    const kits = this.kits.value;
    const search = this.kitQuery.trim().toLocaleLowerCase();
    const itemMap = new Map(this.items.value.map((item) => [item.id, item]));
    const matching = kits.filter(
      (kit) =>
        kit.name.toLocaleLowerCase().includes(search) ||
        kit.itemIds.some((id) =>
          itemMap.get(id)?.name.toLocaleLowerCase().includes(search)
        ),
    );
    return html`
      <header class="header">
        <div>
          <h1>Kits</h1>
          <p class="subtitle">Pack for every part of your trip.</p>
        </div>
        <button class="add-button" aria-label="New kit" @click=${this.add}>
          ${icon("plus")}
        </button>
      </header>
      <div class="body">
        ${kits.length
          ? html`
            <label class="search"
            >${icon("search")}<input
                            type="search"
                            aria-label="Search kits"
                            placeholder="Search kits or their items"
                            .value=${this.kitQuery}
                            @input=${(e: Event) => {
                              this.kitQuery =
                                (e.target as HTMLInputElement).value;
                            }}
                        /></label>
          `
          : null}
        ${kits.length && !matching.length
          ? html`
            <div class="empty">
              <h2>No kits found</h2>
              <p>Search by a kit name or an item it contains.</p>
              <button
                class="text-button"
                @click=${() => {
                  this.kitQuery = "";
                }}
              >
                            Clear search
                          </button>
            </div>
          `
          : null}
        ${!kits.length
          ? html`
            <div class="empty">
              <div class="empty-icon">${icon("kits")}</div>
              <h2>Build once. Pack again.</h2>
              <p>
                Group items into kits like Essentials or Beach. Combine them
                for a trip and we’ll handle the overlap.
              </p>
              <button class="primary" @click=${this.add}>
                ${icon("plus")} Create your first kit
              </button>
              <p class="hint" style="margin-top:24px;margin-bottom:4px">
                Want a head start?
              </p>
              <button class="text-button" @click=${this.useEssentials}>
                Start with 6 essentials
              </button>
            </div>
          `
          : repeat(matching, (kit) => kit.id, (kit) => {
            const expanded = this.expanded === kit.id;
            const count = this.usage.value.get(kit.id) ?? 0;
            const suggestions = this.suggestions(kit);
            const q = this.query.trim();
            const exactMatch = this.items.value.find(
              (i) =>
                i.name.trim().toLocaleLowerCase() === q.toLocaleLowerCase(),
            );
            return html`
              <section class="card" data-kit-id=${kit.id} ${listMotion()}>
                <button
                  class="card-main"
                  aria-expanded=${expanded}
                  @click=${() => {
                    this.expanded = expanded ? null : kit.id;
                    this.query = "";
                  }}
                >
                  <span class="card-title"
                    >${kit.name}${icon(
                      expanded ? "close" : "chevron",
                    )}</span
                  >
                  <div class="meta">
                    ${kit.itemIds.length}
                    item${kit.itemIds.length === 1 ? "" : "s"} ·
                    ${count
                      ? `Used in ${count} trip${count === 1 ? "" : "s"}`
                      : "Ready for your next trip"}
                  </div>
                </button>
                ${expanded
                  ? html`
                    <div class="kit-body">
                      ${count
                        ? html`<p class="meta">Changes here update ${
                          count === 1
                            ? "the trip using this kit"
                            : `all ${count} trips using this kit`
                        }, including archived trips.</p>`
                        : null}
                      ${kit.itemIds.length
                        ? html`<div class="chips">
                                ${
                          kit.itemIds.map((id) => {
                            const name = this.items.value.find((i) =>
                              i.id === id
                            )
                              ?.name ?? "Missing item";
                            return html`
                              <span class="chip"
                              >${name}<button
                                  class="icon-button"
                                  aria-label=${`Remove ${name} from ${kit.name}`}
                                  @click=${() =>
                                    store.put({
                                      id: "kit/remove-item",
                                      data: {
                                        kitId: kit.id,
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
                          aria-label=${`Add item to ${kit.name}`}
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
                                this.select(kit, suggestions[0]);
                              } else if (q && !exactMatch) {
                                this.select(kit);
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
                              @click=${() => this.select(kit, item)}
                            >
                                                            ＋ ${item.name}
                                                          </button>
                          `,
                      )}
                      ${q && !exactMatch
                        ? html`
                          <button
                            class="suggestion create"
                            @click=${() => this.select(kit)}
                          >
                            ＋ Create “${q}”
                          </button>
                        `
                        : q &&
                            exactMatch &&
                            kit.itemIds.includes(exactMatch.id)
                        ? html`<p class="hint">Already in this kit.</p>`
                        : null}
                    </div>
                    <div class="toolbar">
                      <button
                        class="text-button"
                        @click=${() => this.rename(kit)}
                      >
                        Rename</button
                      ><button
                        class="icon-button danger"
                        aria-label=${`Delete ${kit.name}`}
                        @click=${() => this.handleDelete(kit)}
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
