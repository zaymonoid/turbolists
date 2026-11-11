import { AnimatedNumber } from "../animated-number.ts";
import { repeat } from "lit/directives/repeat.js";
import { listMotion } from "./list-motion.ts";
import { css, html, LitElement } from "lit";
import { customElement, state } from "lit/decorators.js";
import { fromStore } from "@zaymonoid/katha/lit";
import { store } from "../store/index.ts";
import type { AppState } from "../store/state.ts";
import { newTripId } from "../ids.ts";
import type { Trip } from "@turbolists/core/trip";
import {
  formatTripChecklist,
  packProgress,
  tripChecklist,
} from "@turbolists/core/views";
import type { ItemId } from "@turbolists/core/ids";
import { icon, navigate, showDialog, viewStyles } from "./ui.ts";
import { dismissSheet, presentSheet } from "./sheet.ts";
import { shareChecklist } from "../share.ts";

@customElement("trips-view")
export class TripsView extends LitElement {
  static styles = [
    viewStyles,
    css`
      .segments {
        display: flex;
        gap: 4px;
        padding: 4px;
        margin-bottom: 16px;
        background: var(--panel);
        border-radius: 14px;
      }
      .segments button {
        flex: 1;
        min-height: 44px;
        border: 0;
        border-radius: 11px;
        background: none;
        color: var(--ink-dim);
        font-size: 15px;
        font-weight: 600;
      }
      .segments button[aria-pressed="true"] {
        background: var(--panel-2);
        color: var(--accent);
      }
      .archive-note {
        display: flex;
        align-items: center;
        justify-content: space-between;
        color: var(--ink-dim);
        margin-bottom: 12px;
      }
      .trip-status {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
        font-size: 12px;
        color: var(--ink-dim);
      }
      .status {
        border-radius: 6px;
        padding: 4px 7px;
        background: var(--panel-2);
        font-weight: 600;
      }
      .status.complete {
        color: var(--accent);
      }
      .progress {
        height: 6px;
        overflow: hidden;
        background: var(--line);
        border-radius: 6px;
        margin-top: 16px;
      }
      .fill {
        height: 100%;
        background: var(--accent);
        border-radius: inherit;
        transition: width 0.2s ease;
      }
      .trip-card .chips {
        margin-top: 14px;
      }
      .pack-progress {
        margin: 4px 4px 6px;
      }
      .pack-line {
        display: flex;
        align-items: baseline;
        justify-content: space-between;
        gap: 12px;
      }
      .counter {
        font-size: 22px;
        font-weight: 700;
        letter-spacing: -0.03em;
        color: var(--accent);
        font-variant-numeric: tabular-nums;
      }
      .counter small {
        font-size: 15px;
        font-weight: 500;
        color: var(--ink-dim);
        letter-spacing: 0;
        margin-left: 2px;
      }
      .progress-note {
        font-size: 14px;
        color: var(--ink-dim);
        text-align: right;
      }
      .pack-progress .progress {
        height: 4px;
        margin-top: 8px;
      }
      .share-message {
        margin: 8px 4px 0;
      }
      .kit-summary {
        display: flex;
        align-items: center;
        gap: 6px;
        max-width: 100%;
        min-height: 44px;
        padding: 0;
        background: none;
        border: 0;
        color: var(--ink-dim);
        font-size: 15px;
        text-align: left;
      }
      .kit-summary span {
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .kit-summary.empty-kits {
        color: var(--accent);
        font-weight: 600;
      }
      .kit-summary svg {
        width: 16px;
        height: 16px;
        flex-shrink: 0;
      }
      .kit-options {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 16px;
      }
      dialog.sheet {
        position: fixed;
        top: auto;
        bottom: 0;
        color: var(--ink);
        background: var(--panel);
        border: 1px solid var(--line);
        border-radius: 26px 26px 0 0;
        padding: 10px 22px calc(28px + env(safe-area-inset-bottom));
        width: 100%;
        max-width: 540px;
        max-height: 90dvh;
        margin: auto auto 0;
        box-shadow: 0 -20px 80px #0006;
        overflow-y: auto;
        overscroll-behavior: contain;
      }
      dialog.sheet::backdrop {
        background: #0009;
        backdrop-filter: blur(5px);
        opacity: var(--sheet-progress, 1);
      }
      dialog.sheet:focus-visible,
      dialog.sheet :focus:not(:focus-visible) {
        outline: none;
      }
      .sheet-handle {
        width: 34px;
        height: 5px;
        border-radius: 5px;
        margin: 0 auto 8px;
        background: #626b5b;
      }
      .sheet-nav {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        margin: 6px -8px 0 0;
      }
      .sheet-nav button {
        color: var(--accent);
        background: none;
        border: 0;
        min-height: 44px;
        padding: 8px;
        font-size: 17px;
        font-weight: 600;
      }
      dialog.sheet h2 {
        margin: 0;
        font-size: 24px;
        letter-spacing: -0.03em;
        overflow-wrap: anywhere;
      }
      dialog.sheet label {
        display: block;
        color: var(--ink-dim);
        font-size: 14px;
        margin: 20px 0 8px;
      }
      dialog.sheet input {
        width: 100%;
        min-height: 52px;
        border: 1px solid var(--line);
        border-radius: 13px;
        padding: 12px 14px;
        font-size: 17px;
        background: var(--bg);
        color: var(--ink);
      }
      @media (min-width: 650px) {
        dialog.sheet {
          top: 0;
          margin: auto;
          border-radius: 26px;
        }
      }
      .kit-toggle {
        min-height: 44px;
        padding: 10px 13px;
        background: var(--panel-2);
        color: var(--ink-dim);
        border: 1px solid var(--line);
        border-radius: 12px;
        font-size: 15px;
        overflow-wrap: anywhere;
      }
      .kit-toggle.active {
        background: var(--accent-wash);
        color: var(--accent);
        border-color: var(--accent-dim);
      }
      .check-toolbar {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        margin: 18px 0 8px;
      }
      .check-toolbar h2 {
        font-size: 20px;
        margin: 0;
      }
      .filter {
        background: var(--panel-2);
        color: var(--ink-dim);
        min-height: 44px;
        border: 1px solid var(--line);
        border-radius: 12px;
        padding: 8px 12px;
        font-size: 13px;
      }
      .filter[aria-pressed="true"] {
        color: var(--accent);
        border-color: var(--accent-dim);
      }
      .check-row {
        display: flex;
        width: 100%;
        gap: 14px;
        align-items: center;
        min-height: 58px;
        text-align: left;
        padding: 14px 16px;
        border: 0;
        background: none;
        font-size: 17px;
      }
      .check-row + .check-row {
        border-top: 1px solid var(--line);
      }
      .check-name {
        transition: color 180ms ease;
      }
      .checkbox {
        transition: background-color 180ms ease, border-color 180ms ease;
        width: 25px;
        height: 25px;
        border: 1.5px solid var(--ink-dim);
        border-radius: 50%;
        flex-shrink: 0;
        display: grid;
        place-items: center;
      }
      .checkbox svg {
        width: 18px;
        height: 18px;
      }
      .check-row.checked .checkbox {
        background: var(--accent);
        color: var(--on-accent);
        border-color: var(--accent);
      }
      .check-row.checked .check-name {
        color: var(--ink-dim);
        text-decoration: line-through;
      }
      .check-name {
        overflow-wrap: anywhere;
      }
      .reset {
        display: block;
        margin: 18px auto 0;
      }
      .empty.compact {
        padding: 28px 12px;
      }
    `,
  ];
  private animatedChecked = new AnimatedNumber(this);
  private animatedTotal = new AnimatedNumber(this);
  private counterTripId: Trip["id"] | null = null;
  private trips = fromStore(this, store, (s: AppState) => s.data.trips);
  private kits = fromStore(this, store, (s: AppState) => s.data.kits);
  private items = fromStore(this, store, (s: AppState) => s.data.items);
  private selected = fromStore(this, store, (s: AppState) => s.selectedTripId);
  @state()
  private remainingOnly = false;
  @state()
  private tripQuery = "";
  @state()
  private archivedView = false;
  @state()
  private checklistQuery = "";
  @state()
  private sharing = false;
  @state()
  private shareMessage = "";
  @state()
  private packingOrder: ReadonlySet<ItemId> | null = null;
  /** Kit sheet: "setup" right after creating a trip, "settings" from the pencil. */
  @state()
  private sheet: "setup" | "settings" | null = null;
  private reorderTimer: ReturnType<typeof setTimeout> | undefined;

