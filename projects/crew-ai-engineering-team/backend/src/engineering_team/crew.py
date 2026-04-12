"""
Engineering Team Crew Definition
=================================

KEY CONCEPTS TO UNDERSTAND:

1. @CrewBase decorator:
   - Tells CrewAI "this class defines a crew"
   - Auto-loads YAML from agents_config and tasks_config paths
   - Method names MUST match YAML keys (e.g., def frontend_developer -> frontend_developer: in YAML)

2. @agent decorator:
   - Marks a method as an agent factory
   - The method name MUST match the key in agents.yaml
   - Returns an Agent instance with config loaded from YAML

3. @task decorator:
   - Marks a method as a task factory
   - The method name MUST match the key in tasks.yaml
   - Returns a Task instance with config loaded from YAML

4. @crew decorator:
   - Builds the final Crew object
   - self.agents and self.tasks are auto-populated by CrewAI

5. Hierarchical Process:
   - manager_agent = the CTO who delegates work
   - Worker agents have allow_delegation=False to prevent loops
   - The manager reads each agent's role/goal to decide who does what
"""

from typing import List

from crewai import Agent, Crew, Process, Task
from crewai.agents.agent_builder.base_agent import BaseAgent
from crewai.project import CrewBase, agent, crew, task


@CrewBase
class EngineeringTeamCrew:
    """
    The AI Engineering Team.

    5 agents working in a hierarchical structure:
    - CTO (manager) delegates and reviews
    - Frontend Dev, Backend Dev, DB Architect, Testing Engineer execute
    """

    agents: List[BaseAgent]
    tasks: List[Task]

    agents_config = "config/agents.yaml"
    tasks_config = "config/tasks.yaml"

    # ------------------------------------------------------------------
    # MANAGER AGENT (CTO)
    # ------------------------------------------------------------------
    # Not decorated with @agent because it's passed separately
    # as manager_agent to the Crew. CrewAI treats manager agents
    # differently - they get delegation abilities and orchestration
    # powers that regular agents don't have.
    # ------------------------------------------------------------------
    def _create_cto_agent(self, manager_model: str = "gpt-4o") -> Agent:
        return Agent(
            role="Chief Technology Officer (CTO)",
            goal=(
                "Delegate each task to ONE specialist, accept their result, "
                "and return it as your final answer."
            ),
            backstory=(
                "You manage 4 specialists. For each task you receive:\n"
                "1. Pick the ONE best coworker for the job.\n"
                "2. Delegate the ENTIRE task description to them in a single call.\n"
                "3. When they respond, return their output as your Final Answer.\n\n"
                "DO NOT break tasks into subtasks. DO NOT delegate the same "
                "task twice. ONE delegation per task, then finalize.\n\n"
                "Your team:\n"
                "- Senior Frontend Developer → UI, React, Next.js\n"
                "- Senior Backend Developer → APIs, architecture, server\n"
                "- Senior Database Architect → schemas, SQL, migrations\n"
                "- Senior QA & Testing Engineer → tests, CI/CD"
            ),
            llm=manager_model,
            allow_delegation=True,
            max_iter=10,
            verbose=True,
        )

    # ------------------------------------------------------------------
    # WORKER AGENTS
    # ------------------------------------------------------------------
    # Each method name MUST match the key in agents.yaml exactly.
    # allow_delegation=False prevents workers from delegating to each
    # other (which causes infinite loops in hierarchical mode).
    # ------------------------------------------------------------------

    @agent
    def frontend_developer(self) -> Agent:
        return Agent(
            config=self.agents_config["frontend_developer"],  # type: ignore[index]
            allow_delegation=False,
            verbose=True,
        )

    @agent
    def backend_developer(self) -> Agent:
        return Agent(
            config=self.agents_config["backend_developer"],  # type: ignore[index]
            allow_delegation=False,
            verbose=True,
        )

    @agent
    def testing_engineer(self) -> Agent:
        return Agent(
            config=self.agents_config["testing_engineer"],  # type: ignore[index]
            allow_delegation=False,
            verbose=True,
        )

    @agent
    def database_architect(self) -> Agent:
        return Agent(
            config=self.agents_config["database_architect"],  # type: ignore[index]
            allow_delegation=False,
            verbose=True,
        )

    # ------------------------------------------------------------------
    # TASKS
    # ------------------------------------------------------------------
    # Each method name MUST match the key in tasks.yaml exactly.
    # CrewAI auto-loads description, expected_output, agent, and
    # context from the YAML. You can override or add things here.
    # ------------------------------------------------------------------

    @task
    def architecture_planning(self) -> Task:
        return Task(
            config=self.tasks_config["architecture_planning"],  # type: ignore[index]
        )

    @task
    def database_design(self) -> Task:
        return Task(
            config=self.tasks_config["database_design"],  # type: ignore[index]
        )

    @task
    def backend_implementation(self) -> Task:
        return Task(
            config=self.tasks_config["backend_implementation"],  # type: ignore[index]
        )

    @task
    def frontend_implementation(self) -> Task:
        return Task(
            config=self.tasks_config["frontend_implementation"],  # type: ignore[index]
        )

    @task
    def test_suite(self) -> Task:
        return Task(
            config=self.tasks_config["test_suite"],  # type: ignore[index]
        )

    # ------------------------------------------------------------------
    # CREW ASSEMBLY
    # ------------------------------------------------------------------

    @crew
    def crew(self) -> Crew:
        """
        Assembles the engineering team crew.

        Process.hierarchical means:
        - The CTO manager agent receives ALL tasks
        - It decides execution order and which worker handles what
        - Workers report results back to the CTO
        - CTO validates before moving to next task

        self.agents is auto-populated with all @agent-decorated methods.
        self.tasks is auto-populated with all @task-decorated methods.
        """
        return Crew(
            agents=self.agents,
            tasks=self.tasks,
            manager_agent=self._create_cto_agent(),
            process=Process.hierarchical,
            verbose=True,
        )
