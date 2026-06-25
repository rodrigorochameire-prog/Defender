/**
 * View-model do SkillLauncher: transforma um contexto de entidade no conjunto
 * de itens prontos para o componente, cada um já com o payload exato de
 * `useSkillTask().trigger`. Mantém o componente burro e a montagem testável.
 */
import type { SkillTaskTriggerInput } from "@/hooks/use-skill-task";
import {
  skillsForContext,
  CATEGORIA_ORDER,
  CATEGORIA_LABEL,
  type Atribuicao,
  type SkillEntity,
  type SkillCategoria,
} from "./catalog";

export interface LauncherContext {
  entity: SkillEntity;
  atribuicao: Atribuicao;
  /** Obrigatório para disparar — criarTask exige assistido. */
  assistidoId?: number;
  processoId?: number;
  casoId?: number;
}

export interface LauncherItem {
  slug: string;
  label: string;
  description: string;
  icon: string;
  category: SkillCategoria;
  triggerInput: SkillTaskTriggerInput;
}

export interface LauncherGroup {
  category: SkillCategoria;
  label: string;
  items: LauncherItem[];
}

/**
 * Monta os itens do launcher. Se não há `assistidoId` resolvível, retorna vazio
 * (o componente exibe um aviso) — toda task precisa de um assistido.
 */
export function buildLauncherItems(ctx: LauncherContext): LauncherItem[] {
  if (ctx.assistidoId == null) return [];

  return skillsForContext({ entity: ctx.entity, atribuicao: ctx.atribuicao }).map(
    (skill) => {
      const triggerInput: SkillTaskTriggerInput = {
        skill: skill.slug,
        assistidoId: ctx.assistidoId as number,
      };
      if (ctx.processoId != null) triggerInput.processoId = ctx.processoId;
      if (ctx.casoId != null) triggerInput.casoId = ctx.casoId;

      return {
        slug: skill.slug,
        label: skill.label,
        description: skill.description,
        icon: skill.icon,
        category: skill.category,
        triggerInput,
      };
    },
  );
}

/** Agrupa itens por categoria, preservando a ordem de categorias do catálogo. */
export function groupByCategoria(items: LauncherItem[]): LauncherGroup[] {
  const byCat = new Map<SkillCategoria, LauncherItem[]>();
  for (const item of items) {
    const list = byCat.get(item.category) ?? [];
    list.push(item);
    byCat.set(item.category, list);
  }

  return [...byCat.entries()]
    .sort(([a], [b]) => CATEGORIA_ORDER[a] - CATEGORIA_ORDER[b])
    .map(([category, list]) => ({
      category,
      label: CATEGORIA_LABEL[category],
      items: list,
    }));
}
