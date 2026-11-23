// D-080: rules of the app-wide notification stack
// (src/features/notifications/notificationList.ts).
//
// Run from the repository root (Node 22):
//
//   node --experimental-strip-types --test "tests/**/*.test.ts"
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MAX_VISIBLE,
  addNotification,
  markUndone,
  removeNotification,
  type AppNotification,
  type NotificationKind,
} from "../../src/features/notifications/notificationList.ts";

function make(id: string, kind: NotificationKind = "info"): AppNotification {
  return { id, kind, text: `text ${id}` };
}

function fill(kinds: NotificationKind[]): AppNotification[] {
  return kinds.map((kind, index) => make(`n${index + 1}`, kind));
}

const ids = (list: AppNotification[]) => list.map((item) => item.id);

test("a new notification goes at the bottom (end of the list)", () => {
  const { list, removed } = addNotification(fill(["info", "undo"]), make("new"));
  assert.deepEqual(ids(list), ["n1", "n2", "new"]);
  assert.deepEqual(removed, []);
});

test("a 6th notification pushes out the oldest non-error", () => {
  const start = fill(["error", "undo", "info", "info", "info"]);
  assert.equal(start.length, MAX_VISIBLE);
  const { list, removed } = addNotification(start, make("new"));
  assert.deepEqual(ids(list), ["n1", "n3", "n4", "n5", "new"]);
  assert.deepEqual(ids(removed), ["n2"], "the undo notice is returned so its action can be sent");
});

test("errors are pushed out only when all visible ones are errors", () => {
  const start = fill(["error", "error", "error", "error", "error"]);
  const { list, removed } = addNotification(start, make("new", "error"));
  assert.deepEqual(ids(list), ["n2", "n3", "n4", "n5", "new"]);
  assert.deepEqual(ids(removed), ["n1"]);
});

test("a new info notice can push out an older one even among errors", () => {
  const start = fill(["error", "error", "error", "error", "info"]);
  const { list, removed } = addNotification(start, make("new"));
  assert.deepEqual(ids(list), ["n1", "n2", "n3", "n4", "new"]);
  assert.deepEqual(ids(removed), ["n5"]);
});

test("removeNotification removes only that one", () => {
  assert.deepEqual(ids(removeNotification(fill(["info", "undo", "error"]), "n2")), ["n1", "n3"]);
});

test("markUndone turns the notice into an info 'Undone.' in the same place", () => {
  const start: AppNotification[] = [make("a"), { id: "b", kind: "undo", text: "Deleted 1 copy." }, make("c")];
  const next = markUndone(start, "b");
  assert.deepEqual(ids(next), ["a", "b", "c"]);
  assert.deepEqual(next[1], { id: "b", kind: "info", text: "Undone." });
  assert.equal(next[0], start[0], "the others are the same objects");
});
