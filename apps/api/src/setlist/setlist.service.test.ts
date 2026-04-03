import assert from "node:assert/strict";
import test from "node:test";
import { BadRequestException } from "@nestjs/common";
import { SetlistService } from "./setlist.service";

// ── helpers ──────────────────────────────────────────────────────────────────

type FakeItem = {
  id: string;
  setlistId: string;
  songTitle: string;
  order: number;
  key: string | null;
  leaderName: string | null;
  zone: string | null;
  transitionNotes: string | null;
};

function makeSetlistPrisma(items: FakeItem[] = []) {
  const setlist = { id: "sl1", eventId: "ev1", title: null, notes: null, items };

  return {
    event: {
      findUnique: async () => ({ id: "ev1" }),
    },
    setlist: {
      findUnique: async () => ({ ...setlist, items }),
      upsert: async () => ({ ...setlist, items }),
    },
    setlistItem: {
      findFirst: async ({ where }: { where: Record<string, unknown> }) => {
        if (where.setlistId && !where.id) {
          return items.length > 0 ? items[items.length - 1] : null;
        }
        return items.find((it) => it.id === where.id && it.setlistId === where.setlistId) ?? null;
      },
      findMany: async ({ where }: { where: { setlistId: string; id?: { in?: string[] } } }) => {
        if (where.id?.in) {
          return items.filter((it) => where.id!.in!.includes(it.id));
        }
        return items.filter((it) => it.setlistId === where.setlistId);
      },
      create: async ({ data }: { data: Record<string, unknown> }) => ({
        id: "item_new",
        setlistId: "sl1",
        ...data,
      }),
      update: async ({ where, data }: { where: { id: string }; data: Record<string, unknown> }) => {
        const item = items.find((it) => it.id === where.id);
        return { ...item, ...data };
      },
      delete: async () => ({}),
    },
    $transaction: async (ops: unknown[]) => Promise.all(ops),
  };
}

function makeService(items: FakeItem[] = []): SetlistService {
  return new SetlistService(makeSetlistPrisma(items) as never);
}

// ── reorder ───────────────────────────────────────────────────────────────────

test("SetlistService.reorder: reordena itens corretamente", async () => {
  const items: FakeItem[] = [
    { id: "i1", setlistId: "sl1", songTitle: "Song A", order: 1, key: null, leaderName: null, zone: null, transitionNotes: null },
    { id: "i2", setlistId: "sl1", songTitle: "Song B", order: 2, key: null, leaderName: null, zone: null, transitionNotes: null },
    { id: "i3", setlistId: "sl1", songTitle: "Song C", order: 3, key: null, leaderName: null, zone: null, transitionNotes: null },
  ];

  const updatedOrders: Array<{ id: string; order: number }> = [];
  const prisma = {
    ...makeSetlistPrisma(items),
    setlistItem: {
      ...makeSetlistPrisma(items).setlistItem,
      update: async ({ where, data }: { where: { id: string }; data: { order?: number } }) => {
        updatedOrders.push({ id: where.id, order: data.order ?? 0 });
        return { id: where.id };
      },
    },
    $transaction: async (ops: Array<Promise<unknown>>) => Promise.all(ops),
  };

  const service = new SetlistService(prisma as never);
  const result = await service.reorder("ev1", {
    items: [
      { id: "i1", order: 2 },
      { id: "i2", order: 1 },
      { id: "i3", order: 3 },
    ],
  });

  assert.equal(result.ok, true);
  assert.equal(updatedOrders.length, 3);
  const byId = Object.fromEntries(updatedOrders.map((u) => [u.id, u.order]));
  assert.equal(byId.i1, 2);
  assert.equal(byId.i2, 1);
  assert.equal(byId.i3, 3);
});

test("SetlistService.reorder: rejeita items vazio", async () => {
  const service = makeService([
    { id: "i1", setlistId: "sl1", songTitle: "Song A", order: 1, key: null, leaderName: null, zone: null, transitionNotes: null },
  ]);

  await assert.rejects(
    () => service.reorder("ev1", { items: [] }),
    (err: unknown) => {
      assert.ok(err instanceof BadRequestException);
      return true;
    },
  );
});

test("SetlistService.reorder: rejeita item que não pertence ao setlist", async () => {
  const items: FakeItem[] = [
    { id: "i1", setlistId: "sl1", songTitle: "Song A", order: 1, key: null, leaderName: null, zone: null, transitionNotes: null },
  ];

  const service = makeService(items);
  await assert.rejects(
    () => service.reorder("ev1", { items: [{ id: "i_foreign", order: 1 }] }),
    (err: unknown) => {
      assert.ok(err instanceof BadRequestException);
      return true;
    },
  );
});

// ── addItem ───────────────────────────────────────────────────────────────────

test("SetlistService.addItem: adiciona item com order auto-incrementado", async () => {
  const items: FakeItem[] = [
    { id: "i1", setlistId: "sl1", songTitle: "Song A", order: 3, key: null, leaderName: null, zone: null, transitionNotes: null },
  ];

  let createdData: Record<string, unknown> | null = null;
  const prisma = {
    ...makeSetlistPrisma(items),
    setlistItem: {
      ...makeSetlistPrisma(items).setlistItem,
      create: async ({ data }: { data: Record<string, unknown> }) => {
        createdData = data;
        return { id: "item_new", setlistId: "sl1", ...data };
      },
    },
  };

  const service = new SetlistService(prisma as never);
  const result = await service.addItem("ev1", { songTitle: "Song B" });

  assert.equal(result.ok, true);
  assert.equal(createdData?.songTitle, "Song B");
  assert.equal(createdData?.order, 4);
});

test("SetlistService.addItem: rejeita songTitle vazio", async () => {
  const service = makeService();
  await assert.rejects(
    () => service.addItem("ev1", { songTitle: "  " }),
    (err: unknown) => {
      assert.ok(err instanceof BadRequestException);
      return true;
    },
  );
});

// ── getByEvent ────────────────────────────────────────────────────────────────

test("SetlistService.getByEvent: retorna null quando não existe setlist", async () => {
  const prisma = {
    event: { findUnique: async () => ({ id: "ev1" }) },
    setlist: { findUnique: async () => null },
    setlistItem: { findFirst: async () => null, findMany: async () => [], create: async () => ({}), update: async () => ({}), delete: async () => ({}) },
    $transaction: async (ops: Array<Promise<unknown>>) => Promise.all(ops),
  };

  const service = new SetlistService(prisma as never);
  const result = await service.getByEvent("ev1");
  assert.equal(result.ok, true);
  assert.equal(result.setlist, null);
});
