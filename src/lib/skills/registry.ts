import type { Skill } from "./types";

const skills: Map<string, Skill> = new Map();

export function registerSkill(skill: Skill): void {
  skills.set(skill.id, skill);
}

export function getSkill(id: string): Skill | undefined {
  return skills.get(id);
}

export function getAllSkills(): Skill[] {
  return Array.from(skills.values());
}

export function getSkillsByCategory(category: string): Skill[] {
  return getAllSkills().filter(s => s.category === category);
}

let initialized = false;

export function initializeSkills(): void {
  if (initialized) return;
  initialized = true;

  // Dynamic import to avoid circular deps
  const allSkills = require("./skills").default as Skill[];
  for (const skill of allSkills) {
    registerSkill(skill);
  }
}
