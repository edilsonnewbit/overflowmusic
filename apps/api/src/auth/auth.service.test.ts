import assert from "node:assert/strict";
import test from "node:test";
import { BadRequestException, UnauthorizedException } from "@nestjs/common";
import { AuthService } from "./auth.service";

// ── helpers ──────────────────────────────────────────────────────────────────

function makePrisma(overrides: Record<string, unknown> = {}) {
  const base = {
    user: {
      findUnique: async () => null,
      findMany: async () => [],
      create: async ({ data }: { data: Record<string, unknown> }) => ({
        id: "u1",
        name: data.name,
        email: data.email,
        googleSub: data.googleSub,
        role: data.role ?? "MEMBER",
        status: data.status ?? "PENDING_APPROVAL",
        createdAt: new Date(),
        reviewedAt: null,
      }),
      update: async ({ data }: { data: Record<string, unknown> }) => ({
        id: "u1",
        name: data.name ?? "Old Name",
        email: "user@test.com",
        googleSub: "sub:u1",
        role: "MEMBER",
        status: "APPROVED",
        createdAt: new Date(),
        reviewedAt: new Date(),
      }),
      upsert: async ({ create }: { create: Record<string, unknown> }) => create,
    },
    ...overrides,
  };
  return base;
}

function makeService(prismaOverrides: Record<string, unknown> = {}): AuthService {
  process.env.JWT_SECRET = "test_secret";
  const prisma = makePrisma(prismaOverrides);
  return new AuthService(prisma as any);
}

/** Generates a valid JWT for sub `userId` with role `role` via the service internals */
async function makeToken(service: AuthService, userId: string, role = "MEMBER"): Promise<string> {
  // Drive googleLogin to get an approved token
  let token = "";
  const prismaWithApproved = {
    user: {
      findUnique: async ({ where }: { where: Record<string, string> }) => {
        if (where.googleSub || where.email) {
          return {
            id: userId,
            name: "Test User",
            email: "user@test.com",
            googleSub: "sub:u1",
            role,
            status: "APPROVED",
            createdAt: new Date(),
            reviewedAt: new Date(),
          };
        }
        return null;
      },
      findMany: async () => [],
      upsert: async () => ({}),
    },
  };
  const svc = new AuthService(prismaWithApproved as any);
  const result = await svc.googleLogin({
    email: "user@test.com",
    name: "Test User",
    googleSub: "sub:u1",
  });
  if (result.status === "APPROVED") {
    token = result.accessToken;
  }
  return token;
}

// ── updateMe ─────────────────────────────────────────────────────────────────

test("AuthService.updateMe: atualiza nome do usuário aprovado", async () => {
  let updatedData: Record<string, unknown> | null = null;
  const prisma = {
    user: {
      findUnique: async ({ where }: { where: Record<string, string> }) => {
        if (where.id) {
          return {
            id: "u1",
            name: "Old Name",
            email: "user@test.com",
            googleSub: "sub:u1",
            role: "MEMBER",
            status: "APPROVED",
            createdAt: new Date(),
            reviewedAt: null,
          };
        }
        // For token generation (findUnique by googleSub/email)
        return {
          id: "u1",
          name: "Old Name",
          email: "user@test.com",
          googleSub: "sub:u1",
          role: "MEMBER",
          status: "APPROVED",
          createdAt: new Date(),
          reviewedAt: null,
        };
      },
      update: async ({ data }: { data: Record<string, unknown> }) => {
        updatedData = data;
        return {
          id: "u1",
          name: data.name,
          email: "user@test.com",
          googleSub: "sub:u1",
          role: "MEMBER",
          status: "APPROVED",
          createdAt: new Date(),
          reviewedAt: null,
        };
      },
      findMany: async () => [],
      upsert: async () => ({}),
    },
  };

  process.env.JWT_SECRET = "test_secret";
  const service = new AuthService(prisma as any);
  const token = await makeToken(service, "u1");

  const result = await service.updateMe(token, { name: "Novo Nome" });

  assert.equal(result.ok, true);
  assert.equal(result.user.name, "Novo Nome");
  assert.deepEqual(updatedData, { name: "Novo Nome" });
});

