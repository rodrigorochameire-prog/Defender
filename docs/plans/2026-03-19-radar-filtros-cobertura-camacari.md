# Radar Criminal — Filtros e Cobertura Camaçari

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Reduzir ruído de outros municípios no radar criminal e ampliar cobertura local de Camaçari com Instagram oficial e grupos de WhatsApp.

**Architecture:** Três frentes paralelas: (A) filtros defensivos no frontend e backend para eliminar false positives, (B) fontes novas via Instaloader para perfis oficiais da PM, (C) extensão do webhook Evolution API para monitorar grupos de WhatsApp públicos de segurança.

**Tech Stack:** Python (httpx, instaloader), Next.js 15, tRPC, Drizzle ORM, Supabase, Evolution API v2.3.7

---

## Task 1: Score floor 60 — estado inicial do feed

**Files:**
- Modify: `src/app/(dashboard)/admin/radar/page.tsx:37-39`
- Modify: `src/components/radar/radar-filtros.tsx:78-88`

**Step 1: Alterar estado inicial da página para relevanciaMin: 60**

Em `src/app/(dashboard)/admin/radar/page.tsx`, linha 37:
```tsx
const [filtros, setFiltros] = useState<FiltrosState>({
  soMatches: false,
  relevanciaMin: 60,
});
```

**Step 2: Atualizar EMPTY_FILTROS no componente de filtros**

Em `src/components/radar/radar-filtros.tsx`, linha 78-88, alterar:
```tsx
const EMPTY_FILTROS: FiltrosState = {
  tipoCrime: undefined,
  bairro: undefined,
  fonte: undefined,
  search: undefined,
  dataInicio: undefined,
  dataFim: undefined,
  soMatches: false,
  circunstancia: undefined,
  relevanciaMin: 60,  // default: ocultar artigos de baixa relevância
};
```

**Step 3: Adicionar opção "Todas (0+)" explícita no select de relevância**

Em `src/components/radar/radar-filtros.tsx`, seção SelectContent (~linha 353):
```tsx
<SelectItem value="0" className="cursor-pointer text-xs">Todas (0+)</SelectItem>
<SelectItem value="60" className="cursor-pointer text-xs">Prováveis (60+)</SelectItem>
<SelectItem value="85" className="cursor-pointer text-xs">Confirmadas (85+)</SelectItem>
<SelectItem value="35" className="cursor-pointer text-xs">Possíveis (35+)</SelectItem>
```

**Step 4: Commit**
```bash
git add src/app/(dashboard)/admin/radar/page.tsx src/components/radar/radar-filtros.tsx
git commit -m "feat(radar): default score floor 60 para reduzir ruído no feed"
```

---

## Task 2: Expandir blocklist para municípios vizinhos

**Files:**
- Modify: `enrichment-engine/services/radar_extraction_service.py:35-49`

**Step 1: Adicionar municípios vizinhos ao BAIRROS_SALVADOR_BLOCKLIST**

Em `radar_extraction_service.py`, expandir `BAIRROS_SALVADOR_BLOCKLIST` (após linha 49):
```python
# Municípios vizinhos que NÃO são Camaçari — adicionados para reduzir false positives
MUNICIPIOS_VIZINHOS_BLOCKLIST = {
    # Lauro de Freitas
    "itinga", "vida nova", "portão", "alphaville", "buraquinho", "vilas do atlântico",
    "villas do atlântico", "centro de lauro", "jardim ipitanga",
    # Simões Filho
    "centro de simões filho", "boca da mata", "distrito industrial de simões",
    # Dias d'Ávila
    "centro de dias d'ávila", "coutos", "jardim dias d'ávila",
    # Madre de Deus
    "madre de deus", "ilha de mare",
    # Candeias
    "candeias", "centro de candeias",
    # São Francisco do Conde
    "são francisco do conde", "sao francisco do conde", "rio sena",
    # Pojuca
    "pojuca", "centro de pojuca",
    # Mata de São João
    "mata de são joão", "mata de sao joao", "praia do forte",
    # Catu (diferente de Catu de Abrantes, que É Camaçari)
    "catu centro", "catu ba",
}
```

**Step 2: Usar blocklist no método de validação de bairro**

