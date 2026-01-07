# 📚 Código de Referência - TeteCare Pro

Este documento contém exemplos de código do projeto atual que podem ser úteis como referência na reconstrução.

---

## 🔐 Autenticação e tRPC

### Estrutura do tRPC (server/_core/trpc.ts)

```typescript
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;

// Procedure pública - qualquer um pode acessar
export const publicProcedure = t.procedure;

// Procedure protegida - requer usuário logado
const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

export const protectedProcedure = t.procedure.use(requireUser);

// Procedure admin - requer role admin
export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN" });
    }
    return next({ ctx: { ...ctx, user: ctx.user } });
  }),
);
```

---

## 🗃️ Banco de Dados com Drizzle

### Conexão (server/db.ts)

```typescript
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db) {
    const databaseUrl = process.env.DATABASE_URL;
    if (databaseUrl) {
      const client = postgres(databaseUrl);
      _db = drizzle(client);
    }
  }
  return _db;
}
```

### Schema Exemplo (drizzle/schema.ts)

```typescript
import { pgTable, serial, text, varchar, boolean, timestamp, integer } from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name"),
  email: text("email").unique(),
  role: text("role").default("user").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const pets = pgTable("pets", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  breed: varchar("breed", { length: 100 }),
  photoUrl: text("photo_url"),
  status: varchar("status", { length: 100 }).default("active").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const petTutors = pgTable("pet_tutors", {
  id: serial("id").primaryKey(),
  petId: integer("pet_id").notNull().references(() => pets.id),
  tutorId: integer("tutor_id").notNull().references(() => users.id),
  isPrimary: boolean("is_primary").default(false).notNull(),
});
```

### Query Exemplos

```typescript
import { eq, and, desc, gte } from "drizzle-orm";

// Buscar pets de um tutor
export async function getPetsByTutor(tutorId: number) {
  const db = await getDb();
  return db
    .select()
    .from(pets)
    .innerJoin(petTutors, eq(pets.id, petTutors.petId))
    .where(eq(petTutors.tutorId, tutorId));
}

// Criar pet
export async function createPet(data: InsertPet) {
  const db = await getDb();
  const [pet] = await db.insert(pets).values(data).returning();
  return pet;
}

// Atualizar pet
export async function updatePet(id: number, data: Partial<InsertPet>) {
  const db = await getDb();
  const [pet] = await db
    .update(pets)
    .set({ ...data, updatedAt: new Date() })
    .where(eq(pets.id, id))
    .returning();
  return pet;
}
```

---

## 🎨 Componentes UI (shadcn/ui)

### Button Component

```typescript
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-all disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-white hover:bg-destructive/90",
        outline: "border bg-transparent hover:bg-accent",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3",
        lg: "h-10 rounded-md px-6",
        icon: "size-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export function Button({ className, variant, size, ...props }) {
  return (
    <button
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}
```

### Utils (lib/utils.ts)

```typescript
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("pt-BR").format(new Date(date));
}
```

---

## 📡 Cliente tRPC no React

### Setup (lib/trpc.ts)

```typescript
import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "../../server/routers";

export const trpc = createTRPCReact<AppRouter>();
```

### Uso em Componentes

```typescript
import { trpc } from "@/lib/trpc";

function PetsList() {
  // Query
  const { data: pets, isLoading } = trpc.pets.list.useQuery();
  
  // Mutation
  const createPet = trpc.pets.create.useMutation({
    onSuccess: () => {
      // Invalidar cache para recarregar lista
      utils.pets.list.invalidate();
    },
  });

  const utils = trpc.useUtils();

  if (isLoading) return <div>Carregando...</div>;

  return (
    <div>
      {pets?.map(pet => (
        <div key={pet.id}>{pet.name}</div>
      ))}
      <button onClick={() => createPet.mutate({ name: "Rex" })}>
        Adicionar Pet
      </button>
    </div>
  );
}
```

---

## 📅 Calendário

### Tipos de Evento

```typescript
const EVENT_TYPES = {
  checkin: { label: "Check-in", color: "#22c55e" },
  checkout: { label: "Check-out", color: "#ef4444" },
  vaccine: { label: "Vacina", color: "#3b82f6" },
  medication: { label: "Medicamento", color: "#f59e0b" },
  grooming: { label: "Banho/Tosa", color: "#8b5cf6" },
  vet: { label: "Veterinário", color: "#ec4899" },
  custom: { label: "Personalizado", color: "#6b7280" },
};
```

### Componente de Evento

