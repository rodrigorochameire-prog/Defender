# OMBUDS System Architecture Report

> Generated: 2026-03-24 | Phase 1 - Brownfield Discovery (@architect)

---

## 1. Tech Stack

### Frontend (Next.js Monolith)

| Technology | Version | Purpose |
|-----------|---------|---------|
| **Next.js** | ^15.1.0 | Full-stack React framework (App Router) |
| **React** | ^19.0.0 | UI library |
| **TypeScript** | ^5.7.2 | Type safety |
| **Tailwind CSS** | ^3.4.16 | Utility-first styling |
| **tRPC** | ^11.0.0-rc.608 | End-to-end typesafe API |
| **Drizzle ORM** | ^0.36.4 | SQL query builder + ORM |
| **TanStack React Query** | ^5.60.0 | Server state management |
| **Zod** | ^3.23.8 | Schema validation |
| **Radix UI** | Various | Headless UI primitives (shadcn/ui pattern) |
| **Lucide React** | ^0.460.0 | Icons |
| **Serwist** | ^9.5.6 | Service Worker / PWA |
| **Sonner** | ^1.7.0 | Toast notifications |
| **Motion** (Framer) | ^12.29.2 | Animations |
| **Recharts** | ^3.6.0 | Charts/data viz |
| **Leaflet** | ^1.9.4 | Maps (VVD, Radar, Cadastro) |
| **react-pdf** | ^10.4.1 | PDF viewer |
| **jsPDF** | ^4.0.0 | PDF generation |
| **dnd-kit** | ^6.3.1 | Drag-and-drop (Kanban) |
| **date-fns** | ^4.1.0 | Date utilities |
| **Dexie** | ^4.3.0 | IndexedDB wrapper (offline support) |

### Backend (Python Microservice)

| Technology | Version | Purpose |
|-----------|---------|---------|
| **FastAPI** | >=0.115.0 | REST API framework |
| **Uvicorn** | >=0.30.0 | ASGI server |
| **Pydantic** | >=2.0 | Data validation |
| **Google GenAI** | >=1.12.0 | Gemini 2.5/3.x integration |
| **Anthropic SDK** | >=0.49.0 | Claude Sonnet/Opus |
| **LangChain** | >=0.3.30 | AI orchestration |
| **Agno** | >=1.5.0 | Agent orchestration |
| **Docling** | >=2.70.0 | Document parsing |
| **Playwright** | >=1.40.0 | Browser automation (SOLAR scraping) |
| **pyannote.audio** | >=3.1.0 | Speaker diarization |
| **Supabase SDK** | >=2.0.0 | DB/storage access |
| **BeautifulSoup4** | >=4.12.0 | HTML parsing (Radar) |
| **Instaloader** | >=4.10 | Instagram scraping (Radar) |
| **pytesseract** | >=0.3.10 | OCR |

### AI Services (Multi-provider)

| Provider | Models | Use Cases |
|---------|--------|-----------|
| **Google Gemini** | gemini-2.5-flash, gemini-2.5-pro, gemini-3.1-pro-preview | Document classification, extraction, analysis |
| **Anthropic Claude** | claude-sonnet-4-6, claude-opus-4 | Review, improvement, strategy |
| **OpenAI** | whisper-1, text-embedding-004 | Transcription, embeddings |
| **Vercel AI SDK** | ^6.0.35 | Streaming AI responses |

### Database & Infrastructure

| Technology | Purpose |
|-----------|---------|
| **PostgreSQL** (Supabase) | Primary database |
| **Supabase Storage** | File/image storage |
| **pgvector** (Supabase) | Semantic search embeddings |
| **Inngest** | Background job queue |
| **Axiom** | Observability/logging |
| **Vercel** | Frontend hosting (gru1 region - Sao Paulo) |
| **Railway** | Python backend hosting |

---

## 2. Folder Structure