Localizar o método que chama `BAIRROS_SALVADOR_BLOCKLIST` e adicionar verificação:

```python
def _is_bairro_valido(self, bairro: str | None) -> bool:
    """Verifica se bairro extraído pertence a Camaçari."""
    if not bairro:
        return True  # sem bairro = inconclusivo, deixa passar
    bairro_lower = bairro.lower().strip()
    if bairro_lower in BAIRROS_SALVADOR_BLOCKLIST:
        return False
    if bairro_lower in MUNICIPIOS_VIZINHOS_BLOCKLIST:
        return False
    return True
```

**Step 3: Commit**
```bash
git add enrichment-engine/services/radar_extraction_service.py
git commit -m "fix(radar): expandir blocklist com municípios vizinhos (Lauro, Simões, Dias d'Ávila)"
```

---

## Task 3: URLs segmentadas para fontes regionais

**Files:**
- Modify: `enrichment-engine/services/radar_scraper_service.py:317-342`

**Step 1: Atualizar paths específicos por domínio no `_get_search_urls`**

Substituir o bloco de domínios específicos (linhas 317-342) por versão com tags de Camaçari:

```python
# Específicos por domínio — usar tags/seções de Camaçari quando disponíveis
domain = base_url.lower()
if "g1.globo.com" in domain:
    paths = [
        "/ba/bahia/tag/camacari/",
        "/ba/bahia/noticia",   # fallback
    ]
elif "bnews" in domain:
    paths = ["/tag/camacari", "/cidades/camacari", "/cidades/policia"]
elif "correio24horas" in domain or "correionoticias" in domain:
    paths = ["/tag/camacari", "/noticia/camacari", "/policia"]
elif "atarde" in domain:
    paths = ["/tag/camacari", "/municipios/camacari", "/bahia/policia"]
elif "bahianoticias" in domain:
    paths = ["/municipios/camacari", "/seguranca-publica", "/municipios"]
elif "relatabahia" in domain:
    paths = ["/tag/camacari", "/policia", "/noticias"]
elif "maisregiao" in domain:
    paths = ["/camacari-ba", "/camacari", "/ultimas-noticias"]
elif "camacarifatosefotos" in domain:
    paths = ["/index.php/policial", "/index.php/cidade"]
elif "bahiacomenta" in domain:
    paths = ["/camacari-ba", "/policia"]
elif "bahianoar" in domain:
    paths = ["/cidades/camacari", "/cidades/camacari/"]
```

**Step 2: Exigir "camaçari" no título para fontes regionais na triagem inicial**

No método `_scrape_portal` (~linha 207), antes de chamar `_scrape_article`, adicionar filtro extra para fontes regionais:

```python
# Para fontes regionais, filtro extra: "camaçari" deve estar no título
if confiabilidade == "regional":
    link_lower = link_title.lower()
    if not any(kw in link_lower for kw in ["camaçari", "camacari"]):
        # Sem Camaçari no título: só aceita se score for muito alto (>= 75)
        # Calculamos score parcial pelo título
        score_titulo = self._calculate_relevancia_score(link_title, None)
        if score_titulo < 25:  # threshold para título sem "camaçari"
            continue
```

**Step 3: Commit**
```bash
git add enrichment-engine/services/radar_scraper_service.py
git commit -m "fix(radar): URLs regionais agora apontam para tags de Camaçari + filtro de título"
```

---

## Task 4: Adicionar fontes novas no banco (Fala Camaçari + Instagram)

**Files:**
- Create: `supabase/migrations/20260319_radar_novas_fontes.sql`

**Step 1: Criar migration SQL**

```sql
-- Adicionar novas fontes ao radar
INSERT INTO radar_fontes (nome, tipo, url, confiabilidade, ativo)
VALUES
  ('Fala Camaçari', 'portal', 'https://fala.camacari.ba.gov.br', 'local', true),
  ('12º BPM Camaçari', 'instagram', '@12bpmcamacari', 'local', true),
  ('Defesa Civil Camaçari', 'instagram', '@defesacivilcamacari', 'local', true),
  ('Prefeitura Camaçari', 'instagram', '@prefcamacari', 'local', false)  -- começa desativado
ON CONFLICT (nome) DO NOTHING;
```

