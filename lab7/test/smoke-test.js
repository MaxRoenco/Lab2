import { spawn } from "node:child_process";
import { strict as assert } from "node:assert";
import { fileURLToPath } from "node:url";

const PORT = 4107;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const lab7Dir = fileURLToPath(new URL("../", import.meta.url));

const server = spawn(process.execPath, ["src/server.js"], {
  cwd: lab7Dir,
  env: {
    ...process.env,
    PORT: String(PORT),
    LAB7_JWT_SECRET: "lab7-smoke-test-secret",
  },
  stdio: ["ignore", "pipe", "pipe"],
});

let serverOutput = "";
server.stdout.on("data", (chunk) => {
  serverOutput += chunk.toString();
});
server.stderr.on("data", (chunk) => {
  serverOutput += chunk.toString();
});

function stopServer() {
  if (!server.killed) {
    server.kill();
  }
}

async function waitForServer() {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      const response = await fetch(`${BASE_URL}/`);
      if (response.ok) {
        return;
      }
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  throw new Error(`Server did not start.\n${serverOutput}`);
}

async function request(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, options);
  const text = await response.text();
  const body = text ? JSON.parse(text) : null;

  return { response, body };
}

async function getToken(role) {
  const { response, body } = await request("/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ role }),
  });

  assert.equal(response.status, 200);
  assert.equal(body.expiresIn, 60);
  assert.equal(body.role, role);
  assert.equal(typeof body.token, "string");

  return body.token;
}

try {
  await waitForServer();

  const docs = await fetch(`${BASE_URL}/docs`);
  assert.equal(docs.status, 200);
  assert.match(await docs.text(), /SwaggerUIBundle/);

  const openApi = await request("/openapi.json");
  assert.equal(openApi.response.status, 200);
  assert.ok(openApi.body.paths["/api/sessions"]);

  const visitorToken = await getToken("VISITOR");
  const writerToken = await getToken("WRITER");
  const adminToken = await getToken("ADMIN");

  const missingAuth = await request("/api/sessions");
  assert.equal(missingAuth.response.status, 401);

  const paginated = await request("/api/sessions?limit=2&skip=1", {
    headers: { Authorization: `Bearer ${visitorToken}` },
  });
  assert.equal(paginated.response.status, 200);
  assert.equal(paginated.body.data.length, 2);
  assert.equal(paginated.body.pagination.limit, 2);
  assert.equal(paginated.body.pagination.skip, 1);
  assert.ok(paginated.body.pagination.total >= 4);

  const visitorCreate = await request("/api/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${visitorToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ title: "No permission" }),
  });
  assert.equal(visitorCreate.response.status, 403);

  const invalidCreate = await request("/api/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${writerToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ title: "Missing required fields" }),
  });
  assert.equal(invalidCreate.response.status, 422);

  const created = await request("/api/sessions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${writerToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: "Smoke Test Workshop",
      course: "Scene Study",
      level: "Intermediate",
      date: "2026-05-20",
      time: "19:00",
      mentor: "Test Mentor",
      capacity: 12,
      status: "Open",
      notes: "Created by smoke test.",
    }),
  });
  assert.equal(created.response.status, 201);
  assert.equal(created.body.title, "Smoke Test Workshop");

  const updated = await request(`/api/sessions/${created.body.id}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${writerToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      title: "Updated Smoke Test Workshop",
      course: "Scene Study",
      level: "Advanced",
      date: "2026-05-21",
      time: "19:30",
      mentor: "Updated Mentor",
      capacity: 14,
      status: "Waitlist",
      notes: "Updated by smoke test.",
    }),
  });
  assert.equal(updated.response.status, 200);
  assert.equal(updated.body.status, "Waitlist");

  const liked = await request(`/api/sessions/${created.body.id}/like`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${writerToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ liked: true }),
  });
  assert.equal(liked.response.status, 200);
  assert.equal(liked.body.liked, true);

  const writerDelete = await request(`/api/sessions/${created.body.id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${writerToken}` },
  });
  assert.equal(writerDelete.response.status, 403);

  const adminDelete = await request(`/api/sessions/${created.body.id}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${adminToken}` },
  });
  assert.equal(adminDelete.response.status, 204);

  const deletedRead = await request(`/api/sessions/${created.body.id}`, {
    headers: { Authorization: `Bearer ${visitorToken}` },
  });
  assert.equal(deletedRead.response.status, 404);

  console.log("Lab 7 smoke test passed.");
} finally {
  stopServer();
}
