/**
 * Shared TypeScript types for the frontend.
 *
 * KEY CONCEPT: These types mirror the backend Pydantic models.
 * Keeping them in sync ensures the frontend and backend agree
 * on the shape of data being exchanged. In larger projects,
 * you'd auto-generate these from the OpenAPI spec.
 */

export type ProjectMode = "plan_only" | "plan_and_code";

export interface ProjectRequest {
  project_name: string;
  project_description: string;
  mode: ProjectMode;
  manager_model: string;
  worker_model?: string;
}

export interface ProjectResponse {
  project_id: string;
  status: string;
  message: string;
}

export interface StreamEvent {
  event: string;
  data: {
    message?: string;
    agent?: string;
    task_name?: string;
    output?: string;
    task_index?: number;
    total_tasks?: number;
    project_name?: string;
    mode?: string;
    timestamp?: string;
  };
}

export interface ModelOption {
  id: string;
  provider: string;
  name: string;
  tier: "premium" | "budget";
}

export interface TaskOutput {
  task_name: string;
  agent_name: string;
  output: string;
}

export interface TimelineEntry {
  id: string;
  type:
    | "crew_start"
    | "agent_start"
    | "agent_done"
    | "agent_thinking"
    | "task_start"
    | "task_complete"
    | "task_result"
    | "crew_complete"
    | "crew_stopped"
    | "error";
  agent?: string;
  taskName?: string;
  message: string;
  content?: string;
  output?: string;
  timestamp: string;
}