**Step 2: Aplicar migration via Supabase MCP ou CLI**

```bash
# Via CLI local
supabase db push

# Verificar
supabase db diff
```

**Step 3: Commit**
```bash
git add supabase/migrations/20260319_radar_novas_fontes.sql
git commit -m "feat(radar): adicionar fontes 12º BPM, Defesa Civil, Fala Camaçari"
```

---

## Task 5: Instagram scraper service (Instaloader)

**Files:**
- Create: `enrichment-engine/services/radar_instagram_service.py`
- Modify: `enrichment-engine/requirements.txt`
- Modify: `enrichment-engine/routers/radar.py`

**Step 1: Adicionar instaloader ao requirements**

Em `enrichment-engine/requirements.txt`, adicionar:
```
instaloader>=4.10
```

**Step 2: Criar `radar_instagram_service.py`**

```python
"""
Radar Criminal — Scraper de perfis Instagram oficiais de segurança pública.
Usa Instaloader para coletar posts recentes de perfis públicos (@12bpmcamacari, etc.)
"""
from __future__ import annotations

import logging
import hashlib
from datetime import datetime, timezone, timedelta
from typing import Any

logger = logging.getLogger("enrichment-engine.radar-instagram")

# Score base para posts de órgãos oficiais de segurança
SCORE_INSTAGRAM_OFICIAL = 65


class RadarInstagramService:
    """Coleta posts recentes de perfis Instagram públicos de segurança de Camaçari."""

    def __init__(self):
        try:
            import instaloader
            self._loader = instaloader.Instaloader(
                download_pictures=False,
                download_videos=False,
                download_video_thumbnails=False,
                download_geotags=False,
                download_comments=False,
                save_metadata=False,
                compress_json=False,
                quiet=True,
            )
        except ImportError:
            logger.error("instaloader não instalado. Execute: pip install instaloader")
            self._loader = None

    def _generate_url(self, shortcode: str) -> str:
        return f"https://www.instagram.com/p/{shortcode}/"

    def _generate_hash(self, handle: str, post_id: str) -> str:
        return hashlib.sha256(f"instagram:{handle}:{post_id}".encode()).hexdigest()

    async def scrape_perfil(
        self, handle: str, fonte_nome: str, fonte_id: int | None, max_posts: int = 20
    ) -> list[dict[str, Any]]:
        """Coleta posts recentes de um perfil Instagram público."""
        if not self._loader:
            return []

        import instaloader
        handle = handle.lstrip("@")
        noticias = []
        cutoff = datetime.now(timezone.utc) - timedelta(days=30)

        try:
            profile = instaloader.Profile.from_username(self._loader.context, handle)
        except Exception as e:
            logger.warning("Perfil @%s não encontrado: %s", handle, str(e))
            return []

        count = 0
        for post in profile.get_posts():
            if count >= max_posts:
                break

            # Ignorar posts mais antigos que 30 dias
            post_date = post.date_utc.replace(tzinfo=timezone.utc)
            if post_date < cutoff:
                break

            caption = post.caption or ""
            if not caption or len(caption.strip()) < 20:
                count += 1
                continue

            url = self._generate_url(post.shortcode)
            content_hash = self._generate_hash(handle, str(post.mediaid))

            noticias.append({
                "url": url,
                "fonte": fonte_nome,
                "fonte_id": fonte_id,
                "titulo": caption[:120].split("\n")[0],  # primeira linha como título
                "corpo": caption,
                "data_publicacao": post_date.isoformat(),
                "imagem_url": post.url if post.typename == "GraphImage" else None,
                "enrichment_status": "pending",
                "relevancia_score": SCORE_INSTAGRAM_OFICIAL,
                "content_hash": content_hash,
            })
            count += 1

        logger.info("Instagram @%s: %d posts coletados", handle, len(noticias))
        return noticias

    async def scrape_all_instagram_fontes(self) -> list[dict[str, Any]]:
        """Scrape todos os perfis Instagram ativos no banco."""
        from services.supabase_service import get_supabase_service

        supa = get_supabase_service()
        client_db = supa._get_client()

        result = client_db.table("radar_fontes") \
            .select("*") \
            .eq("tipo", "instagram") \
            .eq("ativo", True) \
            .execute()
        fontes = result.data or []

        existing = client_db.table("radar_noticias").select("content_hash").execute()
        existing_hashes = {r["content_hash"] for r in (existing.data or []) if r.get("content_hash")}

        all_noticias = []
        for fonte in fontes:
            handle = fonte["url"]  # armazenado como "@handle"
            try:
                posts = await self.scrape_perfil(handle, fonte["nome"], fonte["id"])
                # Deduplicar por content_hash
                novos = [p for p in posts if p["content_hash"] not in existing_hashes]
                all_noticias.extend(novos)
                existing_hashes.update(p["content_hash"] for p in novos)

                client_db.table("radar_fontes").update({
                    "ultima_coleta": datetime.now(timezone.utc).isoformat()
                }).eq("id", fonte["id"]).execute()
            except Exception as e:
                logger.error("Falha ao scraper Instagram @%s: %s", handle, str(e))

        return all_noticias
```

