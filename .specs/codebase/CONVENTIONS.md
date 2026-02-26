# Convencoes - OMBUDS

## Estrutura de Arquivos

### Paginas
```
src/app/(dashboard)/admin/[modulo]/page.tsx   # Pagina principal
src/app/(dashboard)/admin/[modulo]/[id]/page.tsx  # Detalhe
```

### Routers tRPC
```
src/lib/trpc/routers/[modulo].ts   # Router com CRUD
src/lib/trpc/routers/index.ts      # Registro central
```

### Componentes
```
src/components/[modulo]/   # Componentes especificos
src/components/ui/         # shadcn/ui base
src/components/shared/     # Compartilhados
```

## Padroes de Codigo

### Router tRPC
- Usar `protectedProcedure` para rotas autenticadas
- Usar `adminProcedure` para rotas admin-only
- Envolver em `safeAsync()` para error handling padrao
- Input validado com Zod schemas
- Retornar dados necessarios (nao expor passwordHash, etc)

### Componentes React
- "use client" explicito quando necessario
- Estado local com useState
- Dados server com trpc.xxx.useQuery()
- Mutacoes com trpc.xxx.useMutation() + toast feedback
- Invalidacao de cache com utils.xxx.invalidate()

### Schema Drizzle
- pgTable com indices relevantes
- Timestamps: createdAt, updatedAt
- Soft delete quando aplicavel (deletedAt)
- FK com onDelete cascade/set null conforme dominio
- Relations definidas apos a tabela

### Commits
- feat: nova funcionalidade
- fix: correcao de bug
- style: visual/design
- refactor: melhoria sem mudar comportamento
- Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>

### Design
- Padrao Defender: zinc + emerald
- Lucide para icones (nao emojis)
- cursor-pointer em clicaveis
- Hover com transition 150-300ms
- Toast via sonner para feedback
