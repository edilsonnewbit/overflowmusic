import "reflect-metadata";
import assert from "node:assert/strict";
import test from "node:test";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";

// ── helpers ──────────────────────────────────────────────────────────────────

const ADMIN_KEY = "test_admin_key";

type FakeUser = {
  id: string;
  name: string;
  email: string;
  googleSub: string;
  role: string;
  status: string;
  createdAt: string;
  reviewedAt: string | null;
};

function makeUser(overrides: Partial<FakeUser> = {}): FakeUser {
  return {
    id: "u1",
    name: "Test User",
    email: "test@overflow.com",
    googleSub: "sub:u1",
    role: "MEMBER",
    status: "APPROVED",
    createdAt: new Date().toISOString(),
    reviewedAt: null,
    ...overrides,
  };
}

async function createTestApp(options: {
  getMeResult?: FakeUser | null;
  updateMeResult?: FakeUser | null;
  loginResult?: Record<string, unknown>;
  approvedUsers?: FakeUser[];
  pendingUsers?: FakeUser[];
  approveResult?: FakeUser | null;
  rejectResult?: FakeUser | null;
} = {}) {
  process.env.ADMIN_API_KEY = ADMIN_KEY;
  process.env.AUTH_BOOTSTRAP_MODE = "true";

  const user = makeUser();

  const authServiceMock = {
    googleLogin: async () =>
      options.loginResult ?? { ok: true, status: "APPROVED", user, accessToken: "tok.en.here" },

    getMe: async () => {
      if (options.getMeResult === null) throw new Error("unauthorized");
      return { ok: true, user: options.getMeResult ?? user };
    },

    updateMe: async (_token: string, data: { name?: string }) => {
      if (options.updateMeResult === null) throw new Error("unauthorized");
      const updated = { ...(options.updateMeResult ?? user), name: data.name ?? user.name };
      return { ok: true, user: updated };
    },

    listApprovedUsers: async () => ({
      ok: true,
      users: options.approvedUsers ?? [user],
    }),

    listPendingUsers: async () => ({
      ok: true,
      users: options.pendingUsers ?? [],
    }),

    approveUser: async (_userId: string, role: string) => {
      if (options.approveResult === null) throw new Error("user not found");
      return { ok: true, user: { ...(options.approveResult ?? user), role } };
    },

    rejectUser: async () => {
      if (options.rejectResult === null) throw new Error("user not found");
      return { ok: true, user: options.rejectResult ?? user };
    },
  };

  Reflect.defineMetadata("design:paramtypes", [AuthService], AuthController);

  const moduleRef = await Test.createTestingModule({
    controllers: [AuthController],
    providers: [{ provide: AuthService, useValue: authServiceMock }],
  }).compile();

  const app = moduleRef.createNestApplication();
  await app.init();
  return app;
}

// ── POST /api/auth/google ─────────────────────────────────────────────────────

test("POST /api/auth/google -> 400 sem body", async () => {
  const app = await createTestApp();
  await request(app.getHttpServer())
    .post("/api/auth/google")
    .send({})
    .expect(400);
  await app.close();
});

test("POST /api/auth/google -> 201 em bootstrap mode", async () => {
  const app = await createTestApp();
  const res = await request(app.getHttpServer())
    .post("/api/auth/google")
    .send({ email: "a@b.com", name: "Alice", googleSub: "sub:alice" })
    .expect(201);
  assert.equal(res.body.ok, true);
  await app.close();
});

// ── GET /api/auth/me ──────────────────────────────────────────────────────────

test("GET /api/auth/me -> 401 sem token", async () => {
  const app = await createTestApp();
  await request(app.getHttpServer()).get("/api/auth/me").expect(401);
  await app.close();
});

test("GET /api/auth/me -> 200 com token válido", async () => {
  const app = await createTestApp();
  const res = await request(app.getHttpServer())
    .get("/api/auth/me")
    .set("Authorization", "Bearer any.valid.token")
    .expect(200);
  assert.equal(res.body.ok, true);
  assert.equal(res.body.user.email, "test@overflow.com");
  await app.close();
});

