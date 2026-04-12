"""
Engineering Team - Main Entry Point
=====================================

This file serves two purposes:
1. CLI mode: Run the crew directly from terminal for testing
2. API mode: Start the FastAPI server (added in Phase 2)

HOW CrewAI EXECUTION WORKS:
- crew.kickoff(inputs={...}) starts the hierarchical process
- The CTO manager receives all tasks and begins delegation
- Each agent works on its assigned task, producing output
- Task outputs flow to dependent tasks via "context"
- Final result contains all task outputs combined
"""

import os
import sys
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

from engineering_team.crew import EngineeringTeamCrew


def run_cli():
    """Run the engineering team from the command line."""

    print("=" * 60)
    print("  AI ENGINEERING TEAM")
    print("  Powered by CrewAI - Hierarchical Process")
    print("=" * 60)

    project_name = input("\nProject name: ").strip() or "My App"
    project_description = input("Project description: ").strip() or (
        "A simple todo app with user authentication"
    )

    print("\nMode options:")
    print("  1. plan_only    - Architecture specs and documentation only")
    print("  2. plan_and_code - Full specs + generated code")
    mode_choice = input("Choose mode (1 or 2): ").strip()
    mode = "plan_and_code" if mode_choice == "2" else "plan_only"

    inputs = {
        "project_name": project_name,
        "project_description": project_description,
        "mode": mode,
    }

    print(f"\nStarting crew with inputs: {inputs}")
    print("-" * 60)

    engineering_crew = EngineeringTeamCrew()
    result = engineering_crew.crew().kickoff(inputs=inputs)

    print("\n" + "=" * 60)
    print("  CREW EXECUTION COMPLETE")
    print("=" * 60)

    output_dir = Path("output")
    output_dir.mkdir(exist_ok=True)
    output_file = output_dir / f"{project_name.lower().replace(' ', '_')}_output.md"
    output_file.write_text(result.raw)
    print(f"\nOutput saved to: {output_file}")


if __name__ == "__main__":
    run_cli()
