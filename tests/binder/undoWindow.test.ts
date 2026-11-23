// D-079: the 8-second undo buffer (src/features/undoWindow.ts).
//
// Run from the repository root (Node 22):
//
//   node --experimental-strip-types --test "tests/**/*.test.ts"
//
// Timers are mocked, so "8 seconds" pass at once. The last test runs a real
// TanStack Query mutation: the list changes at once, and Undo puts it back
// without the request ever being made.
import { mock, test } from "node:test";
import assert from "node:assert/strict";
import { MutationObserver, QueryClient } from "@tanstack/query-core";
import {
  UNDO_WINDOW_MS,
  createUndoWindow,
  isUndoneError,
  type UndoWindow,
} from "../../src/features/undoWindow.ts";
import { patchLists, restoreLists, type ListSnapshot } from "../../src/features/optimisticCache.ts";

// Lets pending promise callbacks run.
const settle = () => new Promise<void>((resolve) => setImmediate(resolve));

async function outcome(undoWindow: UndoWindow): Promise<"sent" | "undone" | "waiting"> {
  let result: "sent" | "undone" | "waiting" = "waiting";
  undoWindow.wait.then(
    () => (result = "sent"),
    (error) => (result = isUndoneError(error) ? "undone" : "waiting"),
  );
  await settle();
  return result;
}

test("the request is sent once the 8 seconds have passed", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const undoWindow = createUndoWindow();
  t.mock.timers.tick(UNDO_WINDOW_MS - 1);
  assert.equal(await outcome(undoWindow), "waiting");
  assert.equal(undoWindow.isOpen(), true);
  t.mock.timers.tick(1);
  assert.equal(await outcome(undoWindow), "sent");
  assert.equal(undoWindow.isOpen(), false);
});

test("Undo within the window cancels the request", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const undoWindow = createUndoWindow();
  t.mock.timers.tick(3_000);
  undoWindow.undo();
  t.mock.timers.tick(UNDO_WINDOW_MS);
  assert.equal(await outcome(undoWindow), "undone");
});

test("Undo after the request was sent does nothing", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const undoWindow = createUndoWindow();
  undoWindow.sendNow();
  undoWindow.undo();
  assert.equal(await outcome(undoWindow), "sent");
});

test("Undo with nobody waiting yet is not an unhandled rejection", async () => {
  const unhandled = mock.fn();
  process.on("unhandledRejection", unhandled);
  try {
    createUndoWindow().undo();
    await settle();
    assert.equal(unhandled.mock.callCount(), 0);
  } finally {
    process.off("unhandledRejection", unhandled);
  }
});

test("a deferred mutation changes the list at once and Undo restores it unsent", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const queryClient = new QueryClient();
  const key = ["binderCopies", "user-1"];
  queryClient.setQueryData(key, [{ id: "c1" }, { id: "c2" }]);
  const request = mock.fn(async () => {});

  const observer = new MutationObserver<void, Error, { ids: string[]; undoWindow: UndoWindow }, ListSnapshot[]>(
    queryClient,
    {
      mutationFn: async ({ undoWindow }) => {
        await undoWindow.wait;
        await request();
      },
      onMutate: ({ ids }) =>
        patchLists(queryClient, [
          [key, (current: { id: string }[]) => current.filter((row) => !ids.includes(row.id))],
        ]),
      onError: (_error, _input, snapshots) => restoreLists(queryClient, snapshots),
    },
  );

  const undoWindow = createUndoWindow();
  const done = observer.mutate({ ids: ["c1"], undoWindow }).catch((error: unknown) => error);
  await settle();
  assert.deepEqual(queryClient.getQueryData(key), [{ id: "c2" }]);

  undoWindow.undo();
  const error = await done;
  assert.equal(isUndoneError(error), true);
  assert.deepEqual(queryClient.getQueryData(key), [{ id: "c1" }, { id: "c2" }]);
  assert.equal(request.mock.callCount(), 0);
});

// D-080: hovering a notification pauses its undo window. `Date` is mocked
// with `setTimeout`, so the remaining time is measured on the same clock.
test("pause stops the countdown and resume continues with the time left", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout", "Date"] });
  const undoWindow = createUndoWindow();
  t.mock.timers.tick(3_000);
  undoWindow.pause();
  assert.equal(undoWindow.isPaused(), true);
  t.mock.timers.tick(60_000);
  assert.equal(await outcome(undoWindow), "waiting", "a paused window is not sent");

  undoWindow.resume();
  assert.equal(undoWindow.isPaused(), false);
  t.mock.timers.tick(UNDO_WINDOW_MS - 3_000 - 1);
  assert.equal(await outcome(undoWindow), "waiting");
  t.mock.timers.tick(1);
  assert.equal(await outcome(undoWindow), "sent", "sent after the 5 s that were left");
});

test("pausing or resuming twice does not change the time left", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout", "Date"] });
  const undoWindow = createUndoWindow();
  t.mock.timers.tick(2_000);
  undoWindow.pause();
  t.mock.timers.tick(1_000);
  undoWindow.pause();
  undoWindow.resume();
  undoWindow.resume();
  t.mock.timers.tick(UNDO_WINDOW_MS - 2_000 - 1);
  assert.equal(await outcome(undoWindow), "waiting");
  t.mock.timers.tick(1);
  assert.equal(await outcome(undoWindow), "sent");
});

test("Undo and sendNow work while paused", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout", "Date"] });
  const undone = createUndoWindow();
  undone.pause();
  undone.undo();
  assert.equal(await outcome(undone), "undone");
  assert.equal(undone.isOpen(), false);
  assert.equal(undone.isPaused(), false, "an ended window is not paused");

  const sent = createUndoWindow();
  sent.pause();
  sent.sendNow();
  assert.equal(await outcome(sent), "sent");
});

test("pause and resume after the window ended do nothing", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout", "Date"] });
  const undoWindow = createUndoWindow();
  undoWindow.sendNow();
  undoWindow.pause();
  assert.equal(undoWindow.isPaused(), false);
  undoWindow.resume();
  assert.equal(await outcome(undoWindow), "sent");
});

// Runs last: it gives Node a stand-in `window` and `document`, so the module
// starts listening for page events (it only does so once).
test("a hidden page keeps its Undo; closing the page sends the request", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  const fakeWindow = new EventTarget();
  const fakeDocument = Object.assign(new EventTarget(), { visibilityState: "visible" });
  Object.assign(globalThis, { window: fakeWindow, document: fakeDocument });
  try {
    const undoWindow = createUndoWindow();

    fakeDocument.visibilityState = "hidden";
    fakeDocument.dispatchEvent(new Event("visibilitychange"));
    assert.equal(await outcome(undoWindow), "waiting", "switching away does not send");

    const paused = createUndoWindow();
    paused.pause();

    fakeWindow.dispatchEvent(new Event("pagehide"));
    assert.equal(await outcome(undoWindow), "sent", "closing the page sends at once");
    assert.equal(await outcome(paused), "sent", "a paused window is sent too");
  } finally {
    Reflect.deleteProperty(globalThis, "window");
    Reflect.deleteProperty(globalThis, "document");
  }
});