// ── PATCH /api/auth/me ────────────────────────────────────────────────────────

test("PATCH /api/auth/me -> 401 sem token", async () => {
  const app = await createTestApp();
  await request(app.getHttpServer())
    .patch("/api/auth/me")
    .send({ name: "Novo" })
    .expect(401);
  await app.close();
});

test("PATCH /api/auth/me -> 200 e retorna nome atualizado", async () => {
  const app = await createTestApp();
  const res = await request(app.getHttpServer())
    .patch("/api/auth/me")
    .set("Authorization", "Bearer any.valid.token")
    .send({ name: "Novo Nome" })
    .expect(200);
  assert.equal(res.body.ok, true);
  assert.equal(res.body.user.name, "Novo Nome");
  await app.close();
});

// ── GET /api/admin/users ──────────────────────────────────────────────────────

test("GET /api/admin/users -> 401 sem admin key", async () => {
  const app = await createTestApp();
  await request(app.getHttpServer()).get("/api/admin/users").expect(401);
  await app.close();
});

test("GET /api/admin/users -> 200 com admin key e retorna lista", async () => {
  const alice = makeUser({ name: "Alice", role: "LEADER" });
  const app = await createTestApp({ approvedUsers: [alice] });
  const res = await request(app.getHttpServer())
    .get("/api/admin/users")
    .set("Authorization", `Bearer ${ADMIN_KEY}`)
    .expect(200);
  assert.equal(res.body.ok, true);
  assert.ok(Array.isArray(res.body.users));
  assert.equal(res.body.users[0].name, "Alice");
  await app.close();
});

// ── GET /api/admin/users/pending ──────────────────────────────────────────────

test("GET /api/admin/users/pending -> 401 sem admin key", async () => {
  const app = await createTestApp();
  await request(app.getHttpServer()).get("/api/admin/users/pending").expect(401);
  await app.close();
});

test("GET /api/admin/users/pending -> 200 com admin key", async () => {
  const pending = makeUser({ status: "PENDING_APPROVAL" });
  const app = await createTestApp({ pendingUsers: [pending] });
  const res = await request(app.getHttpServer())
    .get("/api/admin/users/pending")
    .set("Authorization", `Bearer ${ADMIN_KEY}`)
    .expect(200);
  assert.equal(res.body.ok, true);
  assert.equal(res.body.users.length, 1);
  await app.close();
});

// ── POST /api/admin/users/:userId/approve ─────────────────────────────────────

test("POST /api/admin/users/:userId/approve -> 401 sem admin key", async () => {
  const app = await createTestApp();
  await request(app.getHttpServer())
    .post("/api/admin/users/u1/approve")
    .send({ role: "LEADER" })
    .expect(401);
  await app.close();
});

test("POST /api/admin/users/:userId/approve -> 201 com admin key e role", async () => {
  const app = await createTestApp();
  const res = await request(app.getHttpServer())
    .post("/api/admin/users/u1/approve")
    .set("Authorization", `Bearer ${ADMIN_KEY}`)
    .send({ role: "LEADER" })
    .expect(201);
  assert.equal(res.body.ok, true);
  assert.equal(res.body.user.role, "LEADER");
  await app.close();
});

// ── POST /api/admin/users/:userId/reject ──────────────────────────────────────

test("POST /api/admin/users/:userId/reject -> 401 sem admin key", async () => {
  const app = await createTestApp();
  await request(app.getHttpServer())
    .post("/api/admin/users/u1/reject")
    .expect(401);
  await app.close();
});

test("POST /api/admin/users/:userId/reject -> 201 com admin key", async () => {
  const app = await createTestApp();
  const res = await request(app.getHttpServer())
    .post("/api/admin/users/u1/reject")
    .set("Authorization", `Bearer ${ADMIN_KEY}`)
    .expect(201);
  assert.equal(res.body.ok, true);
  await app.close();
});