```
defender/                        # Root (NOT a monorepo)
├── src/                         # Next.js application source
│   ├── app/                     # App Router (pages + API routes)
│   │   ├── (auth)/              # Auth route group (login, register, forgot-password)
│   │   ├── (public)/            # Public route group (reset-password)
│   │   ├── (dashboard)/admin/   # ALL dashboard pages (134 pages)
│   │   │   ├── assistidos/      # Assisted persons management
│   │   │   ├── processos/       # Legal processes
│   │   │   ├── demandas/        # Demands/tasks pipeline
│   │   │   ├── juri/            # Jury trial module (20+ sub-pages)
│   │   │   ├── casos/           # Case management
│   │   │   ├── drive/           # Document management (Google Drive)
│   │   │   ├── agenda/          # Calendar/schedule
│   │   │   ├── radar/           # Criminal intelligence radar
│   │   │   ├── vvd/             # Domestic violence module
│   │   │   └── ... (50+ feature directories)
│   │   └── api/                 # Next.js API routes (31 routes)
│   │       ├── trpc/[trpc]/     # tRPC handler
│   │       ├── ai/              # AI endpoints (5)
│   │       ├── webhooks/        # Webhook receivers (6)
│   │       ├── cron/            # Cron jobs (4)
│   │       ├── drive/           # Drive proxy/upload
│   │       ├── sheets/          # Google Sheets sync
│   │       └── google/          # Google OAuth
│   ├── components/              # React components (~300 files)
│   │   ├── ui/                  # shadcn/ui primitives (30)
│   │   ├── shared/              # Cross-feature components (50+)
│   │   ├── demandas-premium/    # Demandas advanced view (30)
│   │   ├── drive/               # Drive/document components (30)
│   │   ├── juri/                # Jury components (20)
│   │   ├── agenda/              # Calendar components (30)
│   │   ├── whatsapp/            # WhatsApp chat UI (20)
│   │   ├── radar/               # Radar components (15)
│   │   └── ... (15+ domain dirs)
│   ├── hooks/                   # Custom React hooks (13)
│   ├── contexts/                # React contexts (5)
│   ├── config/                  # Static config data
│   └── lib/                     # Core business logic
│       ├── auth/                # JWT session management
│       ├── db/                  # Database layer
│       │   └── schema/          # Drizzle schema (20 domain files)
│       ├── trpc/                # tRPC setup + routers
│       │   └── routers/         # 62 tRPC routers
│       ├── services/            # Service layer (22 services)
│       ├── supabase/            # Supabase client/storage
│       ├── inngest/             # Background jobs
│       ├── offline/             # PWA offline sync
│       ├── noticias/            # News scraper
│       └── utils/               # Shared utilities
├── enrichment-engine/           # Python FastAPI microservice
│   ├── routers/                 # API route handlers (25)
│   ├── services/                # Business logic services (20)
│   ├── prompts/                 # AI prompt templates (15)
│   ├── models/                  # Pydantic schemas
│   ├── tests/                   # Pytest tests (5 files)
│   └── scripts/                 # Utility scripts
├── drizzle/                     # Database migrations (26 files)
├── scripts/                     # CLI scripts (40+ files)
├── public/                      # Static assets
├── supabase/                    # Supabase config
└── docs/                        # Documentation
```

### Scale Metrics

| Metric | Count |
|--------|-------|
| TypeScript files | 799 |
| TypeScript lines of code | ~340,000 |
| Python files | ~90 |
| Python lines of code | ~19,000 |
| Pages (page.tsx) | 134 |
| API routes (route.ts) | 31 |
| tRPC routers | 62 |
| UI components | ~300 |
| Custom hooks | 13 |
| Database schema files | 20 |
| DB migration files | 26 |
| Drizzle enums | 45+ |

---

## 3. Architecture Patterns

### Pattern: Full-Stack Monolith + AI Microservice

The system follows a **two-tier architecture**:

1. **Next.js Monolith** (Vercel) - Handles all UI, business logic, tRPC API, auth, and database access
2. **Enrichment Engine** (Railway) - Python FastAPI for AI/ML tasks: document parsing, transcription, scraping, semantic search

Communication between tiers is via HTTP with API key authentication (`X-API-Key` header).

### NOT a Monorepo

Despite the `enrichment-engine/` folder, this is a **single repo with two deployable units**, not a monorepo managed by workspaces. There is no `pnpm-workspace.yaml`, no `turbo.json`, and no shared packages.

### App Router Pattern

Next.js App Router with route groups:
- `(auth)` - Login/register/forgot-password (public)
- `(public)` - Reset password
- `(dashboard)/admin` - All authenticated pages

All dashboard pages live under `/admin/` with a shared sidebar layout.

### Data Access Pattern