  private clearReorder() {
    clearTimeout(this.reorderTimer);
    this.reorderTimer = undefined;
    this.packingOrder = null;
  }

  override updated() {
    const dialog = this.renderRoot.querySelector<HTMLDialogElement>(
      "dialog.sheet",
    );
    if (dialog && !dialog.open) {
      presentSheet(dialog);
      // showModal focuses the first control (Done) and paints its focus ring;
      // focus the sheet itself so nothing looks pre-selected.
      dialog.focus();
    }
  }

  private closeSheet() {
    this.sheet = null;
  }

  override disconnectedCallback() {
    this.clearReorder();
    super.disconnectedCallback();
  }

  private togglePacked(trip: Trip, itemId: ItemId) {
    // Checkmark, counter, persistence, and haptic update immediately. Keep the
    // previous row order briefly so the check reads before the row moves.
    this.packingOrder ??= new Set(trip.checked);
    clearTimeout(this.reorderTimer);
    this.reorderTimer = setTimeout(() => this.clearReorder(), 80);
    store.put({ id: "trip/toggle-checked", data: { tripId: trip.id, itemId } });
  }

  private async share(trip: Trip) {
    if (this.sharing) return;
    this.sharing = true;
    this.shareMessage = "";
    try {
      const result = await shareChecklist(
        trip.name,
        formatTripChecklist(trip, this.kits.value, this.items.value),
      );
      if (result === "copied") {
        this.shareMessage =
          "Checklist copied. Paste it into a message or note.";
      }
    } catch {
      this.shareMessage = "Couldn’t share this checklist. Please try again.";
    } finally {
      this.sharing = false;
    }
  }

