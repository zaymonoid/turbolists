import { repeat } from "lit/directives/repeat.js";
import { listMotion } from "./list-motion.ts";
import { css, html, LitElement, type PropertyValues } from "lit";
import { customElement, state } from "lit/decorators.js";
import { fromStore } from "@zaymonoid/katha/lit";
import { store } from "../store/index.ts";
import type { AppState } from "../store/state.ts";
import { newItemId, newKitId } from "../ids.ts";
import type { Kit } from "@turbolists/core/kit";
import type { Item } from "@turbolists/core/item";
import type { ItemId, KitId } from "@turbolists/core/ids";
import { kitUsage } from "@turbolists/core/views";
import { icon, showDialog, viewStyles } from "./ui.ts";

const normalize = (name: string) => name.trim().toLocaleLowerCase();
const plural = (count: number, noun: string) =>
  `${count} ${noun}${count === 1 ? "" : "s"}`;

@customElement("kits-view")
export class KitsView extends LitElement {
  static styles = [
    viewStyles,
    css`
      .kit-row {
        display: flex;
        align-items: center;
        gap: 12px;
        width: 100%;
        min-height: 68px;
        padding: 14px 14px 14px 18px;
        border: 0;
        background: none;
        text-align: left;
      }
      .kit-row + .kit-row {
        border-top: 1px solid var(--line);
      }
      .kit-row > span:first-child {
        flex: 1;
        min-width: 0;
      }
      .kit-row .name {
        font-weight: 650;
      }
      .kit-row .meta {
        display: block;
        margin-top: 4px;
      }
      .kit-row .preview {
        display: block;
        margin-top: 2px;
        color: var(--ink-faint);
        font-size: 13px;
        line-height: 1.5;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .kit-row svg {
        color: var(--ink-dim);
        flex-shrink: 0;
      }
      .detail-header .meta {
        font-size: 15px;
        margin-top: 0;
      }
      .kit-items {
        /* Offset parent for the rows' layout positions while dragging. */
        position: relative;
      }
      .kit-items .row {
        min-height: 52px;
        padding: 4px 4px 4px 18px;
        gap: 0;
      }
      .kit-items .row.sortable {
        padding-left: 4px;
      }
      .kit-items .row.dragging {
        position: relative;
        z-index: 1;
        background: var(--panel-2);
      }
      .grip {
        display: grid;
        place-items: center;
        width: 44px;
        min-height: 44px;
        color: var(--ink-faint);
        cursor: grab;
        flex-shrink: 0;
        /* The handle owns its touches so a drag never scrolls the list. */
        touch-action: none;
        user-select: none;
        -webkit-user-select: none;
        -webkit-touch-callout: none;
      }
      .grip svg,
      .remove svg {
        width: 18px;
        height: 18px;
      }
      .remove {
        color: var(--ink-faint);
      }
      .kit-items .row + .add-row,
      .kit-items .hint + .add-row {
        border-top: 1px solid var(--line);
      }
      .item-label {
        flex: 1;
        min-width: 0;
        padding: 8px 0;
      }
      .add-row {
        display: flex;
        align-items: center;
        gap: 10px;
        padding: 0 18px;
        color: var(--accent);
      }
      .add-row input {
        flex: 1;
        min-width: 0;
        min-height: 52px;
        background: none;
        border: 0;
        color: var(--ink);
        font-size: 17px;
        outline: none;
      }
      .suggestion {
        display: block;
        width: 100%;
        text-align: left;
        background: none;
        border: 0;
        border-top: 1px solid var(--line);
        min-height: 48px;
        padding: 12px 18px;
        font-size: 16px;
        color: var(--ink-dim);
        background: var(--panel-2);
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
      .kit-items .hint {
        padding: 14px 18px;
      }
      .kit-items .add-row ~ .hint {
        background: var(--panel-2);
        border-top: 1px solid var(--line);
      }
    `,
  ];
  private kits = fromStore(this, store, (s: AppState) => s.data.kits);
  private items = fromStore(this, store, (s: AppState) => s.data.items);
  private selected = fromStore(this, store, (s: AppState) => s.selectedKitId);
  private usage = fromStore(
    this,
    store,
    (s: AppState) => kitUsage(s.data.kits, s.data.trips),
  );
  /** Text in the open kit's add-or-create field. */
  @state()
  private query = "";
  @state()
  private kitQuery = "";
  /** Focus the add field once a newly created kit's screen has rendered. */
  private focusAddField = false;
  /**
   * Live order while a row is dragged. After the drop it stays in place until
   * the store's order (`from`) is replaced, so rows never flash back.
   */
  @state()
  private reorder:
    | { id: ItemId | null; order: ItemId[]; from: readonly ItemId[] }
    | null = null;
  private endDrag: (() => void) | null = null;