```
Page (Server Component)
  └── getSession() → auth check → redirect if unauthenticated
      └── renders Client Component
          └── trpc.router.procedure.useQuery()
              └── tRPC router (server)
                  └── protectedProcedure middleware
                      └── Drizzle ORM query
                          └── PostgreSQL (Supabase)
```

### Multi-Tenancy Pattern

The system uses a **comarca-scoped isolation** model:
- `comarca-scope.ts` implements 3-layer visibility filtering for assistidos
- `defensor-scope.ts` implements defensor-level data isolation for demandas
- Roles: `admin`, `defensor`, `estagiario`, `servidor`, `triagem`
- Admin sees everything, defensor sees own data, estagiario sees supervisor's data

---

## 4. API Layer

### tRPC Routers (62 total)

All routers are registered in `/src/lib/trpc/routers/index.ts` and exposed via `/api/trpc/[trpc]/route.ts`.

**Core Legal Domain:**
`assistidos`, `processos`, `demandas`, `casos`, `audiencias`, `prazos`, `diligencias`

**Jury Module:**
`juri`, `jurados`, `avaliacaoJuri`, `juriAnalytics`, `posJuri`, `preparacao`, `teses`, `briefing`

**Document Management:**
`drive`, `documents`, `documentSections`, `annotations`, `smartExtract`, `modelos`, `templates`, `oficios`

**Communication:**
`whatsapp`, `whatsappChat`, `notifications`, `notificationTemplates`, `mural`

**Team/Collaboration:**
`delegacao`, `cobertura`, `coberturas`, `parecer`, `pareceres`, `acompanhamento`, `profissionais`

**Intelligence/AI:**
`enrichment`, `intelligence`, `search`, `radar`, `noticias`

**System:**
`auth`, `users`, `settings`, `auditLogs`, `activityLogs`, `calendar`, `eventos`, `observatory`, `offline`, `comarcas`

**Integrations:**
`solar`, `legislacao`, `jurisprudencia`, `biblioteca`, `simulador`, `palacio`, `distribuicao`, `speakerLabels`

### REST API Routes (31 in Next.js)

| Path | Purpose |
|------|---------|
| `/api/trpc/[trpc]` | tRPC handler |
| `/api/ai/analyze-folder` | AI folder analysis |
| `/api/ai/summarize-transcript` | Transcript summarization |
| `/api/ai/strategy-advisor` | Legal strategy advisor |
| `/api/ai/transcribe` | Audio transcription |
| `/api/ai/transcribe-drive-file` | Drive file transcription |
| `/api/webhooks/openclaw` | OpenClaw webhook |
| `/api/webhooks/n8n/*` | N8N automation webhooks |
| `/api/webhooks/plaud` | Plaud recording device |
| `/api/webhooks/evolution` | Evolution WhatsApp API |
| `/api/webhooks/drive` | Google Drive changes |
| `/api/webhooks/whatsapp` | WhatsApp incoming |
| `/api/drive/proxy` | Drive file proxy |
| `/api/drive/upload` | Drive upload |
| `/api/whatsapp/send-media` | WhatsApp media send |
| `/api/whatsapp/sync-on-connect` | WhatsApp sync |
| `/api/sheets/*` | Google Sheets integration |
| `/api/google/*` | Google OAuth |
| `/api/cron/radar` | Radar scraping (2x daily) |
| `/api/cron/noticias` | News scraping (daily) |
| `/api/cron/radar-extract` | Radar extraction (4-hourly) |
| `/api/cron/pje-import` | PJe import |
| `/api/inngest` | Inngest job handler |
| `/api/auth/*` | Auth utilities |
| `/api/juri/upload` | Jury document upload |

### FastAPI Enrichment Engine Routes (25)

Organized under prefixes: `/enrich/*`, `/api/*`, `/solar/*`, `/cowork/*`

| Router | Purpose |
|--------|---------|
| `document` | Document parsing + classification |
| `pje` | PJe intimacao extraction |
| `transcript` | Transcript analysis |
| `audiencia` | Hearing minutes parsing |
| `whatsapp` | WhatsApp message triage |
| `solar` | SOLAR/DPEBA scraping |
| `sigad` | SIGAD scraping |
| `search` | Semantic search |
| `consolidation` | Intelligence consolidation |
| `transcription` | Whisper + diarization |
| `oficios` | Official letter generation |
| `ocr` | OCR processing |
| `extract` | Data extraction |
| `ficha` | Profile sheet generation |
| `analysis` | Case analysis |
| `cross_analysis` | Cross-case analysis |
| `diarization` | Speaker diarization |
| `semantic_search` | pgvector search |
| `juri` | Jury AI analysis |
| `radar` | Criminal radar extraction |
| `summarize_chat` | Chat summarization |
| `extract_data` | General data extraction |
| `cowork` | Collaborative import |