**Step 3: Adicionar endpoint no router radar.py**

Em `enrichment-engine/routers/radar.py`, adicionar após o endpoint de scrape existente:

```python
@router.post("/api/radar/scrape-instagram", response_model=RadarScrapeOutput)
async def scrape_instagram():
    """Coleta posts recentes de perfis Instagram oficiais de segurança de Camaçari."""
    from services.radar_instagram_service import RadarInstagramService
    from services.radar_scraper_service import RadarScraperService

    instagram_service = RadarInstagramService()
    scraper = RadarScraperService()

    noticias = await instagram_service.scrape_all_instagram_fontes()
    saved = await scraper.save_noticias(noticias)

    return RadarScrapeOutput(
        noticias_coletadas=len(noticias),
        noticias_salvas=saved,
    )
```

**Step 4: Adicionar ao cron principal**

Em `src/app/api/cron/radar/route.ts`, após o passo de scrape portal, adicionar chamada ao instagram:
```typescript
// 1b. Instagram scrape (perfis oficiais)
const instagramRes = await enrichmentClient.post('/api/radar/scrape-instagram', {}, { timeout: 30000 })
  .catch(() => null); // não bloqueia se falhar
```

**Step 5: Commit**
```bash
git add enrichment-engine/services/radar_instagram_service.py \
        enrichment-engine/requirements.txt \
        enrichment-engine/routers/radar.py \
        src/app/api/cron/radar/route.ts
git commit -m "feat(radar): Instagram scraper para 12º BPM e Defesa Civil Camaçari"
```

---

## Task 6: Migration — tabela radar_whatsapp_grupos

**Files:**
- Create: `supabase/migrations/20260319_radar_whatsapp_grupos.sql`
- Modify: `src/lib/db/schema/radar.ts`

**Step 1: Migration SQL**

```sql
CREATE TABLE radar_whatsapp_grupos (
  id          serial PRIMARY KEY,
  jid         text UNIQUE NOT NULL,        -- ex: 120363xxx@g.us
  nome        text NOT NULL,               -- "Plantão Camaçari", "Moradores Centro"
  descricao   text,
  ativo       boolean NOT NULL DEFAULT true,
  created_at  timestamp with time zone NOT NULL DEFAULT now(),
  updated_at  timestamp with time zone NOT NULL DEFAULT now()
);

-- RLS: leitura para todos autenticados, escrita via service_role
ALTER TABLE radar_whatsapp_grupos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "radar_whatsapp_grupos_read" ON radar_whatsapp_grupos
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "radar_whatsapp_grupos_write" ON radar_whatsapp_grupos
  FOR ALL TO service_role USING (true);
```

**Step 2: Schema Drizzle em `src/lib/db/schema/radar.ts`**

Adicionar ao final do arquivo:
```typescript
export const radarWhatsappGrupos = pgTable("radar_whatsapp_grupos", {
  id: serial("id").primaryKey(),
  jid: text("jid").notNull().unique(),
  nome: text("nome").notNull(),
  descricao: text("descricao"),
  ativo: boolean("ativo").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export type RadarWhatsappGrupo = typeof radarWhatsappGrupos.$inferSelect;
export type NewRadarWhatsappGrupo = typeof radarWhatsappGrupos.$inferInsert;
```

