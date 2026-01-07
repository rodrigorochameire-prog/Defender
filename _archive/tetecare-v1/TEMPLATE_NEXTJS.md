# 🚀 Template Next.js - TeteCare Pro v2

Este é um guia passo-a-passo para criar o novo projeto do zero usando Next.js 14 com App Router, que é otimizado para deploy na Vercel.

---

## 📦 1. Criar o Projeto

```bash
# Criar novo projeto Next.js
npx create-next-app@14 tetecare-v2 --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"

cd tetecare-v2
```

---

## 📁 2. Estrutura de Pastas

```
tetecare-v2/
├── src/
│   ├── app/
│   │   ├── (auth)/
│   │   │   ├── login/page.tsx
│   │   │   ├── register/page.tsx
│   │   │   └── layout.tsx
│   │   ├── (dashboard)/
│   │   │   ├── admin/
│   │   │   │   ├── page.tsx           # Dashboard admin
│   │   │   │   ├── pets/page.tsx
│   │   │   │   ├── tutors/page.tsx
│   │   │   │   ├── calendar/page.tsx
│   │   │   │   └── layout.tsx
│   │   │   ├── tutor/
│   │   │   │   ├── page.tsx           # Dashboard tutor
│   │   │   │   ├── pets/page.tsx
│   │   │   │   ├── bookings/page.tsx
│   │   │   │   └── layout.tsx
│   │   │   └── layout.tsx
│   │   ├── api/
│   │   │   ├── trpc/[trpc]/route.ts
│   │   │   └── auth/[...nextauth]/route.ts
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/                        # shadcn components
│   │   └── shared/                    # Componentes de negócio
│   ├── lib/
│   │   ├── trpc/
│   │   │   ├── client.ts
│   │   │   ├── server.ts
│   │   │   └── routers/
│   │   │       ├── index.ts
│   │   │       ├── auth.ts
│   │   │       ├── pets.ts
│   │   │       └── ...
│   │   ├── db/
│   │   │   ├── index.ts
│   │   │   └── schema.ts
│   │   ├── auth.ts
│   │   └── utils.ts
│   └── types/
│       └── index.ts
├── drizzle/
│   └── migrations/
├── prisma/                            # ou Drizzle
│   └── schema.prisma
├── .env.local
├── drizzle.config.ts
├── next.config.js
├── package.json
└── tsconfig.json
```

---

## 📝 3. Dependências Essenciais

```bash
# Core
pnpm add @tanstack/react-query @trpc/client @trpc/server @trpc/react-query zod superjson

# Database (Drizzle)
pnpm add drizzle-orm postgres
pnpm add -D drizzle-kit

# UI
pnpm add class-variance-authority clsx tailwind-merge lucide-react
pnpm add @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-label
pnpm add @radix-ui/react-select @radix-ui/react-tabs @radix-ui/react-slot

# Utils
pnpm add date-fns

# Auth (escolha um)
pnpm add next-auth@beta  # ou
pnpm add @supabase/supabase-js
```

---

## 🔧 4. Configurações Base

### next.config.js

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
      },
    ],
  },
};

module.exports = nextConfig;
```

### .env.local

```bash
# Database
DATABASE_URL="postgresql://user:password@host:5432/database"

# Auth
NEXTAUTH_SECRET="sua-chave-secreta-aqui"
NEXTAUTH_URL="http://localhost:3000"

# Supabase (se usar)
NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="xxx"
SUPABASE_SERVICE_ROLE_KEY="xxx"

# Stripe (quando adicionar)
STRIPE_SECRET_KEY="sk_test_xxx"
STRIPE_WEBHOOK_SECRET="whsec_xxx"
```

### drizzle.config.ts

```typescript
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/lib/db/schema.ts",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
```

---

## 🗃️ 5. Schema do Banco (Mínimo Viável)

### src/lib/db/schema.ts

```typescript
import { pgTable, serial, text, varchar, boolean, timestamp, integer } from "drizzle-orm/pg-core";

// Usuários
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  role: varchar("role", { length: 20 }).default("user").notNull(),
  phone: text("phone"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Pets
export const pets = pgTable("pets", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  breed: varchar("breed", { length: 100 }),
  birthDate: timestamp("birth_date"),
  photoUrl: text("photo_url"),
  status: varchar("status", { length: 50 }).default("active").notNull(),
  approvalStatus: varchar("approval_status", { length: 50 }).default("pending").notNull(),
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Relação Pet-Tutor
export const petTutors = pgTable("pet_tutors", {
  id: serial("id").primaryKey(),
  petId: integer("pet_id").notNull().references(() => pets.id, { onDelete: "cascade" }),
  tutorId: integer("tutor_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  isPrimary: boolean("is_primary").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Tipos inferidos
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Pet = typeof pets.$inferSelect;
export type InsertPet = typeof pets.$inferInsert;
```

### src/lib/db/index.ts

```typescript
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL!;

const client = postgres(connectionString);
export const db = drizzle(client, { schema });
```

---

## 🔐 6. Autenticação Simples

### src/lib/auth.ts

```typescript
import { db } from "./db";
import { users } from "./db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET);

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function createSession(userId: number) {
  const token = await new SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("30d")
    .sign(secret);

  cookies().set("session", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  });

  return token;
}

export async function getSession() {
  const token = cookies().get("session")?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, secret);
    const user = await db.query.users.findFirst({
      where: eq(users.id, payload.userId as number),
    });
    return user;
  } catch {
    return null;
  }
}

export async function logout() {
  cookies().delete("session");
}
```

---

## 📡 7. Setup tRPC

### src/lib/trpc/init.ts

```typescript
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { getSession } from "@/lib/auth";

export const createTRPCContext = async () => {
  const user = await getSession();
  return { user };
};

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

export const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN" });
  }
  return next({ ctx });
});
```

### src/lib/trpc/routers/index.ts

```typescript
import { router } from "../init";
import { authRouter } from "./auth";
import { petsRouter } from "./pets";

