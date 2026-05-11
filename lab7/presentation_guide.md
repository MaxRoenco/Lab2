# Lab 7 Presentation Guide

This guide explains how Lab 7 was implemented, how to test it, and how to present it to the mentor.

## What Was Built

Lab 7 adds a back-end REST API for the same `Session` entity used in the Lab 6 React app.

The implemented API supports:

- `POST /token` to create a one-minute JWT.
- `GET /api/sessions` with pagination through `limit` and `skip`.
- `POST /api/sessions` to create a session.
- `GET /api/sessions/:id` to read one session.
- `PUT /api/sessions/:id` to update a session.
- `PATCH /api/sessions/:id/like` to toggle or set the favorite state.
- `DELETE /api/sessions/:id` to remove a session.
- `GET /docs` for Swagger UI documentation.
- `GET /openapi.json` for the OpenAPI document.

## Implementation Steps

1. Created the Lab 7 Node.js API.
   - Added `lab7/package.json`.
   - Added `lab7/src/server.js`.
   - Used Node built-in modules: `http`, `url`, and `crypto`.
   - Chose REST because the assignment allows REST, GraphQL, or gRPC, and REST fits the CRUD entity model naturally.

2. Added in-memory session data.
   - Reused the Lab 6 session model: title, course, level, date, time, mentor, capacity, status, notes, liked, and createdAt.
   - Seeded the API with demo sessions so the mentor can test immediately after starting the server.

3. Added JWT authentication and authorization.
   - Implemented HMAC SHA-256 JWT signing with `crypto.createHmac`.
   - `/token` returns a JWT with `role`, `permissions`, `iat`, and `exp`.
   - Tokens expire after 60 seconds for demo purposes.
   - Role permissions:
     - `VISITOR`: `READ`
     - `WRITER`: `READ`, `WRITE`
     - `ADMIN`: `READ`, `WRITE`, `DELETE`

4. Protected all CRUD routes.
   - Read operations require `READ`.
   - Create, update, and like operations require `WRITE`.
   - Delete requires `DELETE`.
   - Missing, invalid, expired, or underprivileged tokens return the correct error status.

5. Added validation and status codes.
   - Invalid JSON returns `400`.
   - Missing token returns `401`.
   - Missing permission returns `403`.
   - Unknown session returns `404`.
   - Unsupported methods return `405`.
   - Invalid entity fields return `422`.
   - Successful create returns `201`.
   - Successful delete returns `204`.

6. Added pagination and filters.
   - `GET /api/sessions?limit=10&skip=0` returns only a slice of data.
   - The response includes `total`, `limit`, `skip`, `nextSkip`, and `previousSkip`.
   - Optional filters include `search`, `course`, `level`, `status`, `liked`, and `sort`.

7. Added Swagger UI documentation.
   - `/openapi.json` returns an OpenAPI 3.0 document.
   - `/docs` loads Swagger UI from the OpenAPI document.
   - Swagger UI can be used to inspect routes and test requests.

8. Connected Lab 6 to Lab 7.
   - The Lab 6 app has an API connection panel.
   - The user enters the API base URL, selects a role, requests a token, and loads data.
   - When a token exists, add/edit/like/delete operations are sent to the API.
   - Without a token, the app still works in offline localStorage mode.

9. Added smoke testing.
   - `npm.cmd test` starts the API on a test port.
   - It verifies Swagger docs, OpenAPI, token creation, pagination, CRUD operations, status codes, and role permissions.

## Git History To Show

Use this during presentation:

```powershell
git log --oneline -- lab7 lab6
```

Important commits:

- `Add Lab 7 - Kvadrat Sessions API with JWT authentication and CRUD operations`
- `docs(lab7): add Swagger UI documentation page`
- `test(lab7): add API smoke coverage`
- `docs(lab7): add presentation guide`

## How To Run

From the repository root:

```powershell
cd lab7
npm.cmd start
```

Expected output:

```text
Lab 7 API running on http://localhost:4007
Docs available at http://localhost:4007/docs
```

Open:

- API root: http://localhost:4007
- Swagger UI: http://localhost:4007/docs
- OpenAPI JSON: http://localhost:4007/openapi.json

## How To Test

From `lab7`:

```powershell
npm.cmd test
```

Expected output:

```text
Lab 7 smoke test passed.
```

Manual token request:

```powershell
$tokenResponse = Invoke-RestMethod `
  -Method Post `
  -Uri http://localhost:4007/token `
  -ContentType "application/json" `
  -Body '{"role":"ADMIN"}'

$token = $tokenResponse.token
```

