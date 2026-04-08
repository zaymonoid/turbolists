import { LitElement, html, css, nothing } from "lit";
import { customElement } from "lit/decorators.js";
import { animate } from "@lit-labs/motion";
import { fromStore } from "@zaymonoid/katha/lit";
import { store } from "../store/index.ts";
import type { AppState } from "../store/state.ts";
import { newTripId } from "../ids.ts";
import type { Trip } from "@turbolists/core/trip";
import { packProgress } from "@turbolists/core/views";
import { AnimatedNumber } from "../animated-number.ts";

@customElement("trips-view")
export class TripsView extends LitElement {
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

    /* ---- Trip cards ---- */
    .screen-body {
      flex: 1;
      overflow-y: auto;
      padding: 14px 0 80px;
    }

    .trip-card {
      margin: 0 16px 12px;
      padding: 16px;
      background: var(--panel, #161814);
      border: 1px solid var(--line, #2a2e26);
      border-radius: 4px;
      position: relative;
      cursor: pointer;
    }

    .trip-meta-line {
      display: flex;
      justify-content: space-between;
      font-family: var(--font-mono, 'JetBrains Mono', monospace);
      font-size: 9px;
      color: var(--ink-dim, #8a8c82);
      text-transform: uppercase;
      letter-spacing: 0.1em;
      margin-bottom: 8px;
    }

    .trip-name {
      font-family: var(--font-display, 'Archivo', sans-serif);
      font-weight: 700;
      font-size: 18px;
      letter-spacing: -0.01em;
      margin-bottom: 10px;
      line-height: 1.1;
    }

    .trip-facets {
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      margin-bottom: 12px;
    }

    .facet-chip {
      font-family: var(--font-mono, 'JetBrains Mono', monospace);
      font-size: 8px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--ink-dim, #8a8c82);
      border: 1px solid var(--line-bright, #3a3f35);
      padding: 3px 6px;
      border-radius: 2px;
    }

    .progress-row {
      display: flex;
      align-items: center;
      gap: 10px;
      font-family: var(--font-mono, 'JetBrains Mono', monospace);
      font-size: 10px;
    }
    .progress-bar {
      flex: 1;
      height: 2px;
      background: var(--line, #2a2e26);
      position: relative;
      overflow: hidden;
    }
    .progress-fill {
      position: absolute;
      inset: 0;
      background: var(--accent, #d4ff3a);
      transform-origin: left;
    }
    .progress-text {
      color: var(--ink-dim, #8a8c82);
      min-width: 38px;
      text-align: right;
    }

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

    /* ---- FAB ---- */
    .fab {
      position: absolute;
      bottom: 24px;
      right: 20px;
      width: 56px;
      height: 56px;
      background: var(--accent, #d4ff3a);
      color: var(--bg, #0e0f0c);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 28px;
      font-weight: 300;
      font-family: var(--font-display, 'Archivo', sans-serif);
      box-shadow: 0 8px 24px rgba(212, 255, 58, 0.2);
      cursor: pointer;
      border: none;
      z-index: 5;
    }

    /* ---- Add trip form (inline, shown when FAB toggled) ---- */
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

    .empty {
      color: var(--ink-faint, #555852);
      font-family: var(--font-mono, 'JetBrains Mono', monospace);
      font-size: 11px;
      text-align: center;
      padding: 40px 20px;
    }

    /* ============ DETAIL VIEW ============ */

    .detail-header {
      padding: 8px 20px 16px;
      border-bottom: 1px solid var(--line, #2a2e26);
    }
    .back-link {
      font-family: var(--font-mono, 'JetBrains Mono', monospace);
      font-size: 9px;
      color: var(--ink-dim, #8a8c82);
      text-transform: uppercase;
      letter-spacing: 0.15em;
      cursor: pointer;
      background: none;
      border: none;
      padding: 0;
      margin-bottom: 6px;
      display: flex;
      justify-content: space-between;
      width: 100%;
    }
    .back-link .accent { color: var(--accent, #d4ff3a); }

    /* Pack progress block */
    .pack-progress-block {
      padding: 16px 20px 18px;
      border-bottom: 1px solid var(--line, #2a2e26);
      background: var(--panel, #161814);
    }
    .pack-counter {
      display: flex;
      align-items: baseline;
      gap: 8px;
      margin-bottom: 8px;
    }
    .pack-counter .big {
      font-family: var(--font-display, 'Archivo', sans-serif);
      font-weight: 900;
      font-size: 36px;
      color: var(--accent, #d4ff3a);
      line-height: 0.9;
      font-variant-numeric: tabular-nums;
    }
    .pack-counter .of {
      font-family: var(--font-mono, 'JetBrains Mono', monospace);
      font-size: 14px;
      color: var(--ink-dim, #8a8c82);
    }
    .pack-counter .label {
      font-family: var(--font-mono, 'JetBrains Mono', monospace);
      font-size: 9px;
      color: var(--ink-dim, #8a8c82);
      text-transform: uppercase;
      letter-spacing: 0.15em;
      margin-left: auto;
    }
    .big-progress-bar {
      height: 4px;
      background: var(--line, #2a2e26);
      position: relative;
      overflow: hidden;
    }
    .big-progress-fill {
      position: absolute;
      inset: 0;
      background: var(--accent, #d4ff3a);
      transform-origin: left;
      transition: transform 0.2s;
    }

    /* Facet toggles */
    .facet-toggles {
      padding: 12px 20px;
      display: flex;
      flex-wrap: wrap;
      gap: 4px;
      border-bottom: 1px solid var(--line, #2a2e26);
    }
    .facet-toggle {
      font-family: var(--font-mono, 'JetBrains Mono', monospace);
      font-size: 8px;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      color: var(--ink-faint, #555852);
      border: 1px solid var(--line-bright, #3a3f35);
      padding: 4px 8px;
      border-radius: 2px;
      background: none;
      cursor: pointer;
    }
    .facet-toggle.active {
      color: var(--ink, #e8e6df);
      border-color: var(--accent, #d4ff3a);
      background: var(--panel-2, #1d201b);
    }

    /* Checklist sections */
    .facet-section {
      border-bottom: 1px solid var(--line, #2a2e26);
    }
    .facet-section-header {
      padding: 14px 20px 8px;
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      background: var(--bg, #0e0f0c);
    }
    .facet-section-name {
      font-family: var(--font-mono, 'JetBrains Mono', monospace);
      font-size: 10px;
      color: var(--accent, #d4ff3a);
      text-transform: uppercase;
      letter-spacing: 0.15em;
      font-weight: 700;
    }
    .facet-section-count {
      font-family: var(--font-mono, 'JetBrains Mono', monospace);
      font-size: 9px;
      color: var(--ink-faint, #555852);
    }

    .check-row {
      padding: 11px 20px;
      display: flex;
      align-items: center;
      gap: 14px;
      border-top: 1px solid var(--line, #2a2e26);
      cursor: pointer;
      transition: opacity 200ms ease;
    }
    .check-box {
      width: 18px;
      height: 18px;
      border: 1.5px solid var(--line-bright, #3a3f35);
      flex-shrink: 0;
      position: relative;
      border-radius: 2px;
      transition: background-color 150ms ease, border-color 150ms ease, transform 150ms ease;
    }
    .check-box:active {
      transform: scale(0.85);
    }
    .check-row.checked .check-box {
      background: var(--accent, #d4ff3a);
      border-color: var(--accent, #d4ff3a);
    }
    .check-row.checked .check-box::after {
      content: '';
      position: absolute;
      left: 4px;
      top: 1px;
      width: 5px;
      height: 9px;
      border: solid var(--bg, #0e0f0c);
      border-width: 0 2px 2px 0;
      transform: rotate(45deg);
    }
    .check-label {
      font-family: var(--font-mono, 'JetBrains Mono', monospace);
      font-size: 12px;
      font-weight: 400;
      color: var(--ink, #e8e6df);
      flex: 1;
      transition: color 200ms ease;
    }
    .check-row.checked .check-label {
      color: var(--ink-faint, #555852);
      text-decoration: line-through;
      text-decoration-color: var(--ink-faint, #555852);
    }

    .actions {
      padding: 16px 20px;
    }
    .actions button {
      padding: 8px 14px;
      border: 1px solid var(--line-bright, #3a3f35);
      border-radius: 4px;
      background: none;
      cursor: pointer;
      font-family: var(--font-mono, 'JetBrains Mono', monospace);
      font-size: 10px;
      color: var(--ink-dim, #8a8c82);
      text-transform: uppercase;
      letter-spacing: 0.1em;
    }
    .actions button:hover { border-color: var(--warn, #ff7a3a); color: var(--warn, #ff7a3a); }
  `;

  private _animatedChecked = new AnimatedNumber(this);
  private _animatedTotal = new AnimatedNumber(this);

  private trips = fromStore(this, store, (s: AppState) => s.data.trips);
  private facets = fromStore(this, store, (s: AppState) => s.data.facets);
  private items = fromStore(this, store, (s: AppState) => s.data.items);
  private selectedTripId = fromStore(this, store, (s: AppState) => s.selectedTripId);

  private handleAddTrip(e: SubmitEvent) {
    e.preventDefault();
    const form = e.target as HTMLFormElement;
    const input = form.querySelector("input") as HTMLInputElement;
    const name = input.value.trim();
    if (!name) return;
    store.put({
      id: "trip/create",
      data: { id: newTripId(), name, createdAt: new Date().toISOString() },
    });
    input.value = "";
    input.focus();
  }

  private renderList() {
    const trips = this.trips.value;
    const facets = this.facets.value;
    const facetMap = new Map(facets.map((f) => [f.id, f]));

    return html`
      <div class="screen-header">
        <div class="screen-eyebrow">
          <span>SECTION 01</span>
          <span class="accent">${trips.length} TRIP${trips.length !== 1 ? "S" : ""}</span>
        </div>
        <div class="screen-title">Trips</div>
      </div>
      <div class="screen-body">
        <form class="add-form" @submit=${this.handleAddTrip}>
          <input type="text" placeholder="New trip name..." />
          <button type="submit">Add</button>
        </form>

        ${trips.length === 0
          ? html`<p class="empty">No trips yet. Create one above.</p>`
          : trips.map((trip) => {
              const progress = packProgress(trip, facets);
              const pct = progress.total > 0 ? progress.checked / progress.total : 0;
              return html`
                <div
                  class="trip-card"
                  @click=${() => store.put({ id: "nav/select-trip", data: { tripId: trip.id } })}
                >
                  <div class="trip-meta-line">
                    <span>${progress.checked === progress.total && progress.total > 0 ? "DONE" : "DRAFT"}</span>
                  </div>
                  <div class="trip-name">${trip.name}</div>
                  ${trip.facetIds.length > 0
                    ? html`
                      <div class="trip-facets">
                        ${trip.facetIds.map((fid) => {
                          const f = facetMap.get(fid);
                          return f ? html`<span class="facet-chip">${f.name}</span>` : nothing;
                        })}
                      </div>
                    `
                    : nothing}
                  <div class="progress-row">
                    <div class="progress-bar">
                      <div class="progress-fill" style="transform: scaleX(${pct})"></div>
                    </div>
                    <span class="progress-text">${progress.checked}/${progress.total}</span>
                  </div>
                  <button
                    class="delete-btn"
                    @click=${(e: Event) => {
                      e.stopPropagation();
                      store.put({ id: "trip/delete", data: { id: trip.id } });
                    }}
                  >&times;</button>
                </div>
              `;
            })}
      </div>
    `;
  }

  private renderDetail(trip: Trip) {
    const facets = this.facets.value;
    const items = this.items.value;
    const progress = packProgress(trip, facets);
    const pct = progress.total > 0 ? progress.checked / progress.total : 0;
    const facetMap = new Map(facets.map((f) => [f.id, f]));

    this._animatedChecked.target = progress.checked;
    this._animatedTotal.target = progress.total;

    return html`
      <div class="detail-header">
        <button class="back-link" @click=${() => store.put({ id: "nav/select-trip", data: { tripId: null } })}>
          <span>\u2190 TRIPS</span>
          <span class="accent">PACKING</span>
        </button>
        <div class="screen-title">${trip.name}</div>
        <div class="screen-sub">${trip.facetIds.length} FACET${trip.facetIds.length !== 1 ? "S" : ""}</div>
      </div>

      <div class="pack-progress-block">
        <div class="pack-counter">
          <span class="big">${Math.round(this._animatedChecked.value)}</span>
          <span class="of">/ ${Math.round(this._animatedTotal.value)}</span>
          <span class="label">PACKED</span>
        </div>
        <div class="big-progress-bar">
          <div class="big-progress-fill" style="transform: scaleX(${pct})"></div>
        </div>
      </div>

      <div class="facet-toggles">
        ${facets.map((facet) => {
          const active = trip.facetIds.includes(facet.id);
          return html`
            <button
              class="facet-toggle ${active ? "active" : ""}"
              @click=${() =>
                active
                  ? store.put({ id: "trip/remove-facet", data: { tripId: trip.id, facetId: facet.id } })
                  : store.put({ id: "trip/add-facet", data: { tripId: trip.id, facetId: facet.id } })}
            >${facet.name}</button>
          `;
        })}
      </div>

      <div class="screen-body" style="padding-top: 0;">
        ${(() => {
          // Count how many selected facets each item appears in
          const itemFacetCount = new Map<string, number>();
          for (const fid of trip.facetIds) {
            const f = facetMap.get(fid);
            if (!f) continue;
            for (const itemId of f.itemIds) {
              itemFacetCount.set(itemId, (itemFacetCount.get(itemId) ?? 0) + 1);
            }
          }

          const sharedIds = new Set<string>();
          for (const [id, count] of itemFacetCount) {
            if (count > 1) sharedIds.add(id);
          }

          const sortByChecked = (ids: readonly string[]) =>
            [...ids].sort((a, b) => {
              const ac = trip.checked.has(a) ? 1 : 0;
              const bc = trip.checked.has(b) ? 1 : 0;
              return ac - bc;
            });

          const renderSection = (name: string, itemIds: string[]) => {
            if (itemIds.length === 0) return nothing;
            const checkedCount = itemIds.filter((id) => trip.checked.has(id)).length;
            return html`
              <div class="facet-section">
                <div class="facet-section-header">
                  <span class="facet-section-name">${name}</span>
                  <span class="facet-section-count">${checkedCount} / ${itemIds.length}</span>
                </div>
                ${itemIds.map((itemId) => {
                  const item = items.find((i) => i.id === itemId);
                  const checked = trip.checked.has(itemId);
                  return html`
                    <div
                      class="check-row ${checked ? "checked" : ""}"
                      ${animate({ keyframeOptions: { duration: 300, easing: 'ease-in-out' }, skipInitial: true })}
                      @click=${() => store.put({ id: "trip/toggle-checked", data: { tripId: trip.id, itemId } })}
                    >
                      <div class="check-box"></div>
                      <div class="check-label">${item?.name ?? "(deleted)"}</div>
                    </div>
                  `;
                })}
              </div>
            `;
          };

          // Per-facet sections (exclusive items only)
          const facetSections = trip.facetIds.map((facetId) => {
            const facet = facetMap.get(facetId);
            if (!facet) return nothing;
            const exclusive = sortByChecked(facet.itemIds.filter((id) => !sharedIds.has(id)));
            return renderSection(facet.name, exclusive);
          });

          // Group shared items by their exact facet combination
          const itemToFacets = new Map<string, string[]>();
          for (const fid of trip.facetIds) {
            const f = facetMap.get(fid);
            if (!f) continue;
            for (const id of f.itemIds) {
              if (sharedIds.has(id)) {
                const list = itemToFacets.get(id) ?? [];
                list.push(fid);
                itemToFacets.set(id, list);
              }
            }
          }

          // Group by facet combo key
          const comboGroups = new Map<string, string[]>();
          for (const [itemId, fids] of itemToFacets) {
            const key = fids.join("+");
            const group = comboGroups.get(key) ?? [];
            group.push(itemId);
            comboGroups.set(key, group);
          }

          const sharedSections = [...comboGroups.entries()].map(([key, itemIds]) => {
            const facetNames = key.split("+").map((fid) => facetMap.get(fid)?.name ?? fid);
            return renderSection(facetNames.join(" + "), sortByChecked(itemIds));
          });

          return [...sharedSections, ...facetSections];
        })()}

        <div class="actions">
          <button @click=${() => store.put({ id: "trip/reset-checks", data: { tripId: trip.id } })}>
            Reset all
          </button>
        </div>
      </div>
    `;
  }

  render() {
    const selectedId = this.selectedTripId.value;
    const selectedTrip = selectedId
      ? this.trips.value.find((t) => t.id === selectedId) ?? null
      : null;

    return selectedTrip ? this.renderDetail(selectedTrip) : this.renderList();
  }
}
