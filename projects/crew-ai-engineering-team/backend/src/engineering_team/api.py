"""
FastAPI Application with SSE Streaming + CrewAI Event Listeners
=================================================================

KEY UPGRADE FROM v1:

The original version ran crew.kickoff() in a thread and only got
results AFTER everything finished. Now we use CrewAI's EVENT SYSTEM:

  CrewAI Event Bus ──► Custom Listener ──► asyncio Queue ──► SSE Stream

Events fire in real-time as agents think, delegate, and complete tasks:
- AgentLogsStartedEvent       → "Agent X started working"
- AgentLogsExecutionEvent     → "Agent X finished"
- TaskStartedEvent            → "Task Y began"
- TaskCompletedEvent          → "Task Y done" + output
- LLMStreamChunkEvent         → Real-time LLM token streaming
- CrewKickoffCompletedEvent   → "Crew finished"

STOP FUNCTIONALITY:
- Each project stores a threading.Event as a cancellation signal
- The stop endpoint sets this event
- The crew thread checks it periodically and raises an exception
"""

import asyncio
import json
import threading
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from dotenv import load_dotenv

load_dotenv()

from crewai.events import (
    AgentLogsExecutionEvent,
    AgentLogsStartedEvent,
    BaseEventListener,
    CrewKickoffCompletedEvent,
    CrewKickoffStartedEvent,
    LLMCallCompletedEvent,
    LLMCallStartedEvent,
    LLMStreamChunkEvent,
    TaskCompletedEvent,
    TaskStartedEvent,
)
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sse_starlette.sse import EventSourceResponse

from engineering_team.crew import EngineeringTeamCrew
from engineering_team.models import ProjectRequest, ProjectResponse