export const appRouter = router({
  auth: authRouter,
  pets: petsRouter,
});

export type AppRouter = typeof appRouter;
```

### src/lib/trpc/routers/pets.ts

```typescript
import { z } from "zod";
import { router, protectedProcedure, adminProcedure } from "../init";
import { db } from "@/lib/db";
import { pets, petTutors } from "@/lib/db/schema";
import { eq } from "drizzle-orm";

export const petsRouter = router({
  // Listar pets do tutor logado
  myPets: protectedProcedure.query(async ({ ctx }) => {
    const result = await db
      .select()
      .from(pets)
      .innerJoin(petTutors, eq(pets.id, petTutors.petId))
      .where(eq(petTutors.tutorId, ctx.user.id));
    
    return result.map(r => r.pets);
  }),

  // Listar todos os pets (admin)
  list: adminProcedure.query(async () => {
    return db.select().from(pets);
  }),

  // Criar pet
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      breed: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [pet] = await db.insert(pets).values({
        ...input,
        approvalStatus: ctx.user.role === "admin" ? "approved" : "pending",
      }).returning();

      // Associar ao tutor
      await db.insert(petTutors).values({
        petId: pet.id,
        tutorId: ctx.user.id,
        isPrimary: true,
      });

      return pet;
    }),

  // Aprovar pet (admin)
  approve: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const [pet] = await db
        .update(pets)
        .set({ approvalStatus: "approved" })
        .where(eq(pets.id, input.id))
        .returning();
      return pet;
    }),
});
```

### src/app/api/trpc/[trpc]/route.ts

```typescript
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@/lib/trpc/routers";
import { createTRPCContext } from "@/lib/trpc/init";

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: createTRPCContext,
  });

export { handler as GET, handler as POST };
```

---

## 🎨 8. Componentes Base

### src/lib/utils.ts

```typescript
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### src/components/ui/button.tsx

```typescript
import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-red-500 text-white hover:bg-red-600",
        outline: "border border-input bg-background hover:bg-accent",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return (
    <button className={cn(buttonVariants({ variant, size, className }))} {...props} />
  );
}
```

---

## 🏠 9. Páginas Exemplo

### src/app/page.tsx

```typescript
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

export default async function Home() {
  const user = await getSession();
  
  if (!user) {
    redirect("/login");
  }
  
  if (user.role === "admin") {
    redirect("/admin");
  }
  
  redirect("/tutor");
}
```

### src/app/(dashboard)/admin/page.tsx

```typescript
import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { pets, users } from "@/lib/db/schema";
import { count, eq } from "drizzle-orm";

export default async function AdminDashboard() {
  const user = await getSession();
  if (!user || user.role !== "admin") redirect("/login");

  const [petsCount] = await db.select({ count: count() }).from(pets);
  const [tutorsCount] = await db.select({ count: count() }).from(users).where(eq(users.role, "user"));
  const [pendingPets] = await db.select({ count: count() }).from(pets).where(eq(pets.approvalStatus, "pending"));

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Dashboard Admin</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold">Total de Pets</h2>
          <p className="text-3xl font-bold text-blue-600">{petsCount.count}</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold">Tutores</h2>
          <p className="text-3xl font-bold text-green-600">{tutorsCount.count}</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold">Aprovações Pendentes</h2>
          <p className="text-3xl font-bold text-orange-600">{pendingPets.count}</p>
        </div>
      </div>
    </div>
  );
}
```

---

## 🚀 10. Deploy na Vercel

### 1. Preparar o projeto

```bash
# Criar migrations
pnpm drizzle-kit generate

# Aplicar migrations (localmente primeiro)
pnpm drizzle-kit push
```

### 2. Configurar Vercel

1. Conectar repositório GitHub
2. Configurar variáveis de ambiente:
   - `DATABASE_URL`
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL` (domínio da Vercel)

### 3. Banco de Dados

Use um dos serviços compatíveis com Vercel:
- **Neon** (PostgreSQL serverless) - Integração nativa
- **Supabase** - PostgreSQL + extras
- **PlanetScale** - MySQL serverless

---

## ✅ Checklist de Implementação

```
[ ] 1. Criar projeto Next.js
[ ] 2. Configurar Tailwind + shadcn/ui
[ ] 3. Configurar banco de dados (Drizzle/Prisma)
[ ] 4. Implementar autenticação
[ ] 5. Criar layouts (auth, admin, tutor)
[ ] 6. Implementar CRUD de pets
[ ] 7. Implementar sistema de tutores
[ ] 8. Adicionar calendário básico
[ ] 9. Testar localmente
[ ] 10. Deploy na Vercel
```

---

*Este template é um ponto de partida. Expanda conforme necessário.*
