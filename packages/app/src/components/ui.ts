import { css, html, render } from "lit";

export const icon = (name: string) => {
  const paths: Record<string, string> = {
    archive: "M5 8v13h14V8M3 3h18v5H3zM10 12h4",
    share: "M12 16V3m-4 4 4-4 4 4M7 10H4v11h16V10h-3",
    plus: "M12 5v14M5 12h14",
    back: "m14 6-6 6 6 6",
    chevron: "m9 5 7 7-7 7",
    edit: "m16 3 5 5-12 12-6 1 1-6L16 3Z M13 6l5 5",
    trash: "M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7",
    trips:
      "M5 7h14a2 2 0 0 1 2 2v11H3V9a2 2 0 0 1 2-2ZM8 7V3h8v4M8 11v5M16 11v5",
    kits: "m12 3 10 5-10 5L2 8l10-5ZM2 12l10 5 10-5M2 16l10 5 10-5",
    items: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
    check: "m5 12 4 4L19 6",
    search: "M21 21l-6-6M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z",
    close: "m6 6 12 12M6 18 18 6",
    grip: "M5 8h14M5 12h14M5 16h14",
  };
  return html`
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.7"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
    >
      <path d=${paths[name] ?? paths.items}></path>
    </svg>
  `;
};

export const viewStyles = css`
  :host {
    display: flex;
    flex-direction: column;
    flex: 1;
    min-height: 0;
  }
  * {
    box-sizing: border-box;
  }
  button,
  input {
    font: inherit;
  }
  button {
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }
  button:disabled {
    opacity: 0.4;
    cursor: default;
  }
  button:focus-visible,
  input:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 3px;
  }
  button {
    color: inherit;
  }
  .header {
    padding: 18px 22px 20px;
    display: flex;
    align-items: center;
    gap: 12px;
    flex-shrink: 0;
  }
  .header > div {
    flex: 1;
    min-width: 0;
  }
  h1 {
    font-size: 34px;
    line-height: 1.15;
    letter-spacing: -0.035em;
    margin: 0 0 6px;
    overflow-wrap: anywhere;
  }
  .subtitle {
    margin: 0;
    color: var(--ink-dim);
    font-size: 15px;
    line-height: 1.5;
  }
  .add-button {
    width: 46px;
    height: 46px;
    border-radius: 50%;
    background: var(--accent);
    color: var(--bg);
    border: 0;
    display: grid;
    place-items: center;
    flex-shrink: 0;
  }
  .body {
    overflow-y: auto;
    flex: 1;
    min-height: 0;
    padding: 0 18px 24px;
    overscroll-behavior: contain;
  }
  .card {
    border: 1px solid var(--line);
    border-radius: 18px;
    background: var(--panel);
    margin-bottom: 12px;
    overflow: hidden;
  }
  .card-main {
    display: block;
    width: 100%;
    padding: 18px;
    border: 0;
    background: none;
    text-align: left;
  }
  .card-title {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    font-size: 19px;
    font-weight: 650;
    overflow-wrap: anywhere;
  }
  .card-title svg {
    color: var(--ink-dim);
    flex-shrink: 0;
  }
  .meta {
    color: var(--ink-dim);
    font-size: 13px;
    line-height: 1.5;
    margin-top: 7px;
  }
  .toolbar {
    flex-wrap: wrap;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 6px;
    border-top: 1px solid var(--line);
    padding: 4px 10px;
  }
  .icon-button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 44px;
    min-height: 44px;
    border: 0;
    background: none;
    color: var(--ink-dim);
    border-radius: 12px;
    flex-shrink: 0;
  }
  .danger {
    color: var(--warn);
  }
  .text-button {
    min-height: 44px;
    min-width: 44px;
    padding: 10px 0;
    background: none;
    border: 0;
    color: var(--accent);
    font-weight: 600;
    border-radius: 12px;
  }
  .primary {
    display: inline-flex;
    gap: 8px;
    align-items: center;
    justify-content: center;
    min-height: 48px;
    padding: 12px 20px;
    background: var(--accent);
    color: var(--bg);
    border: 0;
    border-radius: 14px;
    font-weight: 650;
  }
  .empty {
    padding: 42px 16px;
    text-align: center;
  }
  .empty-icon {
    display: grid;
    place-items: center;
    width: 72px;
    height: 72px;
    border-radius: 24px;
    background: var(--panel-2);
    color: var(--accent);
    margin: 0 auto 22px;
  }
  .empty-icon svg {
    width: 32px;
    height: 32px;
  }
  .empty h2 {
    font-size: 23px;
    letter-spacing: -0.025em;
    margin: 0 0 10px;
  }
  .empty p {
    max-width: 290px;
    margin: 0 auto 24px;
    color: var(--ink-dim);
    line-height: 1.6;
    font-size: 16px;
  }
  .search {
    display: flex;
    align-items: center;
    gap: 10px;
    background: var(--panel-2);
    border: 1px solid var(--line);
    border-radius: 13px;
    padding: 0 13px;
    margin-bottom: 18px;
    color: var(--ink-dim);
  }
  .search input {
    width: 100%;
    min-width: 0;
    min-height: 48px;
    background: none;
    border: 0;
    color: var(--ink);
    font-size: 17px;
    outline: none;
  }
  .search:focus-within {
    border-color: var(--accent-dim);
  }
  input::placeholder {
    color: var(--ink-dim);
  }
  .row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 9px 10px 9px 18px;
    min-height: 68px;
  }
  .row + .row {
    border-top: 1px solid var(--line);
  }
  .row-label {
    flex: 1;
    min-width: 0;
    text-align: left;
    background: none;
    border: 0;
    padding: 8px 0;
  }
  .name {
    display: block;
    font-size: 17px;
    overflow-wrap: anywhere;
  }
  .row .meta {
    display: block;
    margin-top: 4px;
  }
  .section-label {
    color: var(--ink-dim);
    font-size: 13px;
    font-weight: 600;
    margin: 22px 4px 10px;
  }
  .chips {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
  }
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    font-size: 13px;
    padding: 7px 10px;
    background: var(--panel-2);
    border-radius: 9px;
    color: var(--ink-dim);
    overflow-wrap: anywhere;
  }
  .back {
    display: inline-flex;
    align-items: center;
    gap: 3px;
    min-height: 44px;
    padding: 0;
    background: none;
    border: 0;
    color: var(--accent);
    font-size: 17px;
  }
  .detail-header {
    padding: 0 22px 14px;
  }
  .detail-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 8px;
  }
  .detail-header h1 {
    font-size: 29px;
  }
  .nav-actions {
    display: flex;
    margin-right: -10px;
  }
  @media (prefers-reduced-motion: reduce) {
    * {
      animation: none !important;
      transition: none !important;
    }
  }
`;

