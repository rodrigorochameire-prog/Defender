# DefensorHub - Arquitetura de Perfis e Permissões

## 1. Visão Geral da Estrutura Organizacional

O DefensorHub atende a uma Defensoria Pública com duas categorias principais de atuação criminal: **Varas Especializadas** (Júri, Execuções Penais, Violência Doméstica) e **Varas Criminais Comuns** (1ª e 2ª Vara Criminal). Esta arquitetura propõe uma solução sustentável e escalável para gerenciar as diferentes necessidades de cada perfil de usuário.

### 1.1 Mapeamento de Usuários

| Usuário | Role | Tipo de Atuação | Atribuições Especiais |
|---------|------|-----------------|----------------------|
| **Rodrigo** | admin + defensor | Especializado | Júri, EP, VVD + Administração |
| **Juliane** | defensor | Especializado | Júri, EP, VVD |
| **Danilo** | defensor | Geral | 2ª Vara Criminal |
| **Cristiane** | defensor | Geral | 1ª Vara Criminal |
| **Emilly** | estagiario | Vinculada a Rodrigo | Demandas delegadas |
| **Taíssa** | estagiario | Vinculada a Juliane | Demandas delegadas |
| **Servidor(a)** | servidor | Administrativo | Atendimentos, prazos |
| **Triagem** | triagem | Atendimento inicial | Cadastro de assistidos |

### 1.2 Princípio Fundamental

> **Dados compartilhados, interfaces customizadas.**
> 
> Assistidos, processos e casos são de acesso integral para todos os perfis. O que muda é a **interface** (quais módulos e funcionalidades aparecem) e as **ações permitidas** (o que cada perfil pode fazer).

---

## 2. Modelo de Dados Proposto

### 2.1 Alterações no Schema de Usuários

O campo `nucleo` existente no schema será renomeado para `tipoAtuacao` para maior clareza semântica, e novos campos serão adicionados:

```typescript
// Alterações na tabela users
export const users = pgTable("users", {
  // ... campos existentes ...
  
  // NOVO: Tipo de atuação do defensor
  tipoAtuacao: varchar("tipo_atuacao", { length: 30 }),
  // Valores: 'ESPECIALIZADO' | 'GERAL' | null (para não-defensores)
  
  // NOVO: Vara de atuação principal (para defensores gerais)
  varaAtuacao: varchar("vara_atuacao", { length: 50 }),
  // Valores: '1_VARA_CRIMINAL' | '2_VARA_CRIMINAL' | null
  
  // NOVO: Atribuições especiais (array JSON para defensores especializados)
  atribuicoesEspeciais: text("atribuicoes_especiais"),
  // JSON: ["JURI", "EP", "VVD"] ou null
  
  // Existente - será usado para vincular estagiários
  supervisorId: integer("supervisor_id").references(() => users.id),
  
  // Existente - será usado para admin
  isAdmin: boolean("is_admin").default(false),
});
```

### 2.2 Nova Tabela: Compartilhamento de Eventos

Para permitir que defensores compartilhem eventos específicos da agenda com estagiários:

```typescript
export const eventosCompartilhados = pgTable("eventos_compartilhados", {
  id: serial("id").primaryKey(),
  
  // Evento original (pode ser audiência, sessão de júri, etc.)
  eventoTipo: varchar("evento_tipo", { length: 30 }).notNull(),
  // Valores: 'AUDIENCIA' | 'SESSAO_JURI' | 'PRAZO' | 'ATENDIMENTO'
  eventoId: integer("evento_id").notNull(),
  
  // Quem compartilhou
  compartilhadoPorId: integer("compartilhado_por_id")
    .notNull()
    .references(() => users.id),
  
  // Com quem foi compartilhado
  compartilhadoComId: integer("compartilhado_com_id")
    .notNull()
    .references(() => users.id),
  
  // Permissões
  podeEditar: boolean("pode_editar").default(false),
  
  // Observações do defensor para o estagiário
  instrucoes: text("instrucoes"),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
```

---

## 3. Sistema de Permissões por Perfil

### 3.1 Matriz de Acesso a Módulos

