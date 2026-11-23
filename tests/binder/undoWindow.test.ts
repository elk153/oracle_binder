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