---

## 5. Authentication & Authorization

### Authentication: Custom JWT (jose library)

- **Session token**: HS256-signed JWT stored in httpOnly cookie (`defesahub_session`)
- **Session duration**: 30 days
- **Secret**: `AUTH_SECRET` environment variable
- **No external auth provider** (no NextAuth, no Clerk, no Supabase Auth)
- **Password hashing**: bcryptjs

### Session Flow

1. User submits email+password to login action
2. Server verifies password hash with bcryptjs
3. Server creates JWT with `{userId, role}`, signs with AUTH_SECRET
4. JWT set as httpOnly, secure, sameSite=lax cookie
5. On each request, middleware checks cookie presence
6. tRPC context decodes JWT, loads user from DB (with 2-min in-memory cache)

### Authorization Layers

1. **Middleware** (`src/middleware.ts`) - Cookie presence check, redirects to login
2. **tRPC procedures** - `publicProcedure`, `protectedProcedure` (logged in), `adminProcedure` (admin role)
3. **Comarca scope** (`comarca-scope.ts`) - 3-layer assistido visibility filter
4. **Defensor scope** (`defensor-scope.ts`) - Demanda isolation by defensor/estagiario/servidor

### Roles

| Role | Permissions |
|------|------------|
| `admin` | Full access to everything |
| `defensor` | Own demandas, comarca-scoped assistidos/processos |
| `estagiario` | Supervisor's demandas, same comarca scope |
| `servidor` | All demandas (read), administrative functions |
| `triagem` | Limited triage access |

### Security Note

The middleware only checks for cookie **presence**, not JWT validity. JWT validation happens in the tRPC context creation (`createTRPCContext`). This means non-tRPC server-side code must explicitly call `getSession()`.

---

## 6. State Management

### Client-Side State

| Layer | Technology | Usage |
|-------|-----------|-------|
| **Server state** | TanStack Query (via tRPC) | All data fetching, caching, mutations |
| **Theme** | React Context (`ThemeContext`) | Light/medium/dark theme toggle |
| **Assignment** | React Context (`AssignmentContext`) | Current workspace/atribuicao selection |
| **Profissional** | React Context (`ProfissionalContext`) | Current professional context |
| **Processing Queue** | React Context (`ProcessingQueueContext`) | File processing status |
| **Entity Sheet** | React Context (`EntitySheetContext`) | Side panel entity details |
| **URL state** | Next.js searchParams | Filters, pagination |
| **Local storage** | Direct localStorage | Theme preference, font size |
| **Offline** | Dexie (IndexedDB) | PWA offline data cache |

### Query Configuration

- `staleTime`: 2 minutes
- `gcTime`: 10 minutes
- `refetchOnWindowFocus`: false
- `refetchOnMount`: false
- Smart batching with 3-tier `splitLink`: solo queries, fast queries, normal batch

---

## 7. Configuration

### Environment Variables

**Required (runtime):**
- `DATABASE_URL` - PostgreSQL connection string
- `AUTH_SECRET` - JWT signing secret (min 16 chars)

**Supabase:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

**AI Providers:**
- `OPENAI_API_KEY` - Whisper transcription
- `ANTHROPIC_API_KEY` - Claude analysis
- `GOOGLE_GENERATIVE_AI_API_KEY` / `GEMINI_API_KEY` - Gemini

**Integrations:**
- `ENRICHMENT_API_KEY` - Enrichment Engine auth
- `PYTHON_BACKEND_URL` - Enrichment Engine URL
- `WHATSAPP_ACCESS_TOKEN` / `WHATSAPP_PHONE_NUMBER_ID`
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` / `GOOGLE_REFRESH_TOKEN`
- `INNGEST_EVENT_KEY` / `INNGEST_SIGNING_KEY`
- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET`
- `EVOLUTION_API_URL` / `EVOLUTION_API_KEY`
- Various SOLAR, SIGAD credentials

### Build Configuration