app = FastAPI(
    title="AI Engineering Team API",
    description="CrewAI-powered engineering team that builds production-ready apps",
    version="0.2.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

projects: Dict[str, dict] = {}


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


def _sse(event: str, **data: Any) -> dict:
    """Helper to build an SSE event dict."""
    data.setdefault("timestamp", _now())
    return {"event": event, "data": json.dumps(data)}


class CrewEventBridge(BaseEventListener):
    """
    Bridges CrewAI's internal event bus to our asyncio SSE queue.

    HOW THIS WORKS:
    - CrewAI fires events on a SYNCHRONOUS event bus (from the crew thread)
    - We need to push them to an ASYNCIO queue (for the SSE endpoint)
    - loop.call_soon_threadsafe() safely crosses the thread boundary

    This is the pattern for any sync-to-async bridge.
    """

    # Maps CrewAI's raw task descriptions to our clean tab labels.
    # CrewAI sends the first line of the task description as task_name,
    # so we match on keywords.
    TASK_NAME_MAP = {
        "architecture": "Architecture Planning",
        "database": "Database Design",
        "backend": "Backend Implementation",
        "frontend": "Frontend Implementation",
        "test": "Test Suite",
    }

    TASK_AGENT_MAP = {
        "Architecture Planning": "Backend Developer",
        "Database Design": "Database Architect",
        "Backend Implementation": "Backend Developer",
        "Frontend Implementation": "Frontend Developer",
        "Test Suite": "Testing Engineer",
    }

    def __init__(self, event_queue: asyncio.Queue, loop: asyncio.AbstractEventLoop):
        self._queue = event_queue
        self._loop = loop
        self._current_agent: Optional[str] = None
        self._chunk_buffer: str = ""
        self._chunk_count: int = 0
        super().__init__()

    def _push(self, event: dict):
        """Thread-safe push to the asyncio queue."""
        self._loop.call_soon_threadsafe(self._queue.put_nowait, event)

    def _normalize_task_name(self, raw_name: str) -> str:
        """Convert CrewAI's raw task name to our clean label."""
        lower = raw_name.lower()
        for keyword, label in self.TASK_NAME_MAP.items():
            if keyword in lower:
                return label
        return raw_name

    def setup_listeners(self, crewai_event_bus):

        @crewai_event_bus.on(CrewKickoffStartedEvent)
        def on_crew_start(source, event: CrewKickoffStartedEvent):
            self._push(_sse(
                "crew_start",
                message="Engineering team is starting...",
                crew_name=getattr(event, "crew_name", "Engineering Team"),
            ))

        @crewai_event_bus.on(AgentLogsStartedEvent)
        def on_agent_start(source, event: AgentLogsStartedEvent):
            agent_role = getattr(event, "agent_role", None) or "Agent"
            if "planner" in agent_role.lower() or "task execution" in agent_role.lower():
                return
            self._current_agent = agent_role
            self._push(_sse(
                "agent_start",
                agent=agent_role,
                message=f"{agent_role} started working...",
            ))

        @crewai_event_bus.on(AgentLogsExecutionEvent)
        def on_agent_done(source, event: AgentLogsExecutionEvent):
            agent_role = getattr(event, "agent_role", None) or self._current_agent or "Agent"
            if "planner" in agent_role.lower() or "task execution" in agent_role.lower():
                return
            self._push(_sse(
                "agent_done",
                agent=agent_role,
                message=f"{agent_role} finished their work.",
            ))

        @crewai_event_bus.on(TaskStartedEvent)
        def on_task_start(source, event: TaskStartedEvent):
            raw_name = getattr(event, "task_name", None) or "Task"
            agent = getattr(event, "agent_role", None) or self._current_agent or "Agent"
            if "planner" in agent.lower() or "task execution" in agent.lower():
                return
            task_name = self._normalize_task_name(raw_name)
            self._current_agent = agent
            self._push(_sse(
                "task_start",
                task_name=task_name,
                agent=agent,
                message=f"Working on: {task_name}",
            ))

        @crewai_event_bus.on(TaskCompletedEvent)
        def on_task_done(source, event: TaskCompletedEvent):
            raw_name = getattr(event, "task_name", None) or "Task"
            output = getattr(event, "output", None) or ""
            if hasattr(output, "raw"):
                output = output.raw
            output_str = str(output)

            # Skip internal planning events from planning=True.
            # These produce JSON with "list_of_plans_per_task" or have
            # agent names like "Task Execution Planner".
            agent = getattr(event, "agent_role", None) or self._current_agent or "Agent"
            if "list_of_plans_per_task" in output_str:
                return
            if "planner" in agent.lower() or "task execution" in agent.lower():
                return

            task_name = self._normalize_task_name(raw_name)
            self._push(_sse(
                "task_complete",
                task_name=task_name,
                agent=agent,
                output=output_str,
                message=f"Completed: {task_name}",
            ))

        @crewai_event_bus.on(LLMCallStartedEvent)
        def on_llm_start(source, event: LLMCallStartedEvent):
            self._chunk_buffer = ""
            self._chunk_count = 0

        @crewai_event_bus.on(LLMStreamChunkEvent)
        def on_llm_chunk(source, event: LLMStreamChunkEvent):
            chunk = getattr(event, "chunk", "")
            if not chunk:
                return
            self._chunk_buffer += chunk
            self._chunk_count += 1
            # Send a batch every ~15 tokens to reduce SSE traffic
            if self._chunk_count >= 15 or chunk.endswith("\n"):
                self._push(_sse(
                    "agent_thinking",
                    agent=self._current_agent or "Agent",
                    content=self._chunk_buffer,
                    message="Thinking...",
                ))
                self._chunk_buffer = ""
                self._chunk_count = 0

        @crewai_event_bus.on(LLMCallCompletedEvent)
        def on_llm_done(source, event: LLMCallCompletedEvent):
            if self._chunk_buffer:
                self._push(_sse(
                    "agent_thinking",
                    agent=self._current_agent or "Agent",
                    content=self._chunk_buffer,
                    message="Thinking...",
                ))
                self._chunk_buffer = ""
                self._chunk_count = 0

        @crewai_event_bus.on(CrewKickoffCompletedEvent)
        def on_crew_done(source, event: CrewKickoffCompletedEvent):
            self._push(_sse(
                "crew_complete",
                message="Engineering team has finished!",
            ))


# ──────────────────────────────────────────────────────
# ENDPOINTS
# ──────────────────────────────────────────────────────

@app.get("/api/health")
async def health_check():
    return {"status": "healthy", "service": "engineering-team-api"}


@app.post("/api/projects", response_model=ProjectResponse)
async def create_project(request: ProjectRequest):
    project_id = str(uuid.uuid4())[:8]

    projects[project_id] = {
        "id": project_id,
        "request": request.model_dump(),
        "status": "pending",
        "created_at": _now(),
        "results": {},
        "_cancel_event": threading.Event(),
    }

    return ProjectResponse(
        project_id=project_id,
        status="accepted",
        message=f"Project '{request.project_name}' accepted.",
    )


@app.get("/api/projects/{project_id}/stream")
async def stream_project(project_id: str):
    if project_id not in projects:
        raise HTTPException(status_code=404, detail="Project not found")

    project = projects[project_id]

    if project["status"] == "completed":
        raise HTTPException(status_code=400, detail="Project already completed")

    request_data = project["request"]
    event_queue: asyncio.Queue = asyncio.Queue()
    cancel_event: threading.Event = project["_cancel_event"]
    loop = asyncio.get_event_loop()

    # Create the event bridge BEFORE starting the crew
    bridge = CrewEventBridge(event_queue, loop)  # noqa: F841 - must stay alive

    async def run_crew_in_background():
        try:
            project["status"] = "running"

            engineering_crew = EngineeringTeamCrew()
            crew_instance = engineering_crew.crew()

            inputs = {
                "project_name": request_data["project_name"],
                "project_description": request_data["project_description"],
                "mode": request_data["mode"],
            }

            def kickoff_with_cancel():
                """Run kickoff, checking cancel_event periodically."""
                if cancel_event.is_set():
                    raise InterruptedError("Stopped by user")
                return crew_instance.kickoff(inputs=inputs)

            result = await loop.run_in_executor(None, kickoff_with_cancel)

            # Also send task results from the result object as a fallback,
            # in case some TaskCompletedEvents didn't fire with full output
            task_outputs = []
            if hasattr(result, "tasks_output") and result.tasks_output:
                for i, task_output in enumerate(result.tasks_output):
                    task_name = [
                        "Architecture Planning",
                        "Database Design",
                        "Backend Implementation",
                        "Frontend Implementation",
                        "Test Suite",
                    ][i] if i < 5 else f"Task {i}"

                    agent_name = [
                        "Backend Developer",
                        "Database Architect",
                        "Backend Developer",
                        "Frontend Developer",
                        "Testing Engineer",
                    ][i] if i < 5 else "Agent"

                    output_text = (
                        task_output.raw
                        if hasattr(task_output, "raw")
                        else str(task_output)
                    )

                    task_outputs.append({
                        "task_name": task_name,
                        "agent_name": agent_name,
                        "output": output_text,
                    })

                    await event_queue.put(_sse(
                        "task_result",
                        task_name=task_name,
                        agent=agent_name,
                        output=output_text,
                        task_index=i,
                        total_tasks=len(result.tasks_output),
                    ))

            project["status"] = "completed"
            project["results"] = {
                "raw": result.raw,
                "tasks": task_outputs,
            }

            await event_queue.put(_sse(
                "crew_complete",
                message="Engineering team has finished!",
                total_tasks=len(task_outputs),
            ))

        except InterruptedError:
            project["status"] = "stopped"
            await event_queue.put(_sse(
                "crew_stopped",
                message="Engineering team was stopped by user.",
            ))

        except Exception as e:
            project["status"] = "error"
            await event_queue.put(_sse(
                "error",
                message=f"Crew execution failed: {str(e)}",
            ))

        finally:
            await event_queue.put(None)

    asyncio.create_task(run_crew_in_background())

    async def event_generator():
        while True:
            event = await event_queue.get()
            if event is None:
                break
            yield event

    return EventSourceResponse(event_generator())


@app.post("/api/projects/{project_id}/stop")
async def stop_project(project_id: str):
    """
    Stop a running project's crew execution.

    Sets a threading.Event that the crew thread checks.
    The crew won't stop mid-LLM-call (that's an API call in flight),
    but it will stop before the next task/agent starts.
    """
    if project_id not in projects:
        raise HTTPException(status_code=404, detail="Project not found")

    project = projects[project_id]

    if project["status"] != "running":
        raise HTTPException(
            status_code=400,
            detail=f"Project is not running (status: {project['status']})",
        )

    cancel_event: threading.Event = project["_cancel_event"]
    cancel_event.set()
    project["status"] = "stopping"

    return {"status": "stopping", "message": "Stop signal sent to crew."}


@app.get("/api/projects/{project_id}")
async def get_project(project_id: str):
    if project_id not in projects:
        raise HTTPException(status_code=404, detail="Project not found")
    proj_copy = {k: v for k, v in projects[project_id].items() if not k.startswith("_")}
    return proj_copy


@app.get("/api/models")
async def list_models():
    return {
        "models": [
            {"id": "gpt-4o", "provider": "OpenAI", "name": "GPT-4o", "tier": "premium"},
            {"id": "gpt-4o-mini", "provider": "OpenAI", "name": "GPT-4o Mini", "tier": "budget"},
            {"id": "anthropic/claude-sonnet-4-20250514", "provider": "Anthropic", "name": "Claude Sonnet", "tier": "premium"},
            {"id": "anthropic/claude-haiku-4-20250414", "provider": "Anthropic", "name": "Claude Haiku", "tier": "budget"},
            {"id": "gemini/gemini-2.0-flash", "provider": "Google", "name": "Gemini 2.0 Flash", "tier": "budget"},
            {"id": "gemini/gemini-2.5-pro", "provider": "Google", "name": "Gemini 2.5 Pro", "tier": "premium"},
            {"id": "groq/llama-3.3-70b-versatile", "provider": "Groq", "name": "Llama 3.3 70B", "tier": "budget"},
        ]
    }
