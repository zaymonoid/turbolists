import { Effect, PubSub, Stream } from "effect";
import type { Process } from "@zaymonoid/katha";
import { storeToJson } from "@turbolists/core/store";
import { writeStore } from "../persist.ts";
import type { AppAction, AppState } from "./state.ts";
import { dataActionIds } from "./state.ts";
import { debounce, takeEvery } from "./combinators.ts";

const autoSave = debounce(
  "500 millis",
  [...dataActionIds, "store/retry-save"],
  (_action, ctx) =>
    Effect.gen(function* () {
      const state = yield* ctx.select();
      if (state.loadStatus !== "ready") return;
      yield* Effect.tryPromise(() => writeStore(storeToJson(state.data))).pipe(
        Effect.tap(() =>
          ctx.put({ id: "store/save-status", data: { status: "saved" } })
        ),
        Effect.catchAll((e) =>
          Effect.gen(function* () {
            yield* Effect.logError("auto-save failed", e);
            yield* ctx.put({
              id: "store/save-status",
              data: { status: "error" },
            });
          })
        ),
      );
    }),
);

const hapticOnCheck = takeEvery(
  ["trip/toggle-checked"],
  () =>
    Effect.tryPromise(() =>
      import("@tauri-apps/plugin-haptics").then((m) =>
        m.impactFeedback("light")
      )
    ).pipe(Effect.ignore),
);

const logActions: Process<AppState, AppAction> = (ctx) =>
  PubSub.subscribe(ctx.actions).pipe(
    Effect.andThen((queue) =>
      Stream.fromQueue(queue).pipe(
        Stream.runForEach((action) =>
          Effect.log(`action: ${action.id}`, action.data)
        ),
      )
    ),
    Effect.forkScoped,
    Effect.asVoid,
  );

export const rootProcess: Process<AppState, AppAction> = (ctx) =>
  Effect.gen(function* () {
    yield* logActions(ctx);
    yield* autoSave(ctx);
    yield* hapticOnCheck(ctx);
  });
