import { repeat } from "lit/directives/repeat.js";
import { listMotion } from "./list-motion.ts";
import { html, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";
import { fromStore } from "@zaymonoid/katha/lit";
import { store } from "../store/index.ts";
import type { AppState } from "../store/state.ts";
import { newItemId } from "../ids.ts";
import type { Item } from "@turbolists/core/item";
import { itemUsage } from "@turbolists/core/views";
import { icon, showDialog, viewStyles } from "./ui.ts";

@customElement("items-view")
export class ItemsView extends LitElement {
  static styles = viewStyles;
  private items = fromStore(this, store, (s: AppState) => s.data.items);
  private usage = fromStore(
    this,
    store,
    (s: AppState) => itemUsage(s.data.items, s.data.kits),
  );
  @state()
  private query = "";

  private async add() {
    const name = await showDialog({
      title: "New item",
      value: this.query.trim(),
      placeholder: "e.g. Phone charger",
      confirm: "Add",
    });
    if (!name) return;
    const id = newItemId();
    this.query = "";
    store.put({ id: "item/create", data: { id, name } });
    await this.updateComplete;
    this.renderRoot
      .querySelector(`[data-item-id="${id}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }
  private async rename(item: Item) {
    const name = await showDialog({ title: "Rename item", value: item.name });
    if (name) store.put({ id: "item/rename", data: { id: item.id, name } });
  }
  private async handleDelete(item: Item) {
    const count = this.usage.value.get(item.id)?.size ?? 0;
    const confirmed = await showDialog({
      title: `Delete “${item.name}”?`,
      message: count
        ? `This also removes it from ${count} kit${
          count === 1 ? "" : "s"
        } and all packing checklists.`
        : "This item will be removed from your library.",
      confirm: "Delete",
      destructive: true,
    });
    if (confirmed) store.put({ id: "item/delete", data: { id: item.id } });
  }
  render() {
    const items = this.items.value;
    const filtered = items.filter((item) =>
      item.name
        .toLocaleLowerCase()
        .includes(this.query.trim().toLocaleLowerCase())
    );
    return html`
      <header class="header">
        <div>
          <h1>Items</h1>
          <p class="subtitle">Your library of things to bring.</p>
        </div>
        <button class="add-button" aria-label="New item" @click=${this.add}>
          ${icon("plus")}
        </button>
      </header>
      <div class="body">
        ${items.length
          ? html`
            <label class="search"
            >${icon("search")}<input
                type="search"
                placeholder="Search items"
                aria-label="Search items"
                .value=${this.query}
                @input=${(e: Event) => {
                  this.query = (e.target as HTMLInputElement).value;
                }}
            /></label>
          `
          : null}
        ${!items.length
          ? html`
            <div class="empty">
              <div class="empty-icon">${icon("items")}</div>
              <h2>A place for everything</h2>
              <p>
                Add the things you pack. Reuse them across kits and trips
                without making duplicate lists.
              </p>
              <button class="primary" @click=${this.add}>
                ${icon("plus")} Add your first item
              </button>
            </div>
          `
          : !filtered.length
          ? html`
            <div class="empty">
              <h2>No matches</h2>
              <p>Try another name, or add a new item.</p>
              <button class="primary" @click=${this.add}>Add item</button>
            </div>
          `
          : html`
            <p class="section-label">
              ${filtered.length} item${filtered.length === 1 ? "" : "s"}
            </p>
            <div class="card">
              ${repeat(filtered, (item) => item.id, (item) => {
                const count = this.usage.value.get(item.id)?.size ?? 0;
                return html`
                  <div class="row" data-item-id=${item.id} ${listMotion()}>
                    <button
                      class="row-label"
                      aria-label=${`Rename ${item.name}`}
                      @click=${() => this.rename(item)}
                    >
                      <span class="name">${item.name}</span
                      ><span class="meta"
                        >${count
                          ? `In ${count} kit${count === 1 ? "" : "s"}`
                          : "Not in a kit yet"}</span
                      ></button
                    ><button
                      class="icon-button danger"
                      aria-label=${`Delete ${item.name}`}
                      @click=${() => this.handleDelete(item)}
                    >
                      ${icon("trash")}
                    </button>
                  </div>
                `;
              })}
            </div>
          `}
      </div>
    `;
  }
}
