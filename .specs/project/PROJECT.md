# OMBUDS - Projeto

## Visao

Sistema de gestao integrado para Defensoria Publica Criminal de Camacari/BA. Centraliza processos, assistidos, demandas, audiencias, documentos e inteligencia juridica em uma unica plataforma.

## Objetivos

1. **Gestao unificada** - Substituir planilhas e sistemas fragmentados por plataforma unica
2. **Produtividade** - Automatizar tarefas repetitivas (prazos, documentos, distribuicao)
3. **Inteligencia** - Enriquecer dados via IA (classificacao de PDFs, analise de depoimentos, teses)
4. **Colaboracao** - Multi-defensor com delegacao, cobertura e compartilhamento
5. **Mobilidade** - Acesso rapido em audiencias e plantoes via mobile

## Usuarios

| Perfil | Descricao | Quantidade |
|--------|-----------|------------|
| Admin | Coordenador da defensoria (Rodrigo) | 1 |
| Defensor Titular | Defensor responsavel por nucleo | 3-5 |
| Defensor Substituto | Cobre afastamentos | 1-2 |
| Estagiario | Apoio sob supervisao | 2-4 |
| Servidor | Administrativo/triagem | 1-2 |

## Stack

- **Frontend**: Next.js 15 (App Router), React 19, Tailwind CSS, shadcn/ui
- **Backend**: tRPC, Drizzle ORM
- **Banco**: PostgreSQL (Supabase)
- **Auth**: Custom (email/senha + Google OAuth)
- **Deploy**: Vercel (ombuds.vercel.app)
- **IA**: Google Gemini (classificacao, analise)
- **Integracao**: PJe (parser), Solar DPEBA (scraper), SIGAD, Google Drive

## Design System

Padrao "Defender": zinc neutro + emerald hover. Minimalismo institucional.