- **next.config.js**: Serwist PWA, Supabase image domains, 2MB server action limit, TypeScript errors IGNORED (`ignoreBuildErrors: true`)
- **tsconfig.json**: Strict mode, bundler module resolution, `@/*` path alias
- **tailwind.config.ts**: Custom theme with shadcn/ui CSS variables, legal-domain semantic fonts
- **drizzle.config.ts**: PostgreSQL dialect, schema from `./src/lib/db/schema`
- **vercel.json**: Region gru1, 60s max duration for API routes, 3 cron jobs
- **postcss.config.js**: Tailwind + autoprefixer

---

## 8. Dependencies Analysis

### Key Dependencies (80+ total)

**Critical path:**
- `next@^15.1.0` - Framework core
- `react@^19.0.0` - React 19 (latest)
- `@trpc/*@^11.0.0-rc.608` - tRPC v11 **release candidate** (not stable)
- `drizzle-orm@^0.36.4` - ORM
- `postgres@^3.4.5` - PostgreSQL driver
- `jose@^5.9.6` - JWT handling

**Potential concerns:**
- `@trpc/*` is on a **release candidate** version (rc.608) - risk of breaking changes
- `pdfjs-dist@^5.4.624` - Very new, may have edge cases
- `motion@^12.29.2` - Framer Motion rebrand, major version
- 7 Radix UI packages at different versions
- `xlsx@^0.18.5` - SheetJS, has had licensing concerns in the past

**Heavy dependencies:**
- `googleapis@^171.2.0` - Full Google API client (very large bundle)
- `leaflet` + 4 related packages - Map rendering
- `recharts@^3.6.0` - Chart library
- `pdfjs-dist` - PDF rendering engine

### DevDependencies

- `cheerio@^1.2.0` in devDependencies but used at runtime for scraping
- No test runner configured (no jest, vitest, or playwright test config)
- `eslint@^8.57.1` - ESLint v8 (v9 is current)

---

## 9. Code Patterns

### Common Patterns

1. **tRPC Router Pattern**: Every domain has a router in `src/lib/trpc/routers/`. Routers use `protectedProcedure` with Zod input validation, Drizzle queries, and explicit error handling.

2. **Server Component + Client Component Split**: Pages are server components that do auth checks, rendering client components for interactive UI.

3. **shadcn/ui Component Library**: UI primitives in `src/components/ui/` follow the shadcn/ui pattern with Radix + Tailwind + CVA.

4. **Shared Components**: `src/components/shared/` contains reusable components (page headers, stats cards, data tables, etc.).

5. **Domain-Organized Components**: Components grouped by feature domain (agenda, drive, juri, radar, etc.).

6. **Service Layer**: `src/lib/services/` contains external integration logic (Google Drive, Google Calendar, WhatsApp, PJe, etc.).

7. **Barrel Exports**: Most component directories have `index.ts` barrel files.

8. **Zod Validation**: Input validation at tRPC boundary using Zod schemas.

9. **Enrichment Client**: HTTP client in `src/lib/services/enrichment-client.ts` communicates with the Python backend.

10. **Prompt Engineering**: Enrichment engine has dedicated `prompts/` directory with domain-specific AI prompts.

---

## 10. Integration Points

### External Services

| Service | Integration Type | Purpose |
|---------|-----------------|---------|
| **Supabase** | SDK (JS + Python) | Database (PostgreSQL), Storage (files/images), pgvector |
| **Google Drive** | OAuth + REST API | Document storage, folder structure |
| **Google Calendar** | OAuth + REST API | Schedule sync |
| **Google Sheets** | Webhooks + REST API | Data import/sync |
| **WhatsApp** (Evolution API) | REST + Webhooks | Client communication |
| **WhatsApp** (Meta Cloud API) | REST + Webhooks | Fallback messaging |
| **SOLAR/DPEBA** | Playwright scraping | Defensoria case sync |
| **SIGAD** | Web scraping | Document/case import |
| **PJe** | HTML parsing | Court intimations import |
| **SEEU** | Integration service | Prison execution system |
| **Plaud** | Webhook receiver | Audio recording device |
| **OpenClaw** | Webhook | Legal data enrichment |
| **N8N** | Webhooks | Workflow automation |
| **Inngest** | SDK | Background job processing |
| **Stripe** | SDK | Payment processing (planned) |
| **Notion** | SDK | Data sync |
| **Axiom** | SDK | Observability/logging |
| **Google News** | Scraping | Legal news aggregation |
| **Instagram** | Instaloader | Social media intelligence (Radar) |

