/**
 * API Client - communicates with the FastAPI backend.
 *
 * KEY CONCEPTS:
 *
 * 1. We use plain fetch() - no extra library needed.
 *    Next.js extends fetch with caching, but for mutations
 *    and SSE we use standard browser fetch.
 *
 * 2. SSE (Server-Sent Events) uses the EventSource API.
 *    However, EventSource only supports GET requests and
 *    has limited error handling. For our POST-then-stream
 *    pattern, we first POST to create the project, then
 *    GET the SSE stream with EventSource.
 *
 * 3. The API_URL defaults to localhost:8000 for development.
 *    In production, you'd use an environment variable.
 */

import type { ModelOption, ProjectRequest, ProjectResponse } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function createProject(
  request: ProjectRequest
): Promise<ProjectResponse> {
  const res = await fetch(`${API_URL}/api/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Request failed" }));
    throw new Error(error.detail || `HTTP ${res.status}`);
  }

  return res.json();
}

/**
 * Connect to the SSE stream for a project.
 *
 * Returns an EventSource instance. The caller attaches
 * event listeners for different event types:
 *
 *   const es = streamProject("abc123");
 *   es.addEventListener("crew_start", (e) => { ... });
 *   es.addEventListener("task_complete", (e) => { ... });
 *   es.addEventListener("crew_complete", (e) => { ... });
 *   es.addEventListener("error", (e) => { ... });
 *
 * EventSource automatically reconnects on network errors,
 * which is a nice built-in feature of the SSE protocol.
 */
export function streamProject(projectId: string): EventSource {
  return new EventSource(`${API_URL}/api/projects/${projectId}/stream`);
}

export async function stopProject(projectId: string): Promise<{ status: string; message: string }> {
  const res = await fetch(`${API_URL}/api/projects/${projectId}/stop`, {
    method: "POST",
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ detail: "Stop failed" }));
    throw new Error(error.detail || `HTTP ${res.status}`);
  }
  return res.json();
}

export async function getProject(projectId: string) {
  const res = await fetch(`${API_URL}/api/projects/${projectId}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function getModels(): Promise<{ models: ModelOption[] }> {
  const res = await fetch(`${API_URL}/api/models`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function healthCheck(): Promise<boolean> {
  try {
    const res = await fetch(`${API_URL}/api/health`);
    return res.ok;
  } catch {
    return false;
  }
}
