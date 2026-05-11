import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { createServer } from "node:http";
import { URL } from "node:url";

const PORT = Number(process.env.PORT || 4007);
const JWT_SECRET = process.env.LAB7_JWT_SECRET || "lab7-development-secret-change-me";
const TOKEN_TTL_SECONDS = 60;

const courses = [
  "Acting Fundamentals",
  "Scene Study",
  "Voice and Movement",
  "On-Camera Acting",
];
const levels = ["Beginner", "Intermediate", "Advanced"];
const statuses = ["Open", "Waitlist", "Closed"];

const rolePermissions = {
  ADMIN: ["READ", "WRITE", "DELETE"],
  WRITER: ["READ", "WRITE"],
  VISITOR: ["READ"],
};

let sessions = [
  {
    id: "seed-scene-study",
    title: "Chekhov Scene Lab",
    course: "Scene Study",
    level: "Intermediate",
    date: "2026-05-08",
    time: "18:30",
    mentor: "Irina Balan",
    capacity: 14,
    status: "Open",
    notes: "Pairs rehearse selected scenes and receive notes on objectives, rhythm, and listening.",
    liked: true,
    createdAt: "2026-04-27T10:00:00.000Z",
  },
  {
    id: "seed-camera",
    title: "Commercial Casting Drill",
    course: "On-Camera Acting",
    level: "Advanced",
    date: "2026-05-11",
    time: "17:00",
    mentor: "Victor Rusu",
    capacity: 10,
    status: "Waitlist",
    notes: "Students record fast audition takes and compare framing, eyeline, and delivery choices.",
    liked: false,
    createdAt: "2026-04-27T10:15:00.000Z",
  },
  {
    id: "seed-voice",
    title: "Breath and Projection Studio",
    course: "Voice and Movement",
    level: "Beginner",
    date: "2026-05-13",
    time: "16:00",
    mentor: "Ana Munteanu",
    capacity: 16,
    status: "Open",
    notes: "Warmups, resonance work, and stage movement exercises for new performers.",
    liked: false,
    createdAt: "2026-04-27T10:30:00.000Z",
  },
  {
    id: "seed-fundamentals",
    title: "First Stage Confidence",
    course: "Acting Fundamentals",
    level: "Beginner",
    date: "2026-05-16",
    time: "11:00",
    mentor: "Mihai Popescu",
    capacity: 18,
    status: "Closed",
    notes: "Group games and short monologues focused on presence, trust, and stage awareness.",
    liked: true,
    createdAt: "2026-04-27T10:45:00.000Z",
  },
];

function base64UrlEncode(value) {
  return Buffer.from(value).toString("base64url");
}

function base64UrlJson(value) {
  return base64UrlEncode(JSON.stringify(value));
}

function signJwt(payload) {
  const header = { alg: "HS256", typ: "JWT" };
  const encodedHeader = base64UrlJson(header);
  const encodedPayload = base64UrlJson(payload);
  const data = `${encodedHeader}.${encodedPayload}`;
  const signature = createHmac("sha256", JWT_SECRET).update(data).digest("base64url");
  return `${data}.${signature}`;
}

function verifyJwt(token) {
  const parts = token.split(".");
  if (parts.length !== 3) {
    throw httpError(401, "Invalid token format.");
  }

  const [encodedHeader, encodedPayload, signature] = parts;
  const expected = createHmac("sha256", JWT_SECRET)
    .update(`${encodedHeader}.${encodedPayload}`)
    .digest("base64url");

  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    throw httpError(401, "Invalid token signature.");
  }

  const payload = JSON.parse(Buffer.from(encodedPayload, "base64url").toString("utf8"));
  if (!payload.exp || Math.floor(Date.now() / 1000) >= payload.exp) {
    throw httpError(401, "Token has expired.");
  }

  return payload;
}

function httpError(status, message, details) {
  const error = new Error(message);
  error.status = status;
  error.details = details;
  return error;
}