```typescript
function CalendarEvent({ event }) {
  const type = EVENT_TYPES[event.eventType] || EVENT_TYPES.custom;
  
  return (
    <div 
      className="p-2 rounded-md text-white text-sm"
      style={{ backgroundColor: type.color }}
    >
      <div className="font-medium">{event.title}</div>
      <div className="text-xs opacity-80">
        {formatDate(event.eventDate)}
      </div>
    </div>
  );
}
```

---

## 🔔 Notificações

### Schema de Notificação

```typescript
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  petId: integer("pet_id"),
  type: varchar("type", { length: 100 }).notNull(),
  title: varchar("title", { length: 200 }).notNull(),
  message: text("message").notNull(),
  isRead: boolean("is_read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

### Tipos de Notificação

```typescript
const NOTIFICATION_TYPES = [
  "vaccine_reminder",
  "medication_reminder", 
  "booking_approved",
  "booking_rejected",
  "low_credits",
  "new_photo",
  "checkin_confirmation",
];
```

---

## 💳 Integração Stripe

### Criar Checkout Session

```typescript
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

async function createCheckoutSession(userId: number, packageId: number) {
  const pkg = await getCreditPackage(packageId);
  
  const session = await stripe.checkout.sessions.create({
    payment_method_types: ["card", "pix"],
    line_items: [{
      price_data: {
        currency: "brl",
        product_data: {
          name: pkg.name,
          description: `${pkg.credits} créditos de creche`,
        },
        unit_amount: pkg.priceInCents,
      },
      quantity: 1,
    }],
    mode: "payment",
    success_url: `${process.env.APP_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${process.env.APP_URL}/credits`,
    metadata: {
      userId: userId.toString(),
      packageId: packageId.toString(),
    },
  });

  return session.url;
}
```

---

## 📤 Upload de Arquivos

### Presigned URL com S3/Supabase

```typescript
async function getUploadUrl(key: string, contentType: string) {
  const { data, error } = await supabase.storage
    .from("photos")
    .createSignedUploadUrl(key);
    
  if (error) throw error;
  return data.signedUrl;
}

// No frontend
async function uploadFile(file: File, uploadUrl: string) {
  await fetch(uploadUrl, {
    method: "PUT",
    body: file,
    headers: {
      "Content-Type": file.type,
    },
  });
}
```

---

## 📱 Layout Responsivo

### Sidebar Admin

```typescript
function AdminLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  return (
    <div className="min-h-screen bg-gray-100">
      {/* Mobile sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left">
          <Navigation />
        </SheetContent>
      </Sheet>

      {/* Desktop sidebar */}
      <aside className="hidden lg:fixed lg:inset-y-0 lg:flex lg:w-64 lg:flex-col">
        <Navigation />
      </aside>

      {/* Main content */}
      <main className="lg:pl-64">
        <header className="sticky top-0 z-10 bg-white shadow">
          <Button 
            variant="ghost" 
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-6 w-6" />
          </Button>
        </header>
        <div className="p-6">{children}</div>
      </main>
    </div>
  );
}
```

---

## 🧪 Testes

### Exemplo de Teste

```typescript
import { describe, it, expect, beforeEach } from "vitest";

describe("Pets", () => {
  beforeEach(async () => {
    // Setup
  });

  it("should create a new pet", async () => {
    const pet = await createPet({
      name: "Rex",
      breed: "Golden Retriever",
    });

    expect(pet.id).toBeDefined();
    expect(pet.name).toBe("Rex");
  });

  it("should list pets for tutor", async () => {
    const pets = await getPetsByTutor(tutorId);
    expect(pets.length).toBeGreaterThan(0);
  });
});
```

---

## 📋 Validação com Zod

### Schemas de Validação

```typescript
import { z } from "zod";

export const createPetSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").max(100),
  breed: z.string().max(100).optional(),
  birthDate: z.date().optional(),
  weight: z.number().min(0).optional(),
  notes: z.string().max(1000).optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "Senha deve ter no mínimo 6 caracteres"),
});

export const bookingRequestSchema = z.object({
  petId: z.number(),
  dates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)),
  notes: z.string().optional(),
});
```

---

## 🎯 Dicas Finais

1. **Mantenha o código simples** - Não adicione complexidade desnecessária
2. **Teste cedo** - Valide cada feature antes de avançar
3. **Use TypeScript estrito** - `strict: true` no tsconfig
4. **Documente decisões** - Comentários explicando o "porquê"
5. **Commits atômicos** - Um commit por feature/fix

---

*Este documento contém exemplos simplificados. Consulte o código original para implementações completas.*
