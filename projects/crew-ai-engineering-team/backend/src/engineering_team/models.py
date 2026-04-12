"""
Pydantic Models (Request/Response Schemas)
==========================================

WHY PYDANTIC?
- FastAPI uses Pydantic models to automatically validate incoming requests
- If someone sends bad data, FastAPI returns a 422 error with details
- Models also auto-generate OpenAPI docs (try /docs in browser)
- This is the "contract" between frontend and backend

PATTERN TO LEARN:
- Request models = what the frontend sends TO us
- Response models = what we send BACK to the frontend
"""

from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field


class ProjectMode(str, Enum):
    """Enum restricts mode to only valid values - anything else gets rejected."""
    PLAN_ONLY = "plan_only"
    PLAN_AND_CODE = "plan_and_code"


class ProjectRequest(BaseModel):
    """What the frontend sends when starting a new project."""
    project_name: str = Field(
        ...,
        min_length=1,
        max_length=100,
        description="Name of the project to build",
        examples=["My Todo App"],
    )
    project_description: str = Field(
        ...,
        min_length=10,
        max_length=2000,
        description="Detailed description of what the project should do",
        examples=["A todo app with user auth, categories, and due dates"],
    )
    mode: ProjectMode = Field(
        default=ProjectMode.PLAN_ONLY,
        description="Whether to generate only plans or plans + code",
    )
    manager_model: str = Field(
        default="gpt-4o",
        description="LLM model for the CTO manager agent",
    )
    worker_model: Optional[str] = Field(
        default=None,
        description="LLM model for worker agents (uses provider default if not set)",
    )


class ProjectResponse(BaseModel):
    """Returned immediately when a project is created (before crew starts)."""
    project_id: str
    status: str = "accepted"
    message: str = "Project accepted. Connect to the stream endpoint for updates."


class StreamEvent(BaseModel):
    """
    Each SSE event sent to the frontend during crew execution.

    SSE (Server-Sent Events) sends data as a stream of events.
    Each event has a type and data payload.
    """
    event_type: str = Field(
        description="Type: agent_start, agent_thinking, task_complete, crew_complete, error"
    )
    agent_name: Optional[str] = None
    task_name: Optional[str] = None
    content: str = ""
    timestamp: Optional[str] = None