**Step 3: Commit**
```bash
git add supabase/migrations/20260319_radar_whatsapp_grupos.sql \
        src/lib/db/schema/radar.ts
git commit -m "feat(radar): tabela radar_whatsapp_grupos para monitoramento de grupos WA"
```

---

## Task 7: Webhook Evolution — processar mensagens de grupos monitorados

**Files:**
- Modify: `src/app/api/webhooks/evolution/route.ts:144-154`

**Step 1: Substituir o bloco que ignora grupos**

Em `route.ts`, substituir o trecho que ignora `@g.us` (linhas 151-154) por:

```typescript
// Mensagens de grupo (terminam em @g.us) — verificar se é grupo monitorado
if (remoteJid.endsWith("@g.us")) {
  await handleGroupMessage(remoteJid, message);
  return;
}
```

**Step 2: Implementar `handleGroupMessage` no mesmo arquivo**

```typescript
const RADAR_CRIME_KEYWORDS = [
  'preso', 'tiro', 'homicídio', 'homicidio', 'assalto', 'roubo', 'operação',
  'flagrante', 'morto', 'baleado', 'polícia', 'policia', 'delegacia',
  'tráfico', 'trafico', 'acidente', 'vítima', 'vitima', 'crime', 'bandido',
  'suspeito', 'fugindo', 'perseguição', 'BO', 'ocorrência', 'ocorrencia'
];

async function handleGroupMessage(groupJid: string, message: EvolutionMessage) {
  try {
    // Verificar se grupo está na lista de monitorados
    const [grupo] = await db
      .select()
      .from(radarWhatsappGrupos)
      .where(and(
        eq(radarWhatsappGrupos.jid, groupJid),
        eq(radarWhatsappGrupos.ativo, true)
      ))
      .limit(1);

    if (!grupo) return; // grupo não monitorado — ignorar

    const text = extractMessageText(message);
    if (!text || text.length < 15) return;

    // Filtro de relevância: mensagem deve conter ao menos 1 keyword de crime
    const textLower = text.toLowerCase();
    const isRelevant = RADAR_CRIME_KEYWORDS.some(kw => textLower.includes(kw));
    if (!isRelevant) return;

    // Criar notícia a partir da mensagem do grupo
    const msgId = message.key.id;
    const senderName = message.pushName || 'Anônimo';
    const timestamp = message.messageTimestamp
      ? new Date(message.messageTimestamp * 1000).toISOString()
      : new Date().toISOString();

    // Chamar enrichment engine para criar entrada no radar
    await enrichmentClient.post('/api/radar/from-whatsapp', {
      url: `whatsapp://${groupJid}/${msgId}`,
      fonte: `WhatsApp: ${grupo.nome}`,
      titulo: text.slice(0, 120),
      corpo: text,
      data_publicacao: timestamp,
      relevancia_score: 50,
    });

    console.log(`[Evolution Webhook] Mensagem de grupo relevante → radar: ${grupo.nome}`);
  } catch (err) {
    console.error('[Evolution Webhook] Erro ao processar mensagem de grupo:', err);
  }
}
```

**Step 3: Adicionar import do schema no topo do arquivo**

```typescript
import { radarWhatsappGrupos } from "@/lib/db/schema/radar";
```

**Step 4: Endpoint no enrichment engine para receber mensagem WA**

Em `enrichment-engine/routers/radar.py`, adicionar:

```python
class WhatsappMessageInput(BaseModel):
    url: str
    fonte: str
    titulo: str
    corpo: str
    data_publicacao: str
    relevancia_score: int = 50

@router.post("/api/radar/from-whatsapp")
async def create_from_whatsapp(payload: WhatsappMessageInput):
    """Cria entrada no radar a partir de mensagem de grupo WhatsApp."""
    from services.radar_scraper_service import RadarScraperService
    import hashlib

    scraper = RadarScraperService()
    content_hash = hashlib.sha256(
        f"{payload.titulo}{payload.corpo[:200]}".encode()
    ).hexdigest()

    noticia = {
        "url": payload.url,
        "fonte": payload.fonte,
        "titulo": payload.titulo,
        "corpo": payload.corpo,
        "data_publicacao": payload.data_publicacao,
        "enrichment_status": "pending",
        "relevancia_score": payload.relevancia_score,
        "content_hash": content_hash,
    }

    saved = await scraper.save_noticias([noticia])
    return {"saved": saved}
