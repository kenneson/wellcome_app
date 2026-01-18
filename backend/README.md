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
   Create a `.env` file based on `.env.example`:
   ```env
   DATABASE_URL="postgresql://user:password@localhost:5432/wellcome_db"
   ```

3. **Database Migration**
   ```bash
   npx prisma migrate dev
   ```

4. **Run Server**
   ```bash
   npm run dev
   ```

## Tech Stack
- **Fastify**: High-performance web framework.
- **Prisma**: Type-safe ORM.
- **Zod**: Validation library.
- **PostgreSQL**: Relational database.
