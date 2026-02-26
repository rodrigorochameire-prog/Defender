# Stack Tecnica - OMBUDS

## Frontend
| Tecnologia | Versao | Uso |
|------------|--------|-----|
| Next.js | 15 | Framework (App Router) |
| React | 19 | UI Library |
| Tailwind CSS | 4 | Estilos |
| shadcn/ui | latest | Componentes base |
| Lucide React | latest | Icones |
| Sonner | latest | Toast notifications |
| date-fns | latest | Manipulacao de datas |
| Recharts | latest | Graficos |

## Backend
| Tecnologia | Versao | Uso |
|------------|--------|-----|
| tRPC | 11 | API type-safe |
| Drizzle ORM | latest | ORM + migrations |
| Zod | latest | Validacao |
| postgres.js | latest | Driver PostgreSQL |

## Banco de Dados
| Servico | Uso |
|---------|-----|
| Supabase PostgreSQL | Banco principal |
| pgvector | Embeddings (futuro) |

## Infraestrutura
| Servico | Uso |
|---------|-----|
| Vercel | Deploy + serverless |
| Google Drive API | Sync de documentos |
| Google Gemini | IA (classificacao) |
| Inngest | Background jobs |

## Auth
- Custom implementation (sem next-auth)
- Email/senha com bcrypt
- Google OAuth
- Session cookies (httpOnly)
- Middleware de protecao de rotas

## Dev Tools
| Ferramenta | Uso |
|------------|-----|
| TypeScript | Type safety |
| ESLint | Linting |
| Drizzle Kit | Migrations |
| Claude Code | AI-assisted dev |
