import { combinators } from "@zaymonoid/katha";
import type { AppState, AppAction } from "./state.ts";

export const { takeEvery, takeLatest, takeLeading, debounce } =
  combinators<AppState, AppAction>();