function sendJson(response, status, body) {
  response.writeHead(status, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(body, null, 2));
}

function sendHtml(response, status, body) {
  response.writeHead(status, {
    "Access-Control-Allow-Origin": "*",
    "Content-Type": "text/html; charset=utf-8",
  });
  response.end(body);
}

async function readJson(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(chunk);
  }

  const rawBody = Buffer.concat(chunks).toString("utf8").trim();
  if (!rawBody) {
    return {};
  }

  try {
    return JSON.parse(rawBody);
  } catch {
    throw httpError(400, "Request body must be valid JSON.");
  }
}

function getBearerPayload(request, permission) {
  const authorization = request.headers.authorization || "";
  const [scheme, token] = authorization.split(" ");
  if (scheme !== "Bearer" || !token) {
    throw httpError(401, "Missing Bearer token.");
  }

  const payload = verifyJwt(token);
  if (!Array.isArray(payload.permissions) || !payload.permissions.includes(permission)) {
    throw httpError(403, `Permission ${permission} is required for this operation.`);
  }

  return payload;
}

function validateSessionInput(body, { partial = false } = {}) {
  const errors = [];
  const candidate = {};

  const requireString = (key) => {
    if (body[key] === undefined && partial) {
      return;
    }
    if (typeof body[key] !== "string" || body[key].trim() === "") {
      errors.push(`${key} is required.`);
      return;
    }
    candidate[key] = body[key].trim();
  };

  requireString("title");
  requireString("date");
  requireString("time");
  requireString("mentor");

  if (body.notes !== undefined || !partial) {
    candidate.notes = typeof body.notes === "string" ? body.notes.trim() : "";
  }

  if (body.course !== undefined || !partial) {
    if (!courses.includes(body.course)) {
      errors.push(`course must be one of: ${courses.join(", ")}.`);
    } else {
      candidate.course = body.course;
    }
  }

  if (body.level !== undefined || !partial) {
    if (!levels.includes(body.level)) {
      errors.push(`level must be one of: ${levels.join(", ")}.`);
    } else {
      candidate.level = body.level;
    }
  }

  if (body.status !== undefined || !partial) {
    if (!statuses.includes(body.status)) {
      errors.push(`status must be one of: ${statuses.join(", ")}.`);
    } else {
      candidate.status = body.status;
    }
  }

  if (body.capacity !== undefined || !partial) {
    const capacity = Number(body.capacity);
    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 60) {
      errors.push("capacity must be an integer between 1 and 60.");
    } else {
      candidate.capacity = capacity;
    }
  }

  if (body.liked !== undefined) {
    if (typeof body.liked !== "boolean") {
      errors.push("liked must be a boolean.");
    } else {
      candidate.liked = body.liked;
    }
  }

  if (errors.length > 0) {
    throw httpError(422, "Session validation failed.", errors);
  }

  return candidate;
}

function filterAndPaginateSessions(searchParams) {
  const search = (searchParams.get("search") || "").trim().toLowerCase();
  const course = searchParams.get("course");
  const level = searchParams.get("level");
  const status = searchParams.get("status");
  const liked = searchParams.get("liked");
  const sort = searchParams.get("sort") || "upcoming";
  const limit = Math.min(Math.max(Number(searchParams.get("limit") || 10), 1), 100);
  const skip = Math.max(Number(searchParams.get("skip") || 0), 0);

  const filtered = sessions
    .filter((session) => {
      const matchesSearch =
        !search ||
        [session.title, session.course, session.mentor, session.notes]
          .join(" ")
          .toLowerCase()
          .includes(search);
      const matchesCourse = !course || course === "All" || session.course === course;
      const matchesLevel = !level || level === "All" || session.level === level;
      const matchesStatus = !status || status === "All" || session.status === status;
      const matchesLiked = liked === null || session.liked === (liked === "true");

      return matchesSearch && matchesCourse && matchesLevel && matchesStatus && matchesLiked;
    })
    .sort((a, b) => {
      if (sort === "newest") {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }

      return new Date(`${a.date}T${a.time}`).getTime() - new Date(`${b.date}T${b.time}`).getTime();
    });

  return {
    data: filtered.slice(skip, skip + limit),
    pagination: {
      total: filtered.length,
      limit,
      skip,
      nextSkip: skip + limit < filtered.length ? skip + limit : null,
      previousSkip: skip - limit >= 0 ? skip - limit : null,
    },
  };
}