| Módulo | Rodrigo (Admin) | Juliane | Danilo/Cristiane | Estagiário | Servidor | Triagem |
|--------|-----------------|---------|------------------|------------|----------|---------|
| **Dashboard** | Completo | Especializado | Geral | Próprio | Próprio | Não |
| **Assistidos** | ✅ Total | ✅ Total | ✅ Total | ✅ Visualizar | ✅ Total | ✅ Cadastrar |
| **Processos** | ✅ Total | ✅ Total | ✅ Total | ✅ Visualizar | ✅ Total | ✅ Visualizar |
| **Casos** | ✅ Total | ✅ Total | ✅ Total | ✅ Visualizar | ✅ Total | ✅ Visualizar |
| **Demandas** | ✅ Total | ✅ Total | ✅ Total | ✅ Delegadas | ✅ Próprias | Não |
| **Júri** | ✅ Total | ✅ Total | ❌ Oculto | ✅ Se delegado | ❌ Oculto | Não |
| **Execução Penal** | ✅ Total | ✅ Total | ❌ Oculto | ✅ Se delegado | ❌ Oculto | Não |
| **Violência Doméstica** | ✅ Total | ✅ Total | ❌ Oculto | ✅ Se delegado | ❌ Oculto | Não |
| **Agenda** | ✅ Total | ✅ Total | ✅ Total | ✅ Própria | ✅ Própria | Não |
| **Drive** | ✅ Total | ✅ Total | ✅ Total | ✅ Pastas permitidas | ✅ Total | Não |
| **Equipe** | ✅ Gerenciar | ✅ Visualizar | ✅ Visualizar | ❌ Oculto | ✅ Visualizar | Não |
| **Configurações** | ✅ Total | ✅ Próprias | ✅ Próprias | ✅ Próprias | ✅ Próprias | ✅ Próprias |
| **Admin** | ✅ Total | ❌ | ❌ | ❌ | ❌ | ❌ |

### 3.2 Lógica de Visibilidade do Menu Lateral

A sidebar deve ser **dinâmica** com base no perfil do usuário logado. A implementação sugerida:

```typescript
// hooks/use-menu-items.ts
export function useMenuItems() {
  const { user } = usePermissions();
  
  const menuItems = useMemo(() => {
    const baseItems = [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, path: '/admin/dashboard' },
      { id: 'assistidos', label: 'Assistidos', icon: Users, path: '/admin/assistidos' },
      { id: 'processos', label: 'Processos', icon: FileText, path: '/admin/processos' },
      { id: 'casos', label: 'Casos', icon: Briefcase, path: '/admin/casos' },
      { id: 'demandas', label: 'Demandas', icon: ListTodo, path: '/admin/demandas' },
      { id: 'agenda', label: 'Agenda', icon: Calendar, path: '/admin/agenda' },
      { id: 'drive', label: 'Drive', icon: FolderOpen, path: '/admin/drive' },
    ];
    
    // Módulos especializados (apenas para defensores especializados e seus estagiários)
    const modulosEspecializados = [];
    
    if (isDefensorEspecializado(user) || isEstagiarioDeEspecializado(user)) {
      const atribuicoes = getAtribuicoesEspeciais(user);
      
      if (atribuicoes.includes('JURI')) {
        modulosEspecializados.push({
          id: 'juri',
          label: 'Tribunal do Júri',
          icon: Scale,
          path: '/admin/juri',
          submenu: [
            { label: 'Sessões', path: '/admin/juri' },
            { label: 'Cockpit', path: '/admin/juri/cockpit' },
            { label: 'Jurados', path: '/admin/juri/jurados' },
            { label: 'Avaliação', path: '/admin/juri/avaliacao' },
          ]
        });
      }
      
      if (atribuicoes.includes('EP')) {
        modulosEspecializados.push({
          id: 'execucao',
          label: 'Execução Penal',
          icon: Building,
          path: '/admin/execucao'
        });
      }
      
      if (atribuicoes.includes('VVD')) {
        modulosEspecializados.push({
          id: 'vvd',
          label: 'Violência Doméstica',
          icon: Shield,
          path: '/admin/medidas'
        });
      }
    }
    
    // Módulos administrativos
    const modulosAdmin = [];
    if (user?.role === 'admin' || user?.role === 'defensor') {
      modulosAdmin.push({ id: 'equipe', label: 'Equipe', icon: Users, path: '/admin/equipe' });
    }
    if (user?.isAdmin) {
      modulosAdmin.push({ id: 'admin', label: 'Administração', icon: Settings, path: '/admin/settings' });
    }
    
    return [...baseItems, ...modulosEspecializados, ...modulosAdmin];
  }, [user]);
  
  return menuItems;
}
```

---

## 4. Dashboards Customizados por Perfil

### 4.1 Dashboard do Defensor Especializado (Rodrigo, Juliane)

O dashboard exibe métricas e cards específicos para as atribuições especiais:

**Seções:**
1. **Visão Geral**: Total de assistidos, processos ativos, demandas pendentes
2. **Prazos Urgentes**: Demandas com prazo nos próximos 7 dias
3. **Próximas Audiências**: Audiências da semana
4. **Sessões de Júri**: Próximas sessões do plenário (se atribuição JURI)
5. **Execução Penal**: Benefícios a vencer, progressões pendentes (se atribuição EP)
6. **Medidas Protetivas**: Medidas ativas, renovações pendentes (se atribuição VVD)