test("AuthService.updateMe: rejeita nome vazio", async () => {
  const prisma = {
    user: {
      findUnique: async () => ({
        id: "u1",
        name: "Old",
        email: "u@t.com",
        googleSub: "sub:u1",
        role: "MEMBER",
        status: "APPROVED",
        createdAt: new Date(),
        reviewedAt: null,
      }),
      findMany: async () => [],
      upsert: async () => ({}),
    },
  };
  process.env.JWT_SECRET = "test_secret";
  const service = new AuthService(prisma as any);
  const token = await makeToken(service, "u1");

  await assert.rejects(
    () => service.updateMe(token, { name: "   " }),
    (err: unknown) => {
      assert.ok(err instanceof BadRequestException);
      return true;
    },
  );
});

test("AuthService.updateMe: rejeita token inválido", async () => {
  const service = makeService();
  await assert.rejects(
    () => service.updateMe("not.a.token", { name: "Qualquer" }),
    (err: unknown) => {
      assert.ok(err instanceof UnauthorizedException);
      return true;
    },
  );
});

// ── listApprovedUsers ─────────────────────────────────────────────────────────

test("AuthService.listApprovedUsers: retorna apenas usuários APPROVED", async () => {
  const prisma = {
    user: {
      findMany: async ({ where }: { where: { status: string } }) => {
        assert.equal(where.status, "APPROVED");
        return [
          {
            id: "u1",
            name: "Alice",
            email: "alice@test.com",
            googleSub: "sub:alice",
            role: "LEADER",
            status: "APPROVED",
            createdAt: new Date(),
            reviewedAt: new Date(),
          },
        ];
      },
      upsert: async () => ({}),
    },
  };
  process.env.JWT_SECRET = "test_secret";
  const service = new AuthService(prisma as any);
  const result = await service.listApprovedUsers();

  assert.equal(result.ok, true);
  assert.equal(result.users.length, 1);
  assert.equal(result.users[0].name, "Alice");
  assert.equal(result.users[0].status, "APPROVED");
});

// ── googleLogin ───────────────────────────────────────────────────────────────

test("AuthService.googleLogin: cria usuário novo com PENDING_APPROVAL", async () => {
  let created: Record<string, unknown> | null = null;
  const prisma = {
    user: {
      findUnique: async () => null,
      create: async ({ data }: { data: Record<string, unknown> }) => {
        created = data;
        return {
          id: "u_new",
          ...data,
          createdAt: new Date(),
          reviewedAt: null,
        };
      },
      findMany: async () => [],
      upsert: async () => ({}),
    },
  };
  process.env.JWT_SECRET = "test_secret";
  const service = new AuthService(prisma as any);
  const result = await service.googleLogin({
    email: "new@test.com",
    name: "New User",
    googleSub: "sub:new",
  });

  assert.equal(result.status, "PENDING_APPROVAL");
  assert.equal(created?.status, "PENDING_APPROVAL");
  assert.equal(created?.role, "MEMBER");
});

test("AuthService.googleLogin: retorna accessToken para usuário APPROVED", async () => {
  const prisma = {
    user: {
      findUnique: async () => ({
        id: "u1",
        name: "Bob",
        email: "bob@test.com",
        googleSub: "sub:bob",
        role: "ADMIN",
        status: "APPROVED",
        createdAt: new Date(),
        reviewedAt: new Date(),
      }),
      findMany: async () => [],
      upsert: async () => ({}),
    },
  };
  process.env.JWT_SECRET = "test_secret";
  const service = new AuthService(prisma as any);
  const result = await service.googleLogin({
    email: "bob@test.com",
    name: "Bob",
    googleSub: "sub:bob",
  });

  assert.equal(result.status, "APPROVED");
  assert.ok("accessToken" in result && typeof result.accessToken === "string");
  assert.ok(result.accessToken.split(".").length === 3);
});