Manual paginated read:

```powershell
Invoke-RestMethod `
  -Method Get `
  -Uri "http://localhost:4007/api/sessions?limit=2&skip=0" `
  -Headers @{ Authorization = "Bearer $token" }
```

Manual create:

```powershell
Invoke-RestMethod `
  -Method Post `
  -Uri http://localhost:4007/api/sessions `
  -Headers @{ Authorization = "Bearer $token" } `
  -ContentType "application/json" `
  -Body '{
    "title":"Mentor Demo Session",
    "course":"Scene Study",
    "level":"Intermediate",
    "date":"2026-05-22",
    "time":"18:00",
    "mentor":"Demo Mentor",
    "capacity":12,
    "status":"Open",
    "notes":"Created during the mentor demo."
  }'
```

## How To Present The Client Integration

1. Start the API:

```powershell
cd lab7
npm.cmd start
```

2. In a second terminal, start Lab 6:

```powershell
cd lab6
npm.cmd run dev
```

3. Open the Lab 6 local URL shown by Vite.

4. In the API connection panel:
   - Keep API base URL as `http://localhost:4007`.
   - Select `VISITOR`.
   - Press `Get 1-minute token`.
   - Press `Load from API`.
   - Explain that this role can read only.

5. Try creating or deleting as `VISITOR`.
   - The API should reject it with a permission error.

6. Select `WRITER`.
   - Request a new token.
   - Create a new session.
   - Edit a session.
   - Like a session.
   - Explain that `WRITER` can read and write, but cannot delete.

7. Select `ADMIN`.
   - Request a new token.
   - Delete a session.
   - Explain that `ADMIN` has all permissions.

8. Wait more than one minute and try another API action.
   - The token expires and the app asks for a new token.

## Theory To Know

REST:

- REST means Representational State Transfer.
- It models data as resources identified by URLs.
- The API uses HTTP methods for resource actions: `GET`, `POST`, `PUT`, `PATCH`, and `DELETE`.
- REST APIs should be stateless. Each request contains the information needed to authorize and process it.
- Source used: https://restfulapi.net/

JWT:

- JWT means JSON Web Token.
- A JWT carries signed claims between two parties.
- This project stores `role`, `permissions`, `iat`, and `exp` in the token payload.
- The server verifies the token signature and expiration before allowing protected operations.
- Source used: https://jwt.io/

Role-based authorization:

- Authentication answers: "Who made this request?"
- Authorization answers: "What is this requester allowed to do?"
- In this project, the role determines permissions.
- `VISITOR` can only read.
- `WRITER` can read and write.
- `ADMIN` can read, write, and delete.

Swagger UI and OpenAPI:

- OpenAPI describes the API contract in a machine-readable format.
- Swagger UI renders that OpenAPI contract in a browser.
- It lets developers inspect routes, parameters, schemas, security, and responses.
- Source used: https://swagger.io/tools/swagger-ui/

Pagination:

- Pagination avoids returning too much data in one response.
- `limit` controls how many items are returned.
- `skip` controls how many matching items are skipped before returning data.
- The response includes metadata so clients can request the next or previous page.
- Source used: https://learn.microsoft.com/en-us/azure/architecture/best-practices/api-design#filter-and-paginate-data

HTTP status codes:

- `200 OK`: successful read/update.
- `201 Created`: session created.
- `204 No Content`: session deleted.
- `400 Bad Request`: invalid JSON.
- `401 Unauthorized`: missing, invalid, or expired token.
- `403 Forbidden`: valid token but missing permission.
- `404 Not Found`: route or session does not exist.
- `405 Method Not Allowed`: method is not supported on that route.
- `422 Unprocessable Entity`: request JSON is valid, but entity validation failed.

## Notes About Official Links

- The Lab 6 task link was used to confirm the original entity/client requirements.
- The REST, JWT, Swagger UI, and pagination links were used to align the API design with the Lab 7 requirements.
- The submission requirements link opens the ELSE login page, so access requires your university account.

## Mentor Demo Checklist

- Show `lab7/src/server.js`.
- Show `/token` implementation and role permissions.
- Show JWT payload contains `role`, `permissions`, `iat`, and `exp`.
- Show `/api/sessions` supports `limit` and `skip`.
- Show Swagger UI at `/docs`.
- Run `npm.cmd test`.
- Start Lab 6 and demonstrate client API integration.
- Show commit history with `git log --oneline -- lab7 lab6`.
