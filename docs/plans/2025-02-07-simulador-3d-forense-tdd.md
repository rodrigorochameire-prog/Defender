# Technical Design Document: Simulador 3D Forense

**Projeto**: OMBUDS - Defensoria Pública
**Funcionalidade**: Reprodução 3D de Fatos para Tribunal do Júri
**Data**: 2025-02-07
**Status**: Proposta Técnica

---

## 1. Visão Geral

### 1.1 Objetivo

Criar uma ferramenta de **reconstituição 3D interativa** que permita aos defensores:
- Visualizar diferentes versões dos fatos (acusação vs defesa)
- Apresentar simulações aos jurados de forma imersiva
- Demonstrar impossibilidades físicas ou contradições visuais
- Exportar vídeos para apresentação no plenário

### 1.2 Problema que Resolve

| Problema Atual | Solução Proposta |
|----------------|------------------|
| Descrições verbais são abstratas | Visualização 3D concreta |
| Jurados têm dificuldade de imaginar a cena | Imersão no local do crime |
| Contradições são difíceis de demonstrar | Comparação lado-a-lado animada |
| Laudos técnicos são complexos | Animação simplificada dos fatos |

### 1.3 Referências de Mercado

| Software | Preço | Uso |
|----------|-------|-----|
| [FARO Zone 3D](https://www.faro.com/en/Products/Software/Faro-Zone-3D) | $5.000+/ano | Padrão polícia/perícia |
| [Cogent Legal](https://cogentlegal.com/graphics/) | $10.000+ por caso | Escritórios EUA |
| [IMS Legal](https://imslegal.com/services/visual-advocacy) | Sob demanda | Grandes litígios |

**Diferencial OMBUDS**: Ferramenta integrada, gratuita para Defensoria, focada em defesa criminal.

---

## 2. Arquitetura Técnica

### 2.1 Stack Tecnológico

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND                                  │
├─────────────────────────────────────────────────────────────────┤
│  React Three Fiber          │  Engine 3D principal              │
│  @react-three/drei          │  Helpers, controles, loaders      │
│  Theatre.js                 │  Timeline de animação visual      │
│  @react-three/postprocessing│  Efeitos visuais                  │
│  Zustand                    │  Estado global do simulador       │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                        ASSETS                                    │
├─────────────────────────────────────────────────────────────────┤
│  Mixamo                     │  Animações de personagens         │
│  Ready Player Me            │  Avatares customizáveis           │
│  Sketchfab/Poly Haven       │  Modelos 3D de cenários           │
│  gltf-transform             │  Otimização de modelos            │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                        BACKEND (tRPC)                           │
├─────────────────────────────────────────────────────────────────┤
│  simuladorRouter            │  CRUD de simulações               │
│  Supabase Storage           │  Armazenamento de modelos/vídeos  │
│  FFmpeg (edge function)     │  Renderização de vídeo            │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Diagrama de Componentes

```
/admin/simulador-3d
│
├── SimuladorProvider (Context)
│   ├── cena: CenaState
│   ├── timeline: TimelineState
│   └── versoes: VersaoState[]
│
├── EditorPanel (Sidebar Esquerda)
│   ├── CenarioSelector
│   │   ├── BibliotecaCenarios (templates)
│   │   └── ImportadorModelo (upload .glb)
│   │
│   ├── PersonagemEditor
│   │   ├── BibliotecaPersonagens
│   │   ├── AvatarCreator (Ready Player Me)
│   │   └── AnimacaoSelector (Mixamo)
│   │
│   └── ObjetosEditor
│       ├── BibliotecaObjetos
│       └── PropsPosicionamento
│
├── ViewportCanvas (Centro)
│   ├── Canvas (React Three Fiber)
│   │   ├── Cenario3D
│   │   ├── Personagens[]
│   │   ├── Objetos[]
│   │   ├── Cameras[]
│   │   └── Iluminacao
│   │
│   ├── ControlesViewport
│   │   ├── OrbitControls
│   │   ├── TransformControls
│   │   └── CameraSwitcher
│   │
│   └── MiniMapa (vista superior)
│
├── TimelinePanel (Inferior)
│   ├── Theatre.js Studio
│   │   ├── SequenceEditor
│   │   ├── KeyframeEditor
│   │   └── CurveEditor
│   │
│   ├── PlaybackControls
│   │   ├── Play/Pause/Stop
│   │   ├── SpeedControl
│   │   └── LoopControl
│   │
│   └── VersaoTabs
│       ├── VersaoAcusacao
│       ├── VersaoDefesa
│       └── Comparativo
│
└── ExportPanel (Sidebar Direita)
    ├── VideoExporter
    │   ├── ResolutionSelector
    │   ├── FormatSelector (MP4/WebM)
    │   └── RenderProgress
    │
    ├── SnapshotCapture
    │   └── MultiAngleCapture
    │
    └── PresentationMode
        └── FullscreenPlayer
```

### 2.3 Schema do Banco de Dados

```typescript
// Tabela principal de simulações
export const simulacoes3d = pgTable("simulacoes_3d", {
  id: serial("id").primaryKey(),

  // Vínculo com caso
  casoId: integer("caso_id").notNull().references(() => casos.id, { onDelete: "cascade" }),

  // Identificação
  titulo: text("titulo").notNull(),
  descricao: text("descricao"),

  // Dados da cena (JSON)
  cenaData: jsonb("cena_data").$type<{
    cenario: {
      modeloUrl: string;
      posicao: [number, number, number];
      rotacao: [number, number, number];
      escala: [number, number, number];
    };
    iluminacao: {
      ambiente: string;
      intensidade: number;
      sombras: boolean;
    };
    cameras: Array<{
      id: string;
      nome: string;
      tipo: "perspective" | "orthographic";
      posicao: [number, number, number];
      alvo: [number, number, number];
    }>;
  }>(),

  // Thumbnail preview
  thumbnail: text("thumbnail"),

  // Status
  status: varchar("status", { length: 20 }).default("rascunho"), // rascunho | pronto | apresentado

  // Metadados
  criadoPorId: integer("criado_por_id").references(() => users.id),
  workspaceId: integer("workspace_id").references(() => workspaces.id),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Personagens da simulação
export const simulacaoPersonagens = pgTable("simulacao_personagens", {
  id: serial("id").primaryKey(),
  simulacaoId: integer("simulacao_id").notNull().references(() => simulacoes3d.id, { onDelete: "cascade" }),

  // Identificação
  nome: text("nome").notNull(),
  papel: varchar("papel", { length: 30 }), // 'vitima' | 'reu' | 'testemunha' | 'agressor' | 'policial'

  // Vínculo com persona do caso (opcional)
  personaId: integer("persona_id").references(() => casePersonas.id),

  // Modelo 3D
  avatarUrl: text("avatar_url"), // Ready Player Me ou custom
  cor: varchar("cor", { length: 20 }), // Cor identificadora

  // Posição inicial
  posicaoInicial: jsonb("posicao_inicial").$type<[number, number, number]>(),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Objetos da cena
export const simulacaoObjetos = pgTable("simulacao_objetos", {
  id: serial("id").primaryKey(),
  simulacaoId: integer("simulacao_id").notNull().references(() => simulacoes3d.id, { onDelete: "cascade" }),

  nome: text("nome").notNull(),
  tipo: varchar("tipo", { length: 30 }), // 'arma' | 'movel' | 'veiculo' | 'evidencia' | 'marcador'

  modeloUrl: text("modelo_url"),
  posicao: jsonb("posicao").$type<[number, number, number]>(),
  rotacao: jsonb("rotacao").$type<[number, number, number]>(),
  escala: jsonb("escala").$type<[number, number, number]>(),

  visivel: boolean("visivel").default(true),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Versões (acusação, defesa, alternativas)
export const simulacaoVersoes = pgTable("simulacao_versoes", {
  id: serial("id").primaryKey(),
  simulacaoId: integer("simulacao_id").notNull().references(() => simulacoes3d.id, { onDelete: "cascade" }),

  nome: text("nome").notNull(), // "Versão da Acusação", "Versão da Defesa"
  tipo: varchar("tipo", { length: 20 }).notNull(), // 'acusacao' | 'defesa' | 'alternativa'
  cor: varchar("cor", { length: 20 }), // Cor para identificar na timeline

  // Dados da animação (Theatre.js state)
  animacaoData: jsonb("animacao_data").$type<{
    sheetsState: Record<string, unknown>;
    sequenceState: Record<string, unknown>;
  }>(),

  // Duração em segundos
  duracao: real("duracao"),

  // Narrativa textual
  narrativa: text("narrativa"),

  // Ordem de exibição
  ordem: integer("ordem").default(0),

  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// Keyframes de movimento
export const simulacaoKeyframes = pgTable("simulacao_keyframes", {
  id: serial("id").primaryKey(),
  versaoId: integer("versao_id").notNull().references(() => simulacaoVersoes.id, { onDelete: "cascade" }),
  personagemId: integer("personagem_id").references(() => simulacaoPersonagens.id),
  objetoId: integer("objeto_id").references(() => simulacaoObjetos.id),

  // Tempo do keyframe (segundos)
  tempo: real("tempo").notNull(),

  // Dados do keyframe
  posicao: jsonb("posicao").$type<[number, number, number]>(),
  rotacao: jsonb("rotacao").$type<[number, number, number]>(),
  animacao: varchar("animacao", { length: 50 }), // 'idle' | 'walking' | 'running' | 'falling'

  // Easing
  easing: varchar("easing", { length: 30 }).default("linear"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Vídeos exportados
export const simulacaoExportacoes = pgTable("simulacao_exportacoes", {
  id: serial("id").primaryKey(),
  versaoId: integer("versao_id").notNull().references(() => simulacaoVersoes.id, { onDelete: "cascade" }),

  // Arquivo
  videoUrl: text("video_url"),
  formato: varchar("formato", { length: 10 }), // 'mp4' | 'webm'
  resolucao: varchar("resolucao", { length: 20 }), // '1920x1080' | '1280x720'

  // Status
  status: varchar("status", { length: 20 }), // 'processando' | 'pronto' | 'erro'
  progresso: integer("progresso"),

  // Metadados
  tamanhoBytes: integer("tamanho_bytes"),
  duracaoSegundos: real("duracao_segundos"),

  criadoPorId: integer("criado_por_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

---

## 3. Funcionalidades Detalhadas

### 3.1 Editor de Cena

#### Biblioteca de Cenários

| Categoria | Exemplos | Fonte |
|-----------|----------|-------|
| Residências | Casa, apartamento, quarto, cozinha | [Sketchfab Free](https://sketchfab.com/tags/room) |
| Externos | Rua, praça, estacionamento | [Poly Haven](https://polyhaven.com/) |
| Comerciais | Bar, loja, escritório | [TurboSquid Free](https://www.turbosquid.com/Search/3D-Models/free/gltf) |
| Veículos | Carro, moto, ônibus | Modelos otimizados |

#### Drag & Drop

```tsx
// Usando Three.js DragControls
import { DragControls } from 'three/addons/controls/DragControls.js';

// Ou com drei
import { useDrag } from '@use-gesture/react';
```

### 3.2 Personagens Animados

#### Workflow de Criação

```
1. SELEÇÃO
   ├── Biblioteca padrão (homem, mulher, criança)
   ├── Ready Player Me (avatar customizado)
   └── Importar modelo (.glb)

2. CUSTOMIZAÇÃO
   ├── Cor identificadora (acusado = vermelho, vítima = azul)
   ├── Nome/Label
   └── Vínculo com persona do caso

3. ANIMAÇÃO
   ├── Mixamo animations
   │   ├── Idle (parado)
   │   ├── Walking (andando)
   │   ├── Running (correndo)
   │   ├── Falling (caindo)
   │   ├── Fighting (brigando)
   │   └── Custom imports
   │
   └── Transições suaves entre animações
```

#### Integração Ready Player Me

```tsx
import { useGLTF } from '@react-three/drei';
import { useEffect } from 'react';

function Avatar({ avatarUrl }: { avatarUrl: string }) {
  const { scene, animations } = useGLTF(avatarUrl);

  // Aplicar animação Mixamo
  useEffect(() => {
    // Retarget animation bones
  }, [animations]);

  return <primitive object={scene} />;
}
```

### 3.3 Timeline com Theatre.js

#### Por que Theatre.js?

| Feature | Benefício |
|---------|-----------|
| Editor visual | Não precisa programar animações |
| Keyframes | Posicionar personagens no tempo |
| Curvas de easing | Movimentos naturais |
| Preview em tempo real | Ver antes de exportar |
| Export JSON | Salvar no banco de dados |

#### Estrutura da Timeline

```
Timeline (0s → duração)
│
├── Track: Câmera Principal
│   ├── Keyframe 0s: Posição inicial
│   ├── Keyframe 5s: Zoom no local
│   └── Keyframe 10s: Visão geral
│
├── Track: Personagem "Vítima"
│   ├── Keyframe 0s: Posição porta
│   ├── Keyframe 3s: Caminhando (animação)
│   ├── Keyframe 6s: Posição centro
│   └── Keyframe 8s: Caindo (animação)
│
├── Track: Personagem "Acusado"
│   ├── Keyframe 0s: Posição cozinha
│   ├── Keyframe 4s: Correndo (animação)
│   └── Keyframe 7s: Posição centro
│
└── Track: Objeto "Faca"
    ├── Keyframe 0s: Mesa da cozinha
    └── Keyframe 7s: Chão (após ação)
```

### 3.4 Comparativo de Versões

#### Modos de Visualização

```
┌─────────────────────────────────────────┐
│  MODO 1: Sequencial                      │
│  ┌─────────┐        ┌─────────┐         │
│  │Acusação │   →    │ Defesa  │         │
│  │  (play) │        │ (play)  │         │
│  └─────────┘        └─────────┘         │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  MODO 2: Lado a Lado (Split Screen)     │
│  ┌─────────────┬─────────────┐          │
│  │  Acusação   │   Defesa    │          │
│  │   (play)    │   (play)    │          │
│  │             │             │          │
│  └─────────────┴─────────────┘          │
│  ════════════════════════════           │
│  [Timeline sincronizada]                │
└─────────────────────────────────────────┘

┌─────────────────────────────────────────┐
│  MODO 3: Overlay (Fantasma)             │
│  ┌─────────────────────────┐            │
│  │   Defesa (sólido)       │            │
│  │   Acusação (fantasma)   │            │
│  │   ████░░░░              │            │
│  └─────────────────────────┘            │
│  Slider: Opacidade da versão overlay    │
└─────────────────────────────────────────┘
```

### 3.5 Exportação de Vídeo

#### Opções de Exportação

| Formato | Resolução | Uso |
|---------|-----------|-----|
| MP4 (H.264) | 1920x1080 | Apresentação no plenário |
| MP4 (H.264) | 1280x720 | Compartilhamento/e-mail |
| WebM (VP9) | 1920x1080 | Web/preview |
| GIF | 800x450 | Redes sociais |

#### Processo de Renderização

```
1. Captura de frames
   └── CCapture.js (client-side)

2. Encoding
   ├── FFmpeg.wasm (browser)
   └── ou Edge Function (Supabase)

3. Upload
   └── Supabase Storage

4. Disponibilização
   └── URL para download/streaming
```

---

## 4. Implementação em Fases

### Fase 1: MVP (4-6 semanas)

**Objetivo**: Simulador funcional básico

| Entrega | Detalhes |
|---------|----------|
| Página `/admin/simulador-3d` | Layout com 3 painéis |
| Canvas 3D básico | React Three Fiber + OrbitControls |
| Cenário simples | 1 modelo de sala/quarto |
| Personagens básicos | 2 modelos (homem/mulher) |
| Movimentação | Drag & drop no cenário |
| Posições | Salvar posições no banco |

```bash
# Dependências iniciais
npm install three @react-three/fiber @react-three/drei
npm install @theatre/core @theatre/studio @theatre/r3f
npm install zustand
```

### Fase 2: Animação (3-4 semanas)

**Objetivo**: Timeline e animações de personagens

| Entrega | Detalhes |
|---------|----------|
| Theatre.js integrado | Editor de timeline |
| Animações Mixamo | Walking, running, idle |
| Keyframes | Posição + animação por tempo |
| Preview | Play/pause/scrub |
| Persistência | Salvar estado no banco |

### Fase 3: Versões (2-3 semanas)

**Objetivo**: Múltiplas narrativas

| Entrega | Detalhes |
|---------|----------|
| Sistema de versões | Acusação vs Defesa |
| Timeline por versão | Estados independentes |
| Comparativo | Split screen básico |
| Cópia de versão | Duplicar e modificar |

### Fase 4: Exportação (2-3 semanas)

**Objetivo**: Gerar vídeos para plenário

| Entrega | Detalhes |
|---------|----------|
| Captura de frames | CCapture.js |
| Encoding client | FFmpeg.wasm |
| Upload | Supabase Storage |
| Download | Link para MP4 |

### Fase 5: Biblioteca Expandida (Contínuo)

**Objetivo**: Mais recursos visuais

| Entrega | Detalhes |
|---------|----------|
| +10 cenários | Diversos ambientes |
| +20 objetos | Armas, móveis, veículos |
| Ready Player Me | Avatares customizados |
| Animações custom | Importar do Mixamo |

### Fase 6: Recursos Avançados (Futuro)

| Feature | Descrição |
|---------|-----------|
| VR Mode | Visualização em realidade virtual |
| Viggle AI | Animações a partir de vídeo |
| Photogrammetry | Importar cena real escaneada |
| AI Narrator | Narração automática |

---

## 5. Riscos e Mitigações

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Performance baixa | Alta | Alto | LOD, otimização de modelos, lazy loading |
| Curva de aprendizado | Média | Médio | UX intuitiva, templates prontos, tutorial |
| Tamanho dos arquivos | Alta | Médio | Compressão DRACO, streaming de assets |
| Compatibilidade navegador | Baixa | Alto | Fallback para Chrome, WebGL check |
| Renderização de vídeo lenta | Média | Médio | Processamento em background, fila |

---

## 6. Métricas de Sucesso

| Métrica | Meta |
|---------|------|
| Tempo de criação de simulação | < 30 minutos |
| Simulações criadas por mês | > 10 |
| Taxa de exportação de vídeo | > 80% das simulações |
| Satisfação do defensor | > 4/5 |
| Uso em plenário | > 50% das sessões de júri |

---

## 7. Dependências NPM

```json
{
  "dependencies": {
    // 3D Core
    "three": "^0.160.0",
    "@react-three/fiber": "^8.15.0",
    "@react-three/drei": "^9.92.0",
    "@react-three/postprocessing": "^2.16.0",

    // Animation
    "@theatre/core": "^0.7.0",
    "@theatre/studio": "^0.7.0",
    "@theatre/r3f": "^0.7.0",

    // State Management
    "zustand": "^4.4.0",

    // Video Export
    "ccapture.js-npmfixed": "^1.1.0",
    "@ffmpeg/ffmpeg": "^0.12.0",
    "@ffmpeg/util": "^0.12.0",

    // Model Loading
    "@gltf-transform/core": "^3.9.0",
    "@gltf-transform/extensions": "^3.9.0"
  }
}
```

---

## 8. Próximos Passos

1. **Aprovação** deste TDD
2. **Criar skill** `/simulador-3d` para orientar desenvolvimento
3. **Implementar Fase 1** (MVP)
4. **Validar** com defensores do Grupo Júri
5. **Iterar** baseado no feedback

---

## Referências

- [React Three Fiber Docs](https://docs.pmnd.rs/react-three-fiber)
- [Theatre.js Integration](https://www.theatrejs.com/docs/0.5/getting-started/with-react-three-fiber)
- [Ready Player Me React](https://docs.readyplayer.me/ready-player-me/integration-guides/react)
- [Mixamo Animations](https://www.mixamo.com/)
- [FARO Zone 3D](https://www.faro.com/en/Products/Software/Faro-Zone-3D) (referência de mercado)
- [Criminator XR Paper](https://arxiv.org/html/2601.13689v1) (pesquisa acadêmica)
