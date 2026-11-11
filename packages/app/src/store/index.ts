import { Effect, ManagedRuntime } from "effect";
import { createStoreRef, makeStore } from "@zaymonoid/katha";
import { emptyStore } from "@turbolists/core/store";
import type { AppAction, AppState } from "./state.ts";
import { appReducer } from "./reducer.ts";
import { rootProcess } from "./process.ts";

const initialState: AppState = {
  data: emptyStore(),
  undo: null,
  loadStatus: "loading",
  persistence: "saved",
  view: "trips",
  selectedTripId: null,
};

class AppStore extends Effect.Service<AppStore>()("AppStore", {
  scoped: makeStore<AppState, AppAction, never>({
    initialState,
    reduce: appReducer,
    process: rootProcess,
  }),
}) {}

const { ref: store, attach } = createStoreRef<AppState, AppAction>(
  initialState,
);

const appRuntime = ManagedRuntime.make(AppStore.Default);
appRuntime.runPromise(AppStore).then(attach);

export { store };
export type { AppAction, AppState };