### 4.2 Dashboard do Defensor Geral (Danilo, Cristiane)

Dashboard focado na vara criminal comum:

**Seções:**
1. **Visão Geral**: Total de assistidos, processos ativos, demandas pendentes
2. **Prazos Urgentes**: Demandas com prazo nos próximos 7 dias
3. **Próximas Audiências**: Audiências da semana
4. **Processos por Fase**: Distribuição (Inquérito, Instrução, Recurso)
5. **Réus Presos**: Lista de assistidos presos com processos ativos

### 4.3 Dashboard do Estagiário

Dashboard focado nas tarefas delegadas:

**Seções:**
1. **Minhas Demandas**: Demandas delegadas pelo supervisor
2. **Prazos da Semana**: Demandas com prazo próximo
3. **Eventos Compartilhados**: Audiências/atos compartilhados pelo supervisor
4. **Atividade Recente**: Histórico de ações realizadas

### 4.4 Dashboard do Servidor

Dashboard focado em atendimentos e gestão administrativa:

**Seções:**
1. **Atendimentos do Dia**: Lista de atendimentos agendados
2. **Prazos Administrativos**: Prazos de ofícios, certidões, etc.
3. **Demandas Pendentes**: Demandas atribuídas ao servidor
4. **Estatísticas**: Atendimentos realizados no mês

---

## 5. Agenda Customizada por Perfil

### 5.1 Agenda do Defensor

Exibe todos os eventos do defensor:
- Audiências (próprias e da vara)
- Sessões de Júri (se especializado)
- Prazos processuais
- Atendimentos agendados
- **Funcionalidade**: Botão "Compartilhar com Estagiário" em cada evento

### 5.2 Agenda do Estagiário

Exibe apenas eventos relevantes:
- Demandas delegadas (com prazo)
- Eventos compartilhados pelo supervisor
- **Não exibe**: Audiências privativas do defensor (a menos que compartilhadas)

### 5.3 Agenda do Servidor

Exibe eventos administrativos:
- Atendimentos agendados
- Prazos de demandas próprias
- Compromissos administrativos

---

## 6. Implementação Técnica

### 6.1 Alterações no Hook de Permissões

```typescript
// hooks/use-permissions.ts - Funções adicionais

// Verifica se é defensor especializado
export function isDefensorEspecializado(user: SessionUser | null): boolean {
  if (!user || user.role !== 'defensor') return false;
  return user.tipoAtuacao === 'ESPECIALIZADO';
}

// Verifica se é estagiário de defensor especializado
export function isEstagiarioDeEspecializado(user: SessionUser | null): boolean {
  if (!user || user.role !== 'estagiario') return false;
  // Buscar supervisor e verificar se é especializado
  // Implementar via query ou cache
  return false; // Placeholder
}

// Obtém atribuições especiais do usuário
export function getAtribuicoesEspeciais(user: SessionUser | null): string[] {
  if (!user) return [];
  
  // Se é defensor especializado, retorna suas atribuições
  if (user.role === 'defensor' && user.atribuicoesEspeciais) {
    return JSON.parse(user.atribuicoesEspeciais);
  }
  
  // Se é estagiário, herda do supervisor
  if (user.role === 'estagiario' && user.supervisorAtribuicoes) {
    return JSON.parse(user.supervisorAtribuicoes);
  }
  
  return [];
}

// Verifica se pode ver módulo específico
export function canAccessModule(user: SessionUser | null, modulo: string): boolean {
  if (!user) return false;
  if (user.isAdmin) return true;
  
  const modulosEspeciais = ['juri', 'execucao', 'vvd'];
  
  if (modulosEspeciais.includes(modulo)) {
    const atribuicoes = getAtribuicoesEspeciais(user);
    const moduloMap: Record<string, string> = {
      'juri': 'JURI',
      'execucao': 'EP',
      'vvd': 'VVD'
    };
    return atribuicoes.includes(moduloMap[modulo]);
  }
  
  return true; // Módulos base são acessíveis
}
```

### 6.2 Componente de Compartilhamento de Eventos

