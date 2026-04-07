import { getStore, initStore } from "./state.ts";

async function main() {
  const app = document.getElementById("app")!;

  try {
    await initStore();
    const store = getStore();
    app.innerHTML = `
      <h1>Turbolists</h1>
      <p>Store loaded successfully.</p>
      <ul>
        <li>Items: ${store.items.length}</li>
        <li>Facets: ${store.facets.length}</li>
        <li>Trips: ${store.trips.length}</li>
      </ul>
    `;
  } catch (e) {
    app.innerHTML = `<h1>Turbolists</h1><p>Error loading store: ${e}</p>`;
  }
}

main();