  private async add() {
    const name = await showDialog({
      title: "New trip",
      message: "Where are you headed? Give your packing list a name.",
      value: "",
      placeholder: "e.g. Weekend on the coast",
      confirm: "Create",
    });
    if (!name) return;
    const id = newTripId();
    store.put({
      id: "trip/create",
      data: { id, name, createdAt: new Date().toISOString() },
    });
    this.tripQuery = "";
    this.archivedView = false;
    this.open(id);
    this.sheet = "setup";
  }
  private open(id: Trip["id"]) {
    this.clearReorder();
    this.shareMessage = "";
    this.remainingOnly = false;
    this.checklistQuery = "";
    this.sheet = null;
    store.put({ id: "nav/select-trip", data: { tripId: id } });
  }
  private async packAgain(trip: Trip) {
    const name = await showDialog({
      title: "Pack again",
      message:
        "Reuse these kits with a fresh checklist. The original trip keeps its packing progress.",
      value: `${trip.name} again`.slice(0, 120),
      confirm: "Create trip",
    });
    if (!name) return;
    const id = newTripId();
    store.put({
      id: "trip/duplicate",
      data: {
        sourceId: trip.id,
        id,
        name,
        createdAt: new Date().toISOString(),
      },
    });
    this.tripQuery = "";
    this.archivedView = false;
    this.open(id);
  }
  private archive(trip: Trip) {
    store.put({
      id: "trip/set-archived",
      data: { id: trip.id, archived: !trip.archived },
    });
    this.tripQuery = "";
    if (trip.archived) this.archivedView = false;
  }
  private async rename(trip: Trip) {
    const name = await showDialog({ title: "Rename trip", value: trip.name });
    if (name) store.put({ id: "trip/rename", data: { id: trip.id, name } });
  }
  private async handleDelete(trip: Trip) {
    if (
      await showDialog({
        title: `Delete “${trip.name}”?`,
        message:
          "This packing list and its progress will be removed. Your kits and items stay in your library.",
        confirm: "Delete",
        destructive: true,
      })
    ) {
      store.put({ id: "trip/delete", data: { id: trip.id } });
    }
  }
  private async reset(trip: Trip) {
    if (
      await showDialog({
        title: "Start packing again?",
        message: "All items on this trip will be marked as unpacked.",
        confirm: "Reset",
        destructive: true,
      })
    ) {
      store.put({ id: "trip/reset-checks", data: { tripId: trip.id } });
    }
  }
  private renderList() {
    const trips = this.trips.value;
    const kits = this.kits.value;
    const query = this.tripQuery.trim().toLocaleLowerCase();
    const matching = [...trips]
      .reverse()
      .filter(
        (trip) =>
          Boolean(trip.archived) === this.archivedView &&
          trip.name.toLocaleLowerCase().includes(query),
      );
    const archivedCount = trips.filter((trip) => trip.archived).length;
    return html`
      <header class="header">
        <div>
          <h1>Trips</h1>
          <p class="subtitle">Less remembering. More going.</p>
        </div>
        <button class="add-button" aria-label="New trip" @click=${this.add}>
          ${icon("plus")}
        </button>
      </header>
      <div class="body">
        ${trips.length
          ? html`<div class="segments" aria-label="Trip lists">
              <button
                aria-label="Active trips"
                aria-pressed=${!this.archivedView}
                @click=${() => {
            this.archivedView = false;
            this.tripQuery = "";
          }}
              >
                Active · ${trips.length - archivedCount}</button
              ><button
                aria-label="Archived trips"
                aria-pressed=${this.archivedView}
                @click=${() => {
            this.archivedView = true;
            this.tripQuery = "";
          }}
              >
                Archived · ${archivedCount}
              </button>
            </div>`
          : null}
        ${trips.length
          ? html`
            <label class="search"
            >${icon("search")}<input
                            type="search"
                            aria-label="Search trips"
                            placeholder="Search trips"
                            .value=${this.tripQuery}
                            @input=${(e: Event) => {
                              this.tripQuery =
                                (e.target as HTMLInputElement).value;
                            }}
                        /></label>
          `
          : null}
        ${trips.length && !matching.length && !query
          ? html`<div class="empty">
              <div class="empty-icon">${icon("archive")}</div>
              <h2>
                ${this.archivedView ? "No archived trips" : "No active trips"}
              </h2>
              <p>
                ${
            this.archivedView
              ? "Archive a trip to keep its progress and make room for your next adventure."
              : "Your past trips are in the archive. Plan a new one whenever you’re ready."
          }
              </p>
              ${
            !this.archivedView
              ? html`<button class="primary" @click=${this.add}>
                    Plan a trip
                  </button>`
              : null
          }
            </div>`
          : null}
        ${trips.length && !matching.length && query
          ? html`
            <div class="empty">
              <h2>No trips found</h2>
              <p>Try a different name, or plan a new trip.</p>
              <button
                class="text-button"
                @click=${() => {
                  this.tripQuery = "";
                }}
              >
                            Clear search
                          </button>
            </div>
          `
          : null}
        ${!trips.length
          ? html`
            <div class="empty">
              <div class="empty-icon">${icon("trips")}</div>
              <h2>Your next trip starts here</h2>
              <p>
                Create a trip, choose the kits that fit, and get one
                checklist with everything you need.
              </p>
              <button class="primary" @click=${this.add}>
                ${icon("plus")} Plan your first trip
              </button>
            </div>
          `
          : repeat(matching, (trip) => trip.id, (trip) => {
            const { checked, total } = packProgress(trip, kits);
            const complete = total > 0 && checked === total;
            const date = new Date(trip.createdAt);
            return html`
              <article class="card trip-card" ${listMotion()}>
                <button
                  class="card-main"
                  @click=${() => this.open(trip.id)}
                  aria-label=${`Open ${trip.name}`}
                >
                  <div class="trip-status">
                    <span class="status ${complete ? "complete" : ""}"
                      >${trip.archived
                        ? "Archived"
                        : complete
                        ? "Ready to go"
                        : checked
                        ? "Packing"
                        : total
                        ? "Ready to pack"
                        : "Planning"}</span
                    ><span
                      >${Number.isNaN(date.getTime())
                        ? ""
                        : date.toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}</span
                    >
                  </div>
                  <span class="card-title"
                    >${trip.name}${icon("chevron")}</span
                  >
                  ${trip.kitIds.length
                    ? html`<div class="chips">
                          ${
                      trip.kitIds.map(
                        (id) =>
                          html`
                            <span class="chip"
                            >${kits.find((f) => f.id === id)?.name}</span>
                          `,
                      )
                    }
                        </div>`
                    : null}
                  ${total
                    ? html`
                      <div class="progress">
                        <div
                          class="fill"
                          style=${`width:${(checked / total) * 100}%`}
                        ></div>
                      </div>
                      <div class="meta">
                        ${checked} of ${total}
                        packed${complete ? " · All set!" : ""}
                      </div>
                    `
                    : html`<div class="meta">
                          Choose kits to build your checklist
                        </div>`}
                </button>
                <div class="toolbar">
                  ${trip.kitIds.length
                    ? html`
                      <button
                        class="text-button"
                        aria-label=${`Pack ${trip.name} again`}
                        @click=${() => this.packAgain(trip)}
                      >
                                                Pack again
                                              </button>
                    `
                    : null}
                  <button
                    class=${trip.archived ? "text-button" : "icon-button"}
                    aria-label=${`${
                      trip.archived ? "Restore" : "Archive"
                    } ${trip.name}`}
                    title=${trip.archived ? "Restore trip" : "Archive trip"}
                    @click=${() => this.archive(trip)}
                  >
                    ${trip.archived ? "Restore" : icon("archive")}
                  </button>
                  <button
                    class="text-button"
                    @click=${() => this.rename(trip)}
                  >
                    Rename</button
                  ><button
                    class="icon-button danger"
                    aria-label=${`Delete ${trip.name}`}
                    @click=${() => this.handleDelete(trip)}
                  >
                    ${icon("trash")}
                  </button>
                </div>
              </article>
            `;
          })}
      </div>
    `;
  }
  private renderDetail(trip: Trip) {
    const kits = this.kits.value;
    const orderChecked = this.packingOrder ?? trip.checked;
    const { checked, total } = packProgress(trip, kits);
    if (this.counterTripId !== trip.id) {
      this.animatedChecked.reset(checked);
      this.animatedTotal.reset(total);
      this.counterTripId = trip.id;
    }
    this.animatedChecked.target = checked;
    this.animatedTotal.target = total;
    const complete = total > 0 && checked === total;
    const groups = new Map<string, { name: string; ids: ItemId[] }>();
    const itemMap = new Map(this.items.value.map((item) => [item.id, item]));
    const query = this.checklistQuery.trim().toLocaleLowerCase();
    const matchesSearch = (id: ItemId) =>
      (itemMap.get(id)?.name ?? "").toLocaleLowerCase().includes(query);
    const visibleCount = tripChecklist(trip, kits).filter(
      (id) =>
        matchesSearch(id) && (!this.remainingOnly || !orderChecked.has(id)),
    ).length;
    // Build groups in kit order; each group displays unpacked items first.
    for (const id of tripChecklist(trip, kits)) {
      const owners = kits.filter(
        (f) => trip.kitIds.includes(f.id) && f.itemIds.includes(id),
      );
      const key = owners
        .map((f) => f.id)
        .sort()
        .join("+");
      if (!groups.has(key)) {
        groups.set(key, {
          name: owners.map((f) => f.name).join(" + "),
          ids: [],
        });
      }
      groups.get(key)!.ids.push(id);
    }
    return html`
      <header class="detail-header">
        <div class="detail-nav">
          <button
            class="back"
            @click=${() =>
              store.put({
                id: "nav/select-trip",
                data: { tripId: null },
              })}
          >
            ${icon("back")} Trips</button
          ><span class="nav-actions">${total
            ? html`
              <button
                class="icon-button"
                aria-label="Share checklist"
                ?disabled=${this.sharing}
                @click=${() => this.share(trip)}
              >
                              ${icon("share")}
                            </button>
            `
            : null}<button
              class="icon-button"
              aria-label="Trip settings"
              @click=${() => {
                this.sheet = "settings";
              }}
            >
              ${icon("edit")}
            </button></span>
        </div>
        <h1>${trip.name}</h1>
        ${this.renderKitSummary(trip)}
      </header>
      <div class="body">
        ${trip.archived
          ? html`<div class="archive-note">
              <span>Archived trip</span
              ><button class="text-button" @click=${() => this.archive(trip)}>
                Restore trip
              </button>
            </div>`
          : null}
        ${total
          ? html`
            <section class="pack-progress" aria-label="Packing progress">
              <div class="pack-line">
                <span class="counter" role="group" aria-label=${`${checked} of ${total} packed`}
                ><span aria-hidden="true">${Math.round(
                  this.animatedChecked.value,
                )}<small>/${Math.round(this.animatedTotal.value)}</small></span
                            ></span>
                <span class="progress-note" role="status">
                              ${complete
                                ? "All packed. Have a great trip!"
                                : `${total - checked} item${
                                  total - checked === 1 ? "" : "s"
                                } left to pack`}
                            </span>
              </div>
              <div
                class="progress"
                role="progressbar"
                aria-label="Items packed"
                aria-valuenow=${checked}
                aria-valuemin="0"
                aria-valuemax=${total}
              >
                <div class="fill" style=${`width:${
                  (checked / total) * 100
                }%`}></div>
              </div>
            </section>
          `
          : null}
        ${this.shareMessage
          ? html`<p class="meta share-message" role="status">${this.shareMessage}</p>`
          : null}
        ${total
          ? html`<div class="check-toolbar">
                <h2>Checklist</h2>
                <button
                  class="filter"
                  aria-pressed=${this.remainingOnly}
                  @click=${() => {
            this.remainingOnly = !this.remainingOnly;
          }}
                >
                  ${this.remainingOnly ? "Show all" : "Unpacked only"}
                </button>
              </div>
              <label class="search"
                >${icon("search")}<input
                  type="search"
                  aria-label="Search checklist"
                  placeholder="Find an item"
                  .value=${this.checklistQuery}
                  @input=${(e: Event) => {
            this.checklistQuery = (e.target as HTMLInputElement).value;
          }}
              /></label>
              ${
            !visibleCount && query
              ? html`
                <div class="empty compact">
                  <h2>No matching items</h2>
                  <p>
                                      ${this.remainingOnly
                                        ? "Try another name or show packed items too."
                                        : "Try another item name."}
                                    </p>
                  <button
                    class="text-button"
                    @click=${() => {
                      this.checklistQuery = "";
                    }}
                  >
                                      Clear search
                                    </button>
                </div>
              `
              : null
          }
              ${
            complete && this.remainingOnly && !query && !this.packingOrder
              ? html`
                <div class="empty compact">
                  <div class="empty-icon">${icon("check")}</div>
                  <h2>You’re all set</h2>
                  <p>Everything on your list is packed.</p>
                </div>
              `
              : repeat([...groups.entries()], ([key]) => key, ([, group]) => {
                const visible = group.ids.filter(
                  (id) =>
                    matchesSearch(id) &&
                    (!this.remainingOnly || !orderChecked.has(id)),
                ).sort((a, b) =>
                  Number(orderChecked.has(a)) - Number(orderChecked.has(b))
                );
                if (!visible.length) return null;
                return html`
                  <section ${listMotion()}>
                    <h3 class="section-label">
                    ${group.name} ·
                    ${group.ids.filter((id) => trip.checked.has(id))
                      .length}/${group.ids.length}
                    </h3>
                    <div class="card">
                    ${repeat(visible, (id) => id, (id) => {
                      const packed = trip.checked.has(id);
                      const name = itemMap.get(id)?.name ?? "Missing item";
                      return html`
                        <button
                          class="check-row ${packed ? "checked" : ""}"
                          ${listMotion()}
                          role="checkbox"
                          aria-checked=${packed}
                          aria-label=${name}
                          @click=${() => this.togglePacked(trip, id)}
                        >
                          <span class="checkbox"
                            >${packed ? icon("check") : null}</span
                          ><span class="check-name">${name}</span>
                        </button>
                      `;
                    })}
                    </div>
                  </section>
                `;
              })
          }
              <button
                class="text-button reset danger"
                ?disabled=${checked === 0}
                @click=${() => this.reset(trip)}
              >
                Reset packing progress
              </button>`
          : html`
            <div class="empty compact">
              <div class="empty-icon">${icon("items")}</div>
              <h2>
                ${trip.kitIds.length
                  ? "These kits are empty"
                  : "What’s coming with you?"}
              </h2>
              <p>
                ${trip.kitIds.length
                  ? "Add items to your kits to start packing."
                  : "Choose kits to build a packing list for this trip."}
              </p>
              ${trip.kitIds.length
                ? html`<button class="text-button" @click=${() =>
                  navigate("kits")}>Add items to kits →</button>`
                : html`<button class="primary" @click=${() => {
                  this.sheet = "settings";
                }}>Choose kits</button>`}
            </div>
          `}
      </div>
      ${this.sheet ? this.renderSheet(trip) : null}
    `;
  }
  private renderKitSummary(trip: Trip) {
    const names = trip.kitIds
      .map((id) => this.kits.value.find((kit) => kit.id === id)?.name)
      .filter(Boolean);
    const open = () => {
      this.sheet = "settings";
    };
    return names.length
      ? html`
        <button
          class="kit-summary"
          aria-label=${`Kits: ${names.join(", ")}. Edit kits`}
          @click=${open}
        ><span>${names.join(" · ")}</span>${icon("chevron")}</button>
      `
      : html`<button class="kit-summary empty-kits" @click=${open}>
          ${icon("plus")}<span>Choose kits</span>
        </button>`;
  }
  private renderSheet(trip: Trip) {
    const kits = this.kits.value;
    const setup = this.sheet === "setup";
    return html`
      <dialog
        class="sheet"
        tabindex="-1"
        aria-labelledby="sheet-title"
        @close=${this.closeSheet}
        @click=${(e: MouseEvent) => {
          // Taps on the backdrop land on the dialog element itself.
          const dialog = e.currentTarget as HTMLDialogElement;
          const r = dialog.getBoundingClientRect();
          if (
            e.target === dialog &&
            (e.clientY < r.top || e.clientY > r.bottom ||
              e.clientX < r.left || e.clientX > r.right)
          ) dismissSheet(dialog);
        }}
        @cancel=${(e: Event) => {
          // Escape or a drag past the threshold: slide away instead of vanishing.
          e.preventDefault();
          dismissSheet(e.currentTarget as HTMLDialogElement);
        }}
      >
        <div class="sheet-handle" aria-hidden="true"></div>
        <div class="sheet-nav">
          <h2 id="sheet-title">${setup
            ? "What kind of trip?"
            : "Trip settings"}</h2>
          <button
            @click=${(e: Event) =>
              dismissSheet(
                (e.currentTarget as HTMLElement).closest("dialog")!,
              )}
          >
            Done
          </button>
        </div>
        ${setup ? null : html`<label for="trip-name">Name</label><input
              id="trip-name"
              aria-label="Trip name"
              .value=${trip.name}
              autocomplete="off"
              enterkeyhint="done"
              maxlength="120"
              @change=${(e: Event) => {
          const input = e.target as HTMLInputElement;
          const name = input.value.trim();
          if (name && name !== trip.name) {
            store.put({ id: "trip/rename", data: { id: trip.id, name } });
          } else input.value = trip.name;
        }}
              @keydown=${(e: KeyboardEvent) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
        }}
            />`}
        <label>Kits</label>
        <p class="meta">
          Choose what fits this trip. Shared items appear just once.
        </p>
        ${kits.length
          ? html`<div class="kit-options">
              ${
            kits.map((kit) => {
              const active = trip.kitIds.includes(kit.id);
              return html`
                <button
                  class="kit-toggle ${active ? "active" : ""}"
                  aria-pressed=${active}
                  @click=${() =>
                    store.put({
                      id: active ? "trip/remove-kit" : "trip/add-kit",
                      data: { tripId: trip.id, kitId: kit.id },
                    })}
                >
                  ${active ? "✓ " : "＋ "}${kit.name}
                </button>
              `;
            })
          }
            </div>`
          : html`
            <p class="meta">Create a kit first, then add it here.</p>
            <button
              class="text-button"
              @click=${() => {
                this.sheet = null;
                navigate("kits");
              }}
            >
              Create a kit →
            </button>
          `}
      </dialog>
    `;
  }
  render() {
    const trip = this.trips.value.find((t) => t.id === this.selected.value);
    return trip ? this.renderDetail(trip) : this.renderList();
  }
}