```typescript
// components/agenda/compartilhar-evento.tsx
interface CompartilharEventoProps {
  eventoTipo: 'AUDIENCIA' | 'SESSAO_JURI' | 'PRAZO';
  eventoId: number;
}

export function CompartilharEvento({ eventoTipo, eventoId }: CompartilharEventoProps) {
  const { user } = usePermissions();
  const { data: estagiarios } = trpc.users.meusEstagiarios.useQuery();
  const compartilharMutation = trpc.eventos.compartilhar.useMutation();
  
  // Apenas defensores podem compartilhar
  if (user?.role !== 'defensor' && !user?.isAdmin) return null;
  
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Share2 className="h-4 w-4 mr-2" />
          Compartilhar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Compartilhar com Estagiário</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Select onValueChange={(id) => setSelectedEstagiario(id)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o estagiário" />
            </SelectTrigger>
            <SelectContent>
              {estagiarios?.map((e) => (
                <SelectItem key={e.id} value={e.id.toString()}>
                  {e.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Textarea 
            placeholder="Instruções para o estagiário (opcional)"
            value={instrucoes}
            onChange={(e) => setInstrucoes(e.target.value)}
          />
          <Button onClick={handleCompartilhar}>
            Compartilhar Evento
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

---

## 7. Migração de Dados

### 7.1 Script de Seed para Usuários Iniciais

```typescript
// scripts/seed-usuarios.ts
const usuarios = [
  {
    name: "Rodrigo Rocha Meire",
    email: "rodrigo@defensoria.ba.gov.br",
    role: "defensor",
    isAdmin: true,
    tipoAtuacao: "ESPECIALIZADO",
    atribuicoesEspeciais: JSON.stringify(["JURI", "EP", "VVD"]),
    comarca: "Camaçari",
  },
  {
    name: "Juliane Silva",
    email: "juliane@defensoria.ba.gov.br",
    role: "defensor",
    isAdmin: false,
    tipoAtuacao: "ESPECIALIZADO",
    atribuicoesEspeciais: JSON.stringify(["JURI", "EP", "VVD"]),
    comarca: "Camaçari",
  },
  {
    name: "Danilo",
    email: "danilo@defensoria.ba.gov.br",
    role: "defensor",
    isAdmin: false,
    tipoAtuacao: "GERAL",
    varaAtuacao: "2_VARA_CRIMINAL",
    comarca: "Camaçari",
  },
  {
    name: "Cristiane",
    email: "cristiane@defensoria.ba.gov.br",
    role: "defensor",
    isAdmin: false,
    tipoAtuacao: "GERAL",
    varaAtuacao: "1_VARA_CRIMINAL",
    comarca: "Camaçari",
  },
];
```

### 7.2 Alterações no Schema (Migration)

```sql
-- Migration: add_perfil_customizado
ALTER TABLE users ADD COLUMN tipo_atuacao VARCHAR(30);
ALTER TABLE users ADD COLUMN vara_atuacao VARCHAR(50);
ALTER TABLE users ADD COLUMN atribuicoes_especiais TEXT;

-- Criar tabela de eventos compartilhados
CREATE TABLE eventos_compartilhados (
  id SERIAL PRIMARY KEY,
  evento_tipo VARCHAR(30) NOT NULL,
  evento_id INTEGER NOT NULL,
  compartilhado_por_id INTEGER NOT NULL REFERENCES users(id),
  compartilhado_com_id INTEGER NOT NULL REFERENCES users(id),
  pode_editar BOOLEAN DEFAULT FALSE,
  instrucoes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_eventos_compartilhados_com ON eventos_compartilhados(compartilhado_com_id);
```

---

## 8. Roadmap de Implementação

### Fase 1: Fundação (1-2 semanas)
1. Aplicar alterações no schema do banco de dados
2. Atualizar o hook `use-permissions.ts` com novas funções
3. Criar script de seed para usuários iniciais
4. Implementar menu lateral dinâmico

### Fase 2: Dashboards (1 semana)
1. Criar componente de dashboard base reutilizável
2. Implementar dashboard do defensor especializado
3. Implementar dashboard do defensor geral
4. Implementar dashboard do estagiário e servidor

### Fase 3: Agenda e Compartilhamento (1 semana)
1. Criar tabela e router para eventos compartilhados
2. Implementar componente de compartilhamento
3. Customizar agenda por perfil
4. Testar fluxo de delegação de eventos

### Fase 4: Refinamentos (1 semana)
1. Remover dados mockados das páginas
2. Testar todos os fluxos por perfil
3. Ajustar permissões conforme feedback
4. Documentar o sistema para novos desenvolvedores

---

## 9. Considerações Finais

Esta arquitetura foi projetada com os seguintes princípios:

1. **Escalabilidade**: Novos perfis ou atribuições podem ser adicionados sem refatoração
2. **Manutenibilidade**: Lógica centralizada em hooks reutilizáveis
3. **Performance**: Dados compartilhados, apenas a interface muda
4. **Segurança**: Permissões verificadas tanto no frontend quanto no backend (tRPC)

A implementação gradual permite validar cada fase antes de avançar, minimizando riscos e permitindo ajustes conforme o uso real do sistema.