### Supabase Usage

- **Database**: PostgreSQL via Drizzle ORM (NOT Supabase client for queries)
- **Storage**: File upload/download via Supabase Storage SDK
- **Auth**: NOT used (custom JWT auth instead)
- **Realtime**: NOT used
- **Edge Functions**: NOT used

---

## 11. Build & Deploy

### Frontend (Vercel)

- **Build**: `next build` with TypeScript errors ignored
- **Dev**: `next dev --turbopack` (Turbopack for speed)
- **Region**: gru1 (Sao Paulo, Brazil)
- **Functions**: Max 60s duration for API routes
- **Cron Jobs**: 3 Vercel cron jobs (radar 2x/day, news 1x/day, radar-extract 4-hourly)
- **Install**: `npm install --legacy-peer-deps` (peer dep conflicts)
- **PWA**: Serwist service worker generation

### Enrichment Engine (Railway)

- **Build**: Docker (Python 3.12-slim + system deps for OCR/Chromium/FFmpeg)
- **Region**: us-east4
- **Cron**: Railway cron every 10 min for stuck job recovery
- **Runtime**: Uvicorn, PORT injected by Railway

### CI/CD

- **No GitHub Actions workflow files found** - deployment appears to be push-to-deploy via Vercel and Railway
- `.github/agents/` contains agent definitions (AIOX framework) but no CI workflows

---

## 12. System-Level Technical Debts

### CRITICAL

| Debt | Location | Impact |
|------|----------|--------|
| **TypeScript build errors ignored** | `next.config.js` line 33: `ignoreBuildErrors: true` | Type safety completely bypassed at build time. Runtime type errors possible. |
| **Hardcoded Supabase credentials in source** | `src/lib/supabase/client.ts` lines 4-5 | Supabase URL and anon key are hardcoded as fallback defaults. While anon keys are meant to be public, this is a bad practice and makes rotation impossible without code changes. |
| **No test suite** | Entire project | Zero test files in the Next.js app. No jest/vitest config. Enrichment engine has only 5 test files. 340K lines of code with no automated testing. |
| **tRPC on release candidate** | `package.json` | `@trpc/*@^11.0.0-rc.608` is pre-release software. Breaking changes possible with any update. |
| **No CI/CD pipeline** | `.github/` | No GitHub Actions, no automated lint/typecheck/test before deploy. Direct push-to-deploy. |

### HIGH

| Debt | Location | Impact |
|------|----------|--------|
| **186 uses of `any` type in tRPC routers** | `src/lib/trpc/routers/` | Defeats TypeScript's type safety in the core API layer. |
| **102 TODO/FIXME/HACK markers** | 48 files across `src/` | Acknowledged debt scattered throughout the codebase. |
| **CORS allow_origins=["*"]** on enrichment engine | `enrichment-engine/main.py` line 91 | Any origin can call the API. Should be restricted to Vercel domain. |
| **In-memory rate limiting** | `src/lib/security.ts` | Rate limiter uses in-memory Map, reset on every serverless cold start. Effectively useless in Vercel's serverless model. |
| **In-memory user session cache** | `src/lib/auth/session.ts` | 2-minute Map cache works in long-running servers but is unreliable in serverless (each function instance has its own cache). |
| **`--legacy-peer-deps` required** | `vercel.json` | Peer dependency conflicts not resolved; masked with flag. |
| **Middleware only checks cookie presence** | `src/middleware.ts` | Does not validate JWT. An expired or tampered cookie passes middleware check (caught later in tRPC context). |
| **Google Drive service has 99 console.log calls** | `src/lib/services/google-drive.ts` | Excessive logging, likely from debugging. Pollutes production logs. |
| **Enrichment Engine API key is shared** | Single `ENRICHMENT_API_KEY` | One key for all routes. No per-route or per-client granularity. Key rotation requires coordinated deploy of both services. |

### MEDIUM