function createToken(body) {
  const role = String(body.role || "VISITOR").toUpperCase();
  if (!rolePermissions[role]) {
    throw httpError(422, "role must be ADMIN, WRITER, or VISITOR.");
  }

  const requestedPermissions = Array.isArray(body.permissions) ? body.permissions : rolePermissions[role];
  const allowedPermissions = rolePermissions[role];
  const permissions = requestedPermissions.filter((permission) => allowedPermissions.includes(permission));
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    sub: "lab7-demo-user",
    role,
    permissions,
    iat: now,
    exp: now + TOKEN_TTL_SECONDS,
  };

  return {
    token: signJwt(payload),
    tokenType: "Bearer",
    expiresIn: TOKEN_TTL_SECONDS,
    role,
    permissions,
  };
}

function openApiDocument() {
  return {
    openapi: "3.0.3",
    info: {
      title: "Lab 7 Kvadrat Sessions API",
      version: "1.0.0",
      description: "JWT-protected CRUD API for Lab 6 acting studio sessions.",
    },
    servers: [{ url: `http://localhost:${PORT}` }],
    components: {
      securitySchemes: {
        bearerAuth: { type: "http", scheme: "bearer", bearerFormat: "JWT" },
      },
      schemas: {
        Session: {
          type: "object",
          required: ["title", "course", "level", "date", "time", "mentor", "capacity", "status"],
          properties: {
            id: { type: "string" },
            title: { type: "string" },
            course: { type: "string", enum: courses },
            level: { type: "string", enum: levels },
            date: { type: "string", example: "2026-05-21" },
            time: { type: "string", example: "18:30" },
            mentor: { type: "string" },
            capacity: { type: "integer", minimum: 1, maximum: 60 },
            status: { type: "string", enum: statuses },
            notes: { type: "string" },
            liked: { type: "boolean" },
            createdAt: { type: "string", format: "date-time" },
          },
        },
      },
    },
    paths: {
      "/token": {
        post: {
          summary: "Create a one-minute JWT",
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    role: { type: "string", enum: ["ADMIN", "WRITER", "VISITOR"] },
                    permissions: {
                      type: "array",
                      items: { type: "string", enum: ["READ", "WRITE", "DELETE"] },
                    },
                  },
                },
              },
            },
          },
          responses: { 200: { description: "JWT response" } },
        },
      },
      "/api/sessions": {
        get: {
          security: [{ bearerAuth: [] }],
          summary: "List sessions with pagination and filters",
          parameters: [
            { name: "limit", in: "query", schema: { type: "integer", default: 10 } },
            { name: "skip", in: "query", schema: { type: "integer", default: 0 } },
            { name: "search", in: "query", schema: { type: "string" } },
            { name: "course", in: "query", schema: { type: "string" } },
            { name: "level", in: "query", schema: { type: "string" } },
            { name: "status", in: "query", schema: { type: "string" } },
            { name: "liked", in: "query", schema: { type: "boolean" } },
          ],
          responses: { 200: { description: "Paginated session list" } },
        },
        post: {
          security: [{ bearerAuth: [] }],
          summary: "Create a session",
          responses: { 201: { description: "Created session" } },
        },
      },
      "/api/sessions/{id}": {
        get: {
          security: [{ bearerAuth: [] }],
          summary: "Get one session",
          responses: { 200: { description: "Session" }, 404: { description: "Not found" } },
        },
        put: {
          security: [{ bearerAuth: [] }],
          summary: "Replace a session",
          responses: { 200: { description: "Updated session" } },
        },
        delete: {
          security: [{ bearerAuth: [] }],
          summary: "Delete a session",
          responses: { 204: { description: "Deleted" } },
        },
      },
      "/api/sessions/{id}/like": {
        patch: {
          security: [{ bearerAuth: [] }],
          summary: "Toggle or set liked state",
          responses: { 200: { description: "Updated session" } },
        },
      },
    },
  };
}