```

**Step 5: Commit**
```bash
git add src/app/api/webhooks/evolution/route.ts \
        enrichment-engine/routers/radar.py
git commit -m "feat(radar): monitoramento de grupos WhatsApp via Evolution API webhook"
```

---

## Task 8: UI — gerenciar grupos WhatsApp no radar-fontes

**Files:**
- Modify: `src/components/radar/radar-fontes.tsx`
- Modify: `src/lib/trpc/routers/radar.ts`

**Step 1: Adicionar procedures tRPC para grupos WA**

Em `src/lib/trpc/routers/radar.ts`, adicionar:

```typescript
// Listar grupos monitorados
whatsappGrupos: protectedProcedure.query(async ({ ctx }) => {
  return ctx.db.select().from(radarWhatsappGrupos).orderBy(radarWhatsappGrupos.createdAt);
}),

// Adicionar grupo
addWhatsappGrupo: protectedProcedure
  .input(z.object({ jid: z.string().min(10), nome: z.string().min(3) }))
  .mutation(async ({ ctx, input }) => {
    const [grupo] = await ctx.db.insert(radarWhatsappGrupos)
      .values({ jid: input.jid, nome: input.nome })
      .returning();
    return grupo;
  }),

// Toggle ativo
toggleWhatsappGrupo: protectedProcedure
  .input(z.object({ id: z.number(), ativo: z.boolean() }))
  .mutation(async ({ ctx, input }) => {
    await ctx.db.update(radarWhatsappGrupos)
      .set({ ativo: input.ativo, updatedAt: new Date() })
      .where(eq(radarWhatsappGrupos.id, input.id));
  }),
```

**Step 2: Adicionar aba "Grupos WA" no componente radar-fontes.tsx**

Adicionar nova seção no componente (após a lista de fontes existente):

```tsx
{/* Seção: Grupos WhatsApp */}
<div className="mt-6">
  <div className="flex items-center justify-between mb-3">
    <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-2">
      <MessageCircle className="h-4 w-4 text-emerald-600" />
      Grupos WhatsApp Monitorados
    </h3>
    <Button size="sm" variant="outline" onClick={() => setAddGrupoOpen(true)}>
      <Plus className="h-3.5 w-3.5 mr-1" /> Adicionar
    </Button>
  </div>
  {grupos?.map(g => (
    <div key={g.id} className="flex items-center justify-between py-2 border-b border-zinc-100">
      <div>
        <p className="text-sm font-medium">{g.nome}</p>
        <p className="text-xs text-zinc-400 font-mono">{g.jid}</p>
      </div>
      <Switch
        checked={g.ativo}
        onCheckedChange={(v) => toggleGrupo.mutate({ id: g.id, ativo: v })}
      />
    </div>
  ))}
</div>
```

**Step 3: Commit**
```bash
git add src/components/radar/radar-fontes.tsx \
        src/lib/trpc/routers/radar.ts
git commit -m "feat(radar): UI para gerenciar grupos WhatsApp monitorados"
```

---

## Ordem de execução recomendada

1. Task 1 (score floor) — 10 min, impacto imediato no feed
2. Task 2 (blocklist) — 10 min, reduz false positives na extração
3. Task 3 (URLs regionais) — 15 min, reduz ruído na coleta
4. Task 4 (migration fontes) — 5 min, registra novas fontes
5. Task 6 (migration grupos WA) — 10 min, cria estrutura de dados
6. Task 5 (Instagram scraper) — 30 min, nova fonte de dados
7. Task 7 (webhook WA) — 30 min, integração mais complexa
8. Task 8 (UI grupos) — 20 min, gerenciamento via interface

**Commit final após tudo:**
```bash
git commit -m "feat(radar): cobertura Camaçari — filtros, Instagram, WhatsApp grupos"
```