  override disconnectedCallback() {
    this.endDrag?.();
    super.disconnectedCallback();
  }
  /** Rows swap slots as the pointer crosses the midpoint of a neighbour. */
  private startDrag(event: PointerEvent, kit: Kit, id: ItemId) {
    if (this.endDrag) return;
    event.preventDefault();
    const from = kit.itemIds;
    this.reorder = { id, order: [...from], from };
    const move = (e: PointerEvent) => {
      const card = this.renderRoot.querySelector<HTMLElement>(".kit-items");
      if (!card || !this.reorder) return;
      // Layout offsets ignore the transforms of rows that are mid-animation.
      const y = e.clientY - card.getBoundingClientRect().top;
      let index = 0;
      for (const row of card.querySelectorAll<HTMLElement>(".row")) {
        if (row.dataset.itemId === id) continue;
        if (y > row.offsetTop + row.offsetHeight / 2) index++;
      }
      const rest = this.reorder.order.filter((other) => other !== id);
      const order = [...rest.slice(0, index), id, ...rest.slice(index)];
      if (order.indexOf(id) !== this.reorder.order.indexOf(id)) {
        this.reorder = { id, order, from };
      }
    };
    const finish = (e?: Event) => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", finish);
      window.removeEventListener("pointercancel", finish);
      this.endDrag = null;
      const order = this.reorder?.order ?? [];
      const toIndex = order.indexOf(id);
      if (e?.type !== "pointerup" || toIndex === from.indexOf(id)) {
        this.reorder = null;
        return;
      }
      this.reorder = { id: null, order, from };
      store.put({
        id: "kit/move-item",
        data: { kitId: kit.id, itemId: id, toIndex },
      });
    };
    this.endDrag = finish;
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", finish);
    window.addEventListener("pointercancel", finish);
  }

  private open(kitId: KitId | null) {
    this.query = "";
    this.endDrag?.();
    store.put({ id: "nav/select-kit", data: { kitId } });
  }
  private get addField() {
    return this.renderRoot.querySelector<HTMLInputElement>(".add-row input");
  }
  protected override updated(_changed: PropertyValues) {
    if (this.focusAddField && this.addField) {
      this.focusAddField = false;
      this.addField.focus();
    }
  }
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
    this.focusAddField = true;
    this.open(id);
  }
  private useEssentials() {
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
      const existing = this.findByName(name);
      const itemId = existing?.id ?? newItemId();
      if (!existing) {
        store.put({ id: "item/create", data: { id: itemId, name } });
      }
      store.put({ id: "kit/add-item", data: { kitId: id, itemId } });
    }
    this.open(id);
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
          ? ` This kit will also be removed from ${plural(count, "trip")}.`
          : ""
      }`,
      confirm: "Delete",
      destructive: true,
    });
    // Deleting the open kit clears the selection in the reducer.
    if (confirmed) store.put({ id: "kit/delete", data: { id: kit.id } });
  }
  private findByName(name: string) {
    const wanted = normalize(name);
    return this.items.value.find((item) => normalize(item.name) === wanted);
  }
  /** Library items not yet in the kit; shown only while typing. */
  private suggestions(kit: Kit) {
    const q = normalize(this.query);
    if (!q) return [];
    const rank = (name: string) => {
      const normalized = normalize(name);
      return normalized === q ? 0 : normalized.startsWith(q) ? 1 : 2;
    };
    return this.items.value
      .filter(
        (i) =>
          !kit.itemIds.includes(i.id) &&
          i.name.toLocaleLowerCase().includes(q),
      )
      .sort((a, b) => rank(a.name) - rank(b.name))
      .slice(0, 5);
  }
  /** Add an existing library item, or create one from the typed name. */
  private async addItem(kit: Kit, item?: Item) {
    const name = this.query.trim();
    if (!item && !name) return;
    const id = item?.id ?? newItemId();
    if (!item) store.put({ id: "item/create", data: { id, name } });
    store.put({ id: "kit/add-item", data: { kitId: kit.id, itemId: id } });
    this.query = "";
    // Keep typing: the new row lands directly above the field.
    this.addField?.focus();
    await this.updateComplete;
    this.addField?.scrollIntoView({ block: "nearest" });
  }
  /**
   * Return adds exactly what was typed: the library item with that name if
   * one exists, otherwise a new item. Partial matches are tap-only.
   */
  private submit(kit: Kit) {
    const exact = this.findByName(this.query);
    if (exact && kit.itemIds.includes(exact.id)) return;
    this.addItem(kit, exact);
  }
  render() {
    const kit = this.kits.value.find((k) => k.id === this.selected.value);
    return kit ? this.renderKit(kit) : this.renderList();
  }
  private renderList() {
    const kits = this.kits.value;
    const search = normalize(this.kitQuery);
    const itemMap = new Map(this.items.value.map((item) => [item.id, item]));
    const namesOf = (kit: Kit) =>
      kit.itemIds.flatMap((id) => itemMap.get(id)?.name ?? []);
    const matching = kits.filter(
      (kit) =>
        kit.name.toLocaleLowerCase().includes(search) ||
        namesOf(kit).some((name) => name.toLocaleLowerCase().includes(search)),
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
                  this.kitQuery = (e.target as HTMLInputElement).value;
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
          : matching.length
          ? html`
            <div class="card">
              ${repeat(matching, (kit) => kit.id, (kit) => {
                const count = this.usage.value.get(kit.id) ?? 0;
                const names = namesOf(kit);
                // Lead with the items that made this kit match the search.
                const preview = search
                  ? [
                    ...names.filter((n) =>
                      n.toLocaleLowerCase().includes(search)
                    ),
                    ...names.filter((n) =>
                      !n.toLocaleLowerCase().includes(search)
                    ),
                  ]
                  : names;
                return html`
                  <button
                    class="kit-row"
                    data-kit-id=${kit.id}
                    @click=${() => this.open(kit.id)}
                    ${listMotion()}
                  >
                    <span
                      ><span class="name">${kit.name}</span>
                      <span class="meta"
                        >${plural(kit.itemIds.length, "item")}${count
                          ? ` · Used in ${plural(count, "trip")}`
                          : ""}</span
                      >
                      ${preview.length
                        ? html`<span class="preview">${preview.join(", ")}</span>`
                        : null}</span
                    >${icon("chevron")}
                  </button>
                `;
              })}
            </div>
          `
          : null}
      </div>
    `;
  }
  private renderKit(kit: Kit) {
    const count = this.usage.value.get(kit.id) ?? 0;
    const itemMap = new Map(this.items.value.map((item) => [item.id, item]));
    const suggestions = this.suggestions(kit);
    const q = this.query.trim();
    const exactMatch = q ? this.findByName(q) : undefined;
    const reorder = this.reorder?.from === kit.itemIds ? this.reorder : null;
    const order = reorder?.order ?? kit.itemIds;
    const sortable = kit.itemIds.length > 1;
    const otherKits = (id: ItemId) =>
      this.kits.value
        .filter((other) => other.id !== kit.id && other.itemIds.includes(id))
        .map((other) => other.name);
    return html`
      <header class="detail-header">
        <div class="detail-nav">
          <button class="back" @click=${() => this.open(null)}>
            ${icon("back")} Kits</button
          ><span class="nav-actions"
            ><button
              class="icon-button"
              aria-label=${`Rename ${kit.name}`}
              @click=${() => this.rename(kit)}
            >
              ${icon("edit")}</button
            ><button
              class="icon-button danger"
              aria-label=${`Delete ${kit.name}`}
              @click=${() => this.handleDelete(kit)}
            >
              ${icon("trash")}
            </button></span
          >
        </div>
        <h1>${kit.name}</h1>
        <p class="meta">
          ${plural(kit.itemIds.length, "item")} · ${count
            ? `Edits also update ${plural(count, "trip")}`
            : "Ready for your next trip"}
        </p>
      </header>
      <div class="body">
        <div class="card kit-items">
          ${repeat(order, (id) => id, (id) => {
            const item = itemMap.get(id);
            const name = item?.name ?? "Missing item";
            const shared = otherKits(id);
            const detail = [
              item?.notes?.trim(),
              shared.length ? `Also in ${shared.join(", ")}` : "",
            ].filter(Boolean).join(" · ");
            return html`
              <div
                class="row ${sortable ? "sortable" : ""} ${reorder?.id === id
                  ? "dragging"
                  : ""}"
                data-item-id=${id}
                ${listMotion()}
              >
                ${sortable
                  ? html`<span
                    class="grip"
                    aria-hidden="true"
                    @pointerdown=${(e: PointerEvent) =>
                      this.startDrag(e, kit, id)}
                    >${icon("grip")}</span
                  >`
                  : null}
                <span class="item-label"
                  ><span class="name">${name}</span>${detail
                    ? html`<span class="meta">${detail}</span>`
                    : null}</span
                ><button
                  class="icon-button remove"
                  aria-label=${`Remove ${name} from ${kit.name}`}
                  @click=${() =>
                    store.put({
                      id: "kit/remove-item",
                      data: { kitId: kit.id, itemId: id },
                    })}
                >
                  ${icon("close")}
                </button>
              </div>
            `;
          })}
          ${kit.itemIds.length ? null : html`
            <p class="hint">
              Nothing here yet. Type below to add items from your library or
              create new ones.
            </p>
          `}
          <label class="add-row" ${listMotion()}
            >${icon("plus")}<input
              aria-label=${`Add item to ${kit.name}`}
              placeholder="Add an item"
              .value=${this.query}
              @input=${(e: Event) => {
                this.query = (e.target as HTMLInputElement).value;
              }}
              @keydown=${(e: KeyboardEvent) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  this.submit(kit);
                }
                if (e.key === "Escape") this.query = "";
              }}
              enterkeyhint="enter"
              autocomplete="off"
              maxlength="120"
          /></label>
          ${suggestions.map(
            (item) =>
              html`
                <button
                  class="suggestion"
                  @click=${() => this.addItem(kit, item)}
                >
                  ＋ ${item.name}
                </button>
              `,
          )}
          ${q && !exactMatch
            ? html`
              <button
                class="suggestion create"
                @click=${() => this.addItem(kit)}
              >
                ＋ Create “${q}”
              </button>
            `
            : exactMatch && kit.itemIds.includes(exactMatch.id)
            ? html`<p class="hint">Already in this kit.</p>`
            : null}
        </div>
      </div>
    `;
  }
}