interface DialogOptions {
  title: string;
  message?: string;
  value?: string;
  placeholder?: string;
  confirm?: string;
  destructive?: boolean;
}
let dialogOpen = false;
export function showDialog(options: DialogOptions): Promise<string | null> {
  if (dialogOpen) return Promise.resolve(null);
  dialogOpen = true;
  return new Promise((resolve) => {
    const dialog = document.createElement("dialog");
    dialog.className = "app-dialog";
    const isInput = options.value !== undefined;
    const viewport = window.visualViewport;
    const positionSheet = () => {
      if (!viewport) return;
      const keyboardInset = Math.max(
        0,
        window.innerHeight - viewport.height - viewport.offsetTop,
      );
      dialog.style.bottom = `${keyboardInset}px`;
      dialog.style.maxHeight = `${Math.max(160, viewport.height - 24)}px`;
    };
    const finish = (value: string | null) => {
      viewport?.removeEventListener("resize", positionSheet);
      viewport?.removeEventListener("scroll", positionSheet);
      dialog.close();
      dialog.remove();
      dialogOpen = false;
      resolve(value);
    };
    render(
      html`
        <form
          @submit=${(e: SubmitEvent) => {
            e.preventDefault();
            const input = dialog.querySelector<HTMLInputElement>("input");
            const value = input ? input.value.trim() : "confirmed";
            if (value) finish(value);
          }}
        >
                <div class="sheet-handle" aria-hidden="true"></div>
                <div class="sheet-nav">
                  <button type="button" @click=${() =>
                    finish(null)}>Cancel</button
                  ><button
                    class=${options.destructive ? "destructive" : ""}
                    type="submit"
                  >
                    ${options.confirm ?? "Save"}
                  </button>
                </div>
                <h2 id="dialog-title">${options.title}</h2>
                ${options.message ? html`<p>${options.message}</p>` : null}
                ${isInput
                  ? html`<label for="dialog-name">Name</label
                ><input
                  id="dialog-name"
                  aria-label=${options.placeholder ?? "Name"}
                  .value=${options.value!}
                  placeholder=${options.placeholder ?? "Name"}
                  autocomplete="off"
                  enterkeyhint="done"
                  maxlength="120"
                  pattern=${".*\\S.*"}
                  title="Enter a name with at least one non-space character"
                  required
                />`
                  : null}
              </form>
      `,
      dialog,
    );
    dialog.setAttribute("aria-labelledby", "dialog-title");
    dialog.addEventListener("cancel", (e) => {
      e.preventDefault();
      finish(null);
    });
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog) {
        const r = dialog.getBoundingClientRect();
        if (
          e.clientY < r.top ||
          e.clientY > r.bottom ||
          e.clientX < r.left ||
          e.clientX > r.right
        ) {
          finish(null);
        }
      }
    });
    document.body.append(dialog);
    dialog.showModal();
    positionSheet();
    viewport?.addEventListener("resize", positionSheet);
    viewport?.addEventListener("scroll", positionSheet);
    if (isInput) {
      const input = dialog.querySelector<HTMLInputElement>("input")!;
      input.focus();
      input.select();
    }
  });
}

export function navigate(view: "trips" | "kits" | "items") {
  document.dispatchEvent(new CustomEvent("app-navigate", { detail: view }));
}
