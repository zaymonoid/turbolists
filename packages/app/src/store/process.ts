import { Effect, PubSub, Stream } from "effect";
import type { Process } from "@zaymonoid/katha";
import { storeToJson } from "@turbolists/core/store";
import { writeStore } from "../persist.ts";
import type { AppState, AppAction } from "./state.ts";
import { dataActionIds } from "./state.ts";
import { debounce, takeEvery } from "./combinators.ts";

const autoSave = debounce("500 millis", [...dataActionIds], (_action, ctx) =>
  Effect.gen(function* () {
    const state = yield* ctx.select();
    yield* Effect.tryPromise(() => writeStore(storeToJson(state.data)));
  }),
);

const hapticOnCheck = takeEvery(["trip/toggle-checked"], () =>
  Effect.tryPromise(() =>
    import("@tauri-apps/plugin-haptics").then((m) => m.impactFeedback("light")),
  ).pipe(Effect.ignore),
);

const logActions: Process<AppState, AppAction> = (ctx) =>
  PubSub.subscribe(ctx.actions).pipe(
    Effect.andThen((queue) =>
      Stream.fromQueue(queue).pipe(
        Stream.runForEach((action) =>
          Effect.log(`action: ${action.id}`, action.data),
        ),
      ),
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