| Debt | Location | Impact |
|------|----------|--------|
| **Duplicate router patterns** | `cobertura` + `coberturas`, `parecer` + `pareceres` | Two routers for what appears to be the same domain. Code duplication risk. |
| **62 tRPC routers in single index** | `src/lib/trpc/routers/index.ts` | All 62 routers imported and registered in one file. No lazy loading or code splitting. |
| **No structured logging** | Frontend uses `console.log/error/warn` (226 occurrences in 30+ files) | No log levels, no structured format, no correlation IDs in non-tRPC code. |
| **pje-parser.ts is 1,586 lines** | `src/lib/pje-parser.ts` | Single monolithic file for PJe HTML parsing. Hard to maintain and test. |
| **Schema has 45+ enums** | `src/lib/db/schema/enums.ts` (525 lines) | All enums in one file. Some enums are domain-specific but not co-located. |
| **Multiple DB driver packages** | `pg` + `postgres` in dependencies | Both `pg` and `postgres` are installed. Only `postgres` (postgres.js) is used by Drizzle. `pg` appears unused. |
| **Cheerio in devDependencies** | `package.json` | Used for scraping at runtime but listed as dev dependency. |
| **Large image assets in repo root** | 7 logo files totaling ~36MB | Binary assets should be in storage, not git. Bloats repo size. |
| **DB connection pool at 5 in production** | `src/lib/db/index.ts` | Fixed pool of 5 may be insufficient under load. Supabase connection pooler (PgBouncer) should be used exclusively. |
| **Missing error boundaries** | React components | No React error boundaries found. Unhandled component errors crash entire pages. |

### LOW

| Debt | Location | Impact |
|------|----------|--------|
| **ESLint v8** | `package.json` | ESLint v9 is current; v8 is legacy. |
| **Inconsistent hook naming** | `src/hooks/` | Mix of `use-kebab-case.ts` and `useCamelCase.ts`. |
| **Test file in production code** | `src/components/cowork/test-file.txt` | Test artifact committed to source. |
| **Multiple lock files** | `package-lock.json` + `pnpm-lock.yaml` | Indicates inconsistent package manager usage. |
| **Shell scripts at root** | 5+ `.sh` files | Database fix scripts (`fix-database-FINAL.sh`, etc.) suggesting manual DB fixes. Should be proper migrations. |
| **No PWA offline test** | Offline hooks exist but no tests | Offline sync (`use-offline-sync.ts`) is complex but untested. |
| **Security token generation fallback** | `src/lib/security.ts` line 141 | Falls back to `Math.random()` if `crypto` unavailable. Should never happen in Node.js but is a weak pattern. |
| **drizzle migration naming** | `drizzle/` | Multiple `0000_*.sql` and `0013_*.sql` files suggest migration conflicts or resets. |
| **robots: index: true** | `src/app/layout.tsx` | Search engines can index an internal management tool. Should be `noindex`. |

### Performance Concerns

| Issue | Impact |
|-------|--------|
| All 62 tRPC routers loaded on every request | Cold start time in serverless |
| `googleapis` package is enormous (~50MB) | Bundle size, cold starts |
| No React.lazy or dynamic imports for heavy pages | Initial bundle includes all page code |
| TanStack Virtual used but not consistently | Large lists may not be virtualized everywhere |
| Turbopack used in dev but not production | Build speed only, no production benefit |

### Missing Documentation

| What | Status |
|------|--------|
| API documentation (OpenAPI/Swagger) | tRPC has no auto-docs; enrichment engine has FastAPI docs at `/docs` |
| Database schema documentation | Schema files are self-documenting but no ERD or relationship docs |
| Deployment runbook | No documented deploy process |
| Onboarding guide | No developer setup guide beyond basic README |
| Architecture Decision Records (ADRs) | No ADRs documenting key technical decisions |

---

## Summary

OMBUDS is a **large-scale, feature-rich legal case management system** built as a Next.js 15 monolith with a Python AI microservice. The codebase is substantial (~360K LOC) with 134 pages, 62 tRPC routers, and deep integrations with Google Workspace, WhatsApp, court systems (PJe, SOLAR, SIGAD), and multiple AI providers.

**Strengths:**
- Well-structured tRPC API layer with proper auth middleware
- Comprehensive domain modeling with Drizzle ORM
- Smart multi-tenancy with comarca and defensor scoping
- Extensive AI integration pipeline (document parsing, transcription, analysis)
- PWA support with offline capabilities
- Good separation between Next.js frontend and Python AI backend

**Critical risks:**
- Zero automated tests for 340K lines of code
- TypeScript build errors suppressed (`ignoreBuildErrors: true`)
- No CI/CD pipeline
- tRPC on unstable release candidate
- Hardcoded credentials in source code
- In-memory caching patterns incompatible with serverless architecture
