# Wellcome Backend

Backend service built with Node.js, Fastify, and Prisma.

## Architecture

```text
src/
|-- domain/          # Entities and repository contracts
|-- application/     # Use cases and application services
|-- infrastructure/  # Database, repositories, and external integrations
`-- presentation/    # HTTP controllers and route layer
```

## Setup

1. Install dependencies

```bash
npm install
```

2. Create `.env`

```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/wellcome"
```

3. Apply Prisma schema

```bash
npx prisma db push
```

4. Run backend in development

```bash
npm run dev
```

Default URL: `http://localhost:3000`

## Swagger and OpenAPI

After starting the backend, documentation is available at:

- Swagger UI: `http://localhost:3000/docs`
- OpenAPI JSON: `http://localhost:3000/docs-spec/json`
- OpenAPI YAML: `http://localhost:3000/docs-spec/yaml`

Documented API groups:

- Auth
- Events
- Bookings
- Reviews
- Notifications
- Users
- General

## Build and test

```bash
npm run build
npm test
```
