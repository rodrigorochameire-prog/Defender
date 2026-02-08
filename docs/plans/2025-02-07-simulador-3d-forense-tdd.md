# Technical Design Document: Simulador 3D Forense

**Projeto**: OMBUDS - Defensoria Pública
**Funcionalidade**: Reprodução 3D de Fatos para Tribunal do Júri
**Data**: 2025-02-07
**Status**: ✅ Implementado (Abordagem Spline)

---

## 1. Visão Geral

### 1.1 Objetivo

Criar uma ferramenta de **reconstituição 3D interativa** que permita aos defensores:
- Visualizar diferentes versões dos fatos (acusação vs defesa)
- Apresentar simulações aos jurados de forma imersiva
- Demonstrar impossibilidades físicas ou contradições visuais
- Compartilhar cenas 3D interativas no plenário

### 1.2 Problema que Resolve

| Problema Atual | Solução Proposta |
|----------------|------------------|
| Descrições verbais são abstratas | Visualização 3D concreta |
| Jurados têm dificuldade de imaginar a cena | Imersão no local do crime |
| Contradições são difíceis de demonstrar | Comparação lado-a-lado animada |
| Laudos técnicos são complexos | Animação simplificada dos fatos |

### 1.3 Abordagem Escolhida: Spline

Após análise de várias opções técnicas, optamos pela **abordagem mais simples e funcional** usando [Spline](https://spline.design):

| Critério | React Three Fiber + Theatre.js | **Spline (Escolhido)** |
|----------|-------------------------------|------------------------|
| Curva de aprendizado | 60+ horas | 2-4 horas |
| Dependências NPM | 10+ pacotes | 0 pacotes |
| Quem pode criar | Apenas desenvolvedores | Qualquer defensor |
| Interface | Código | Visual drag-and-drop |
| Interatividade | Alta (programada) | Alta (built-in) |
| Exportação | FFmpeg.wasm (complexo) | Link nativo |
| Custo | Gratuito | Gratuito (tier básico) |

---

## 2. Arquitetura Implementada

### 2.1 Fluxo de Trabalho

```
┌─────────────────────────────────────────────────────────────────┐
│                    FLUXO SIMPLIFICADO                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. CRIAR SIMULAÇÃO               2. CRIAR CENA NO SPLINE       │
│  ┌────────────────────┐           ┌────────────────────┐       │
│  │ OMBUDS             │           │ spline.design      │       │
│  │ - Selecionar caso  │    ───►   │ - Arrastar objetos │       │
│  │ - Informar título  │           │ - Animar movimento │       │
│  │ - Criar simulação  │           │ - Publicar cena    │       │
│  └────────────────────┘           └────────────────────┘       │
│                                              │                  │
│                                              ▼                  │
│  3. VINCULAR URL                  4. APRESENTAR NO PLENÁRIO    │
│  ┌────────────────────┐           ┌────────────────────┐       │
│  │ OMBUDS             │           │ Navegador          │       │
│  │ - Colar link do    │    ───►   │ - Abrir simulação  │       │
│  │   Spline           │           │ - Interagir 3D     │       │
│  │ - Salvar           │           │ - Mostrar jurados  │       │
│  └────────────────────┘           └────────────────────┘       │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Componentes da Página

```
/admin/simulador-3d
│
├── Header
│   ├── Título e descrição
│   ├── Seletor de Caso
│   └── Botão "Nova Simulação"
│
├── Estado Vazio (sem caso selecionado)
│   ├── Instruções de uso
│   └── Link para Spline Design
│
├── Lista de Simulações
│   ├── Cards com preview
│   ├── Badge de status (Rascunho/Pronto/Apresentado)
│   ├── Ações (Abrir/Copiar Link/Excluir)
│   └── Metadados (data, versões)
│
└── Dicas para Criar no Spline
    └── Boas práticas visuais
```

### 2.3 Schema do Banco de Dados

O schema completo está implementado em `src/lib/db/schema.ts`:

```typescript
// Tabelas principais
simulacoes3d          // Simulações vinculadas a casos
simulacaoPersonagens  // Personagens da cena
simulacaoObjetos      // Objetos do cenário
simulacaoVersoes      // Versões (acusação/defesa)
simulacaoKeyframes    // Keyframes de animação
simulacaoExportacoes  // Exportações de vídeo
simulacaoAssets       // Assets uploadados
```

### 2.4 API tRPC

Router implementado em `src/lib/trpc/routers/simulador.ts`:

| Endpoint | Descrição |
|----------|-----------|
| `simulador.create` | Criar nova simulação |
| `simulador.listByCaso` | Listar simulações de um caso |
| `simulador.getById` | Obter detalhes de uma simulação |
| `simulador.update` | Atualizar simulação |
| `simulador.delete` | Excluir simulação |
| `simulador.createVersao` | Criar versão (acusação/defesa) |
| `simulador.listVersoes` | Listar versões de uma simulação |

---

## 3. Spline: Guia de Uso

### 3.1 Primeiros Passos

1. Acessar [spline.design](https://spline.design)
2. Criar conta gratuita
3. Criar novo projeto (Scene)
4. Usar objetos básicos ou biblioteca

### 3.2 Dicas para Reconstituição Forense

| Elemento | Representação Sugerida |
|----------|----------------------|
| Pessoas | Formas humanoides simples ou cilindros coloridos |
| Vítima | Cor azul |
| Acusado | Cor vermelha |
| Testemunha | Cor amarela |
| Movimento | Setas animadas |
| Local | Cubos/planos para paredes e móveis |
| Arma | Modelo da biblioteca ou importado |

### 3.3 Animação no Spline

- Use "States" para diferentes momentos
- Adicione "Events" para transições
- Configure "Auto Play" para apresentação
- Exporte como link público

### 3.4 Publicação

1. Clique em "Export" → "Share Link"
2. Copie o URL público
3. Cole no OMBUDS (campo de URL da simulação)
4. Apresente no plenário abrindo o link

---

## 4. Comparativo: Por que Spline?

### 4.1 Opções Avaliadas

| Opção | Prós | Contras | Veredicto |
|-------|------|---------|-----------|
| **A) Spline** | Zero código, visual, gratuito | Menos controle, externa | ✅ Escolhido |
| B) R3F + Theatre.js | Controle total, integrado | 10+ deps, 60h aprender | ❌ Complexo demais |
| C) Babylon.js | Mais leve, bom docs | Menos ecossistema React | ❌ Menos integrado |

### 4.2 Trade-offs Aceitos

| Trade-off | Aceito? | Justificativa |
|-----------|---------|---------------|
| Dependência de serviço externo | ✅ | Spline é estável e tem tier gratuito |
| Menos controle programático | ✅ | Defensores não são desenvolvedores |
| Não renderiza vídeo localmente | ✅ | Links interativos são melhores |
| Sem avatares realistas | ✅ | Formas simples são suficientes |

---

## 5. Implementação Atual

### 5.1 Arquivos Criados/Modificados

| Arquivo | Descrição |
|---------|-----------|
| `src/lib/db/schema.ts` | Tabelas do Simulador 3D |
| `src/lib/trpc/routers/simulador.ts` | Router tRPC completo |
| `src/lib/trpc/routers/index.ts` | Registro do router |
| `src/app/(dashboard)/admin/simulador-3d/page.tsx` | Página principal |
| `src/components/layouts/admin-sidebar.tsx` | Link na navegação |

### 5.2 Funcionalidades Implementadas

- [x] Seletor de caso
- [x] Criação de simulação com título e descrição
- [x] Lista de simulações por caso
- [x] Cards com status e metadados
- [x] Abrir link Spline em nova aba
- [x] Copiar link para clipboard
- [x] Excluir simulação
- [x] Instruções de uso
- [x] Dicas para Spline

### 5.3 Funcionalidades para Futuro

- [ ] Campo para editar URL do Spline após criação
- [ ] Thumbnail preview (screenshot do Spline)
- [ ] Integração com embed do Spline (iframe)
- [ ] Exportação de vídeo via Remotion (opcional)
- [ ] Versões acusação/defesa com tabs
- [ ] Modo comparativo lado-a-lado

---

## 6. Remotion: Alternativa para Vídeo

Se no futuro for necessário exportar vídeos (não apenas links interativos), a skill `remotion` está disponível:

### 6.1 Quando Usar Remotion

| Cenário | Spline | Remotion |
|---------|--------|----------|
| Apresentação ao vivo | ✅ Link interativo | ❌ Não necessário |
| Enviar por e-mail | ❌ Link pode quebrar | ✅ MP4 anexado |
| Arquivar no processo | ❌ Dependência externa | ✅ Arquivo permanente |
| Narração em vídeo | ❌ Não suporta | ✅ Áudio + vídeo |

### 6.2 Integração Futura

```tsx
// Possível integração Remotion + Spline
import { ThreeCanvas } from "@remotion/three";
import Spline from "@splinetool/react-spline";

// Capturar cena Spline como frames
// Renderizar com Remotion
// Exportar MP4
```

---

## 7. Métricas de Sucesso

| Métrica | Meta | Status |
|---------|------|--------|
| Tempo para criar simulação | < 30 min | 🎯 A medir |
| Defensores usando | > 3 no primeiro mês | 🎯 A medir |
| Uso em plenário | > 1 apresentação | 🎯 A medir |

---

## 8. Referências

- [Spline Design](https://spline.design) - Editor 3D visual
- [Spline Docs](https://docs.spline.design) - Documentação
- [Remotion Skill](/.agents/skills/remotion/SKILL.md) - Para exportação de vídeo futura
- [3D Web Experience Skill](/.agents/skills/3d-web-experience/SKILL.md) - Referência técnica

---

## Changelog

| Data | Versão | Mudança |
|------|--------|---------|
| 2025-02-07 | 1.0 | Proposta inicial com R3F + Theatre.js |
| 2025-02-07 | 2.0 | Simplificação para abordagem Spline |