function docsHtml() {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Lab 7 API Docs</title>
    <style>
      :root { color-scheme: light dark; font-family: Inter, system-ui, sans-serif; }
      body { margin: 0; background: #f7f4ec; color: #1f2428; }
      main { max-width: 1040px; margin: 0 auto; padding: 32px; }
      h1, h2 { font-family: Georgia, "Times New Roman", serif; }
      section { background: #fffdf8; border: 1px solid #ded7ca; border-radius: 8px; padding: 20px; margin: 16px 0; }
      code, pre { background: #eee7da; border-radius: 6px; }
      code { padding: 2px 5px; }
      pre { padding: 16px; overflow-x: auto; }
      a, button { color: #1f2428; }
      button { min-height: 40px; border: 0; border-radius: 8px; padding: 0 16px; background: #bd9334; font-weight: 800; cursor: pointer; }
      input, select, textarea { width: 100%; min-height: 38px; box-sizing: border-box; border: 1px solid #ded7ca; border-radius: 8px; padding: 8px; }
      label { display: grid; gap: 6px; margin: 10px 0; font-weight: 700; }
      .grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
      @media (prefers-color-scheme: dark) {
        body { background: #181b1f; color: #f4efe5; }
        section { background: #22272b; border-color: #3b4448; }
        code, pre { background: #2b3136; }
        a { color: #f0cf86; }
      }
      @media (max-width: 760px) { main { padding: 16px; } .grid { grid-template-columns: 1fr; } }
    </style>
  </head>
  <body>
    <main>
      <h1>Lab 7 Kvadrat Sessions API</h1>
      <p>OpenAPI document: <a href="/openapi.json">/openapi.json</a>. All <code>/api/*</code> routes require a Bearer JWT from <code>POST /token</code>.</p>

      <section>
        <h2>Try It</h2>
        <div class="grid">
          <label>Role
            <select id="role">
              <option>ADMIN</option>
              <option>WRITER</option>
              <option>VISITOR</option>
            </select>
          </label>
          <label>Limit
            <input id="limit" type="number" value="10" min="1" max="100" />
          </label>
          <label>Skip
            <input id="skip" type="number" value="0" min="0" />
          </label>
        </div>
        <button id="tokenButton">Get Token</button>
        <button id="listButton">List Sessions</button>
        <pre id="output">No request yet.</pre>
      </section>

      <section>
        <h2>Permissions</h2>
        <p><code>VISITOR</code> can read, <code>WRITER</code> can read/write, and <code>ADMIN</code> can read/write/delete. Tokens expire after 60 seconds for demo purposes.</p>
      </section>

      <section>
        <h2>Core Routes</h2>
        <pre>POST   /token
GET    /api/sessions?limit=10&skip=0
POST   /api/sessions
GET    /api/sessions/:id
PUT    /api/sessions/:id
PATCH  /api/sessions/:id/like
DELETE /api/sessions/:id</pre>
      </section>
    </main>
    <script>
      let token = "";
      const output = document.querySelector("#output");
      document.querySelector("#tokenButton").addEventListener("click", async () => {
        const role = document.querySelector("#role").value;
        const response = await fetch("/token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ role })
        });
        const data = await response.json();
        token = data.token || "";
        output.textContent = JSON.stringify(data, null, 2);
      });
      document.querySelector("#listButton").addEventListener("click", async () => {
        const limit = document.querySelector("#limit").value;
        const skip = document.querySelector("#skip").value;
        const response = await fetch("/api/sessions?limit=" + limit + "&skip=" + skip, {
          headers: { Authorization: "Bearer " + token }
        });
        const text = await response.text();
        try { output.textContent = JSON.stringify(JSON.parse(text), null, 2); }
        catch { output.textContent = text; }
      });
    </script>
  </body>
</html>`;
}

async function route(request, response) {
  const url = new URL(request.url || "/", `http://${request.headers.host}`);
  const segments = url.pathname.split("/").filter(Boolean);

  if (request.method === "OPTIONS") {
    sendJson(response, 204, {});
    return;
  }

  if (request.method === "GET" && url.pathname === "/") {
    sendJson(response, 200, {
      name: "Lab 7 Kvadrat Sessions API",
      docs: "/docs",
      openapi: "/openapi.json",
    });
    return;
  }

  if (request.method === "GET" && url.pathname === "/docs") {
    sendHtml(response, 200, docsHtml());
    return;
  }

  if (request.method === "GET" && url.pathname === "/openapi.json") {
    sendJson(response, 200, openApiDocument());
    return;
  }

  if (request.method === "POST" && url.pathname === "/token") {
    sendJson(response, 200, createToken(await readJson(request)));
    return;
  }

  if (segments[0] !== "api" || segments[1] !== "sessions") {
    throw httpError(404, "Route not found.");
  }

  if (request.method === "GET" && segments.length === 2) {
    getBearerPayload(request, "READ");
    sendJson(response, 200, filterAndPaginateSessions(url.searchParams));
    return;
  }

  if (request.method === "POST" && segments.length === 2) {
    const auth = getBearerPayload(request, "WRITE");
    const input = validateSessionInput(await readJson(request));
    const created = {
      ...input,
      id: randomUUID(),
      liked: typeof input.liked === "boolean" ? input.liked : false,
      createdAt: new Date().toISOString(),
      createdByRole: auth.role,
    };
    sessions = [created, ...sessions];
    sendJson(response, 201, created);
    return;
  }

  const id = segments[2];
  const index = sessions.findIndex((session) => session.id === id);
  if (index === -1) {
    throw httpError(404, "Session not found.");
  }

  if (request.method === "GET" && segments.length === 3) {
    getBearerPayload(request, "READ");
    sendJson(response, 200, sessions[index]);
    return;
  }

  if (request.method === "PUT" && segments.length === 3) {
    getBearerPayload(request, "WRITE");
    const input = validateSessionInput(await readJson(request));
    sessions[index] = {
      ...sessions[index],
      ...input,
      liked: typeof input.liked === "boolean" ? input.liked : sessions[index].liked,
    };
    sendJson(response, 200, sessions[index]);
    return;
  }

  if (request.method === "PATCH" && segments.length === 4 && segments[3] === "like") {
    getBearerPayload(request, "WRITE");
    const body = await readJson(request);
    const liked = typeof body.liked === "boolean" ? body.liked : !sessions[index].liked;
    sessions[index] = { ...sessions[index], liked };
    sendJson(response, 200, sessions[index]);
    return;
  }

  if (request.method === "DELETE" && segments.length === 3) {
    getBearerPayload(request, "DELETE");
    sessions = sessions.filter((session) => session.id !== id);
    response.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    });
    response.end();
    return;
  }

  throw httpError(405, "Method not allowed for this route.");
}

const server = createServer(async (request, response) => {
  try {
    await route(request, response);
  } catch (error) {
    const status = error.status || 500;
    sendJson(response, status, {
      error: error.message || "Internal server error.",
      details: error.details || undefined,
    });
  }
});

server.listen(PORT, () => {
  console.log(`Lab 7 API running on http://localhost:${PORT}`);
  console.log(`Docs available at http://localhost:${PORT}/docs`);
});
