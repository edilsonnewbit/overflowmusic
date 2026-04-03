import "reflect-metadata";
import assert from "node:assert/strict";
import test from "node:test";
import { UnauthorizedException } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AuthService } from "../auth/auth.service";
import { ChecklistRunsController } from "./checklist-runs.controller";
import { ChecklistRunsService } from "./checklist-runs.service";
import { ChecklistTemplatesController } from "./checklist-templates.controller";
import { ChecklistTemplatesService } from "./checklist-templates.service";

async function createTestApp(
  adminKey: string,
  options?: {
    allowUserToken?: boolean;
  },
) {
  process.env.ADMIN_API_KEY = adminKey;
  Reflect.defineMetadata("design:paramtypes", [ChecklistTemplatesService, AuthService], ChecklistTemplatesController);
  Reflect.defineMetadata("design:paramtypes", [ChecklistRunsService, AuthService], ChecklistRunsController);

  let createTemplateInput: unknown = null;
  let upsertRunInput: { eventId: string; body: unknown } | null = null;
  let updateItemInput: { eventId: string; itemId: string; body: unknown } | null = null;
  let lastManagedToken: string | null = null;

  const templatesServiceMock = {
    list: async () => ({ ok: true, templates: [] }),
    create: async (body: unknown) => {
      createTemplateInput = body;
      return { ok: true, template: body };
    },
    update: async () => ({ ok: true }),
    remove: async () => ({ ok: true }),
  };

  const runsServiceMock = {
    getByEvent: async (eventId: string) => ({ ok: true, checklist: { eventId, items: [] } }),
    upsertByEvent: async (eventId: string, body: unknown) => {
      upsertRunInput = { eventId, body };
      return { ok: true, checklist: { eventId } };
    },
    updateItem: async (eventId: string, itemId: string, body: unknown) => {
      updateItemInput = { eventId, itemId, body };
      return { ok: true, item: { id: itemId } };
    },
  };

  const authServiceMock = {
    assertCanManageContent: async (accessToken: string) => {
      lastManagedToken = accessToken;
      if (options?.allowUserToken) {
        return;
      }
      throw new UnauthorizedException("unauthorized");
    },
  };

  const moduleRef = await Test.createTestingModule({
    controllers: [ChecklistTemplatesController, ChecklistRunsController],
    providers: [
      { provide: ChecklistTemplatesService, useValue: templatesServiceMock },
      { provide: ChecklistRunsService, useValue: runsServiceMock },
      { provide: AuthService, useValue: authServiceMock },
    ],
  }).compile();

  const app = moduleRef.createNestApplication();
  await app.init();

  return {
    app,
    getCreateTemplateInput: () => createTemplateInput,
    getUpsertRunInput: () => upsertRunInput,
    getUpdateItemInput: () => updateItemInput,
    getLastManagedToken: () => lastManagedToken,
  };
}

test("GET /api/checklists/templates -> 200", async () => {
  const { app } = await createTestApp("secret_key");

  const response = await request(app.getHttpServer()).get("/api/checklists/templates").expect(200);
  assert.equal(response.body.ok, true);

  await app.close();
});

test("POST /api/checklists/templates -> 401 sem admin key", async () => {
  const { app } = await createTestApp("secret_key");

  await request(app.getHttpServer())
    .post("/api/checklists/templates")
    .send({ name: "Culto Domingo", items: ["Mic check"] })
    .expect(401);

  await app.close();
});

test("POST /api/checklists/templates -> 201 com admin key", async () => {
  const { app, getCreateTemplateInput } = await createTestApp("secret_key");

  await request(app.getHttpServer())
    .post("/api/checklists/templates")
    .set("Authorization", "Bearer secret_key")
    .send({ name: "Culto Domingo", items: ["Mic check"] })
    .expect(201);

  assert.deepEqual(getCreateTemplateInput(), {
    name: "Culto Domingo",
    items: ["Mic check"],
  });

  await app.close();
});

test("POST /api/checklists/templates -> 201 com token de usuário autorizado", async () => {
  const { app, getCreateTemplateInput, getLastManagedToken } = await createTestApp("secret_key", {
    allowUserToken: true,
  });

  await request(app.getHttpServer())
    .post("/api/checklists/templates")
    .set("Authorization", "Bearer leader_access_token")
    .send({ name: "Culto Domingo", items: ["Mic check"] })
    .expect(201);

  assert.equal(getLastManagedToken(), "leader_access_token");
  assert.deepEqual(getCreateTemplateInput(), {
    name: "Culto Domingo",
    items: ["Mic check"],
  });

  await app.close();
});

test("POST /api/checklists/templates -> 401 com token de usuário sem permissão", async () => {
  const { app, getLastManagedToken } = await createTestApp("secret_key", {
    allowUserToken: false,
  });

  await request(app.getHttpServer())
    .post("/api/checklists/templates")
    .set("Authorization", "Bearer member_access_token")
    .send({ name: "Culto Domingo", items: ["Mic check"] })
    .expect(401);

  assert.equal(getLastManagedToken(), "member_access_token");

  await app.close();
});

test("PUT /api/events/:eventId/checklist -> 201 com admin key", async () => {
  const { app, getUpsertRunInput } = await createTestApp("secret_key");

  await request(app.getHttpServer())
    .put("/api/events/event_1/checklist")
    .set("Authorization", "Bearer secret_key")
    .send({ items: [{ label: "Checar cabos", checked: false }] })
    .expect(200);

  assert.deepEqual(getUpsertRunInput(), {
    eventId: "event_1",
    body: { items: [{ label: "Checar cabos", checked: false }] },
  });

  await app.close();
});

test("PATCH /api/events/:eventId/checklist/items/:itemId -> 200 com admin key", async () => {
  const { app, getUpdateItemInput } = await createTestApp("secret_key");

  await request(app.getHttpServer())
    .patch("/api/events/event_1/checklist/items/item_1")
    .set("Authorization", "Bearer secret_key")
    .send({ checked: true, checkedByName: "Líder" })
    .expect(200);

  assert.deepEqual(getUpdateItemInput(), {
    eventId: "event_1",
    itemId: "item_1",
    body: { checked: true, checkedByName: "Líder" },
  });

  await app.close();
});
