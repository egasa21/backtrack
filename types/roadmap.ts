export type LearningStatus = "NOT_STARTED" | "LEARNING" | "PRACTICING" | "COMPLETED" | "REVIEW";
export type AiHelpLevel = "NONE" | "HINT" | "REVIEW" | "GENERATED";
export interface TaskDefinition { id: string; title: string }
export interface ItemDefinition {
  id: string; title: string; description: string; learningGoals: string[];
  concepts: string[]; examples: string[]; tasks: TaskDefinition[];
  dependencies: string[]; requirements?: string[]; constraints?: string[]; deliverables?: string[];
}
export interface ModuleDefinition {
  id: string; order: number; title: string; goal: string; dependencies: string[];
  topics: ItemDefinition[]; exercises: ItemDefinition[]; challenges: ItemDefinition[];
}
export interface EntryProgress {
  status: LearningStatus; completedTasks: string[]; canExplainWithoutNotes: boolean | null;
  aiHelp: AiHelpLevel; notes: string; reflection: string; attempts: number; updatedAt: string; completedAt?: string;
}
export interface Progress { modules: Record<string, EntryProgress>; items: Record<string, EntryProgress> }
export interface RoadmapDefinition { title: string; description: string; workflow: string[]; rules: string[] }
