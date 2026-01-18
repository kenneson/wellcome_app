# Wellcome Backend ⚙️

Professional backend service built with Node.js, Fastify, and Prisma.

## Architecture: Clean Architecture + DDD

```
src/
├── domain/              # Pure business rules (Entities)
├── application/         # Use Cases, Application Services
├── infrastructure/      # Database implementations, External APIs
└── presentation/        # HTTP Controllers/Routes
```

## Setup

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Environment Variables**
   Create a `.env` file with your database string:
   ```env
   DATABASE_URL="postgresql://postgres:password@localhost:5432/wellcome"
   ```

3. **Database Migration**
   Push the schema to your database (creates tables):
   ```bash
   npx prisma db push
   ```
   Or create a migration file:
   ```bash
   npx prisma migrate dev --name init
   ```

4. **Generate Prisma Client**
   (Run automatically after install/migrate, but if needed):
   ```bash
   npx prisma generate
   ```

5. **Run Server**
   ```bash
   npm run dev
   ```
   The server runs on `http://localhost:3000`.

## Testing

### Create Event
**POST** `/events`

**Body**:
```json
{
  "title": "Jantar Italiano",
  "description": "Uma noite de massas caseiras",
  "price": 50.0,
  "maxGuests": 4,
  "eventDate": "2024-12-25T20:00:00Z",
  "location": "Rua das Flores, 123",
  "latitude": -23.5505,
  "longitude": -46.6333,
  "coverImageUrl": "http://...",
  "hostId": "user-uuid"
}
```

## Tech Stack
- **Fastify**: High-performance web framework.
- **Prisma**: Type-safe ORM.
- **Zod**: Validation library.
- **PostgreSQL**: Relational database.
