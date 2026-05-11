# Lab 7 - Kvadrat Sessions API

This folder contains the back-end API for the Lab 6 Kvadrat Studio Planner. It exposes CRUD operations for the same `Session` entities used by the React client.

The API is dependency-free and runs on Node.js built-in modules so it can be started quickly during the lab demo.

## Entity

A session contains:

- `id`
- `title`
- `course`
- `level`
- `date`
- `time`
- `mentor`
- `capacity`
- `status`
- `notes`
- `liked`
- `createdAt`

## Requirements Covered

- CRUD API for Lab 6 entities.
- JWT-protected `/api/*` routes.
- JWT stores `role`, `permissions`, `iat`, and `exp`.
- Demo token expiration is 60 seconds.
- `/token` endpoint returns a JWT.
- Role-based permissions:
  - `VISITOR`: `READ`
  - `WRITER`: `READ`, `WRITE`
  - `ADMIN`: `READ`, `WRITE`, `DELETE`
- Appropriate response status codes: `200`, `201`, `204`, `400`, `401`, `403`, `404`, `405`, `422`.
- Pagination with `limit` and `skip`.
- OpenAPI JSON and Swagger UI documentation.
- Automated smoke test for token roles, CRUD, pagination, docs, and status codes.
- Partial Lab 6 integration through an API connection panel in the frontend.

## Run Locally

From the `lab7` folder:

```powershell
npm.cmd start
```

Development mode with Node watch:

```powershell
npm.cmd run dev
```

API URL:

- http://localhost:4007

Documentation:

- http://localhost:4007/docs
- http://localhost:4007/openapi.json

## Test

Run the smoke test:

```powershell
npm.cmd test
```

The test starts the API on a separate port and verifies JWT roles, protected CRUD operations, pagination, status codes, Swagger UI, and OpenAPI output.

## Authentication Flow

Request a token:

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri http://localhost:4007/token `
  -ContentType "application/json" `
  -Body '{"role":"ADMIN"}'
```

The response includes:

- `token`
- `tokenType`
- `expiresIn`
- `role`
- `permissions`

Use the token as:

```text
Authorization: Bearer <token>
```

## CRUD Routes

```text
POST   /token
GET    /api/sessions?limit=10&skip=0
POST   /api/sessions
GET    /api/sessions/:id
PUT    /api/sessions/:id
PATCH  /api/sessions/:id/like
DELETE /api/sessions/:id
```

## Pagination and Filters

List sessions:

```text
GET /api/sessions?limit=10&skip=0
```

Optional filters:

- `search`
- `course`
- `level`
- `status`
- `liked=true`
- `sort=upcoming`
- `sort=newest`

The list response has this shape:

```json
{
  "data": [],
  "pagination": {
    "total": 0,
    "limit": 10,
    "skip": 0,
    "nextSkip": null,
    "previousSkip": null
  }
}
```

## Client Integration

Start the API first:

```powershell
cd lab7
npm.cmd start
```

Then start the Lab 6 client:

```powershell
cd ..\lab6
npm.cmd run dev
```

In the Lab 6 app:

1. Open the API connection panel.
2. Keep the base URL as `http://localhost:4007`.
3. Select a role.
4. Press `Get 1-minute token`.
5. Press `Load from API`.
6. Add, edit, like, or remove sessions.

When a valid token exists, the Lab 6 app mirrors supported CRUD operations to the Lab 7 API. If the token expires, request a new token and continue.

## Demo Notes

- `VISITOR` can load sessions only.
- `WRITER` can load, create, update, and like sessions, but cannot delete.
- `ADMIN` can perform every operation.
- Data is stored in runtime memory and resets when the server restarts.
- Set `LAB7_JWT_SECRET` in the environment for a non-demo secret.
