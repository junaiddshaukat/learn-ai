/**
 * Project View Page - Real-Time Agent Execution
 *
 * WHAT CHANGED (v2):
 *
 * 1. NEW EVENTS: We now listen for many more CrewAI events:
 *    - agent_start / agent_done → when agents begin/finish
 *    - task_start / task_complete → when tasks begin/finish
 *    - agent_thinking → real-time LLM streaming chunks
 *    - task_result → final task output with full text
 *    - crew_stopped → when user stops the crew
 *
 * 2. STOP BUTTON: Sends POST to /api/projects/{id}/stop
 *    which sets a threading.Event on the backend to cancel.
 *
 * 3. THINKING STREAM: agent_thinking events update a live
 *    "thinking" display so you can see what the LLM is
 *    generating in real-time (batched every ~15 tokens).
 */
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { use } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Square } from "lucide-react";
import { AgentTimeline } from "@/components/agent-timeline";
import { OutputViewer } from "@/components/output-viewer";
import { stopProject, streamProject } from "@/lib/api";
import type { TaskOutput, TimelineEntry } from "@/lib/types";

export default function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = use(params);
  const router = useRouter();
  const [timeline, setTimeline] = useState<TimelineEntry[]>([]);
  const [outputs, setOutputs] = useState<TaskOutput[]>([]);
  const [isRunning, setIsRunning] = useState(true);
  const [isStopping, setIsStopping] = useState(false);
  const [thinkingContent, setThinkingContent] = useState("");
  const [thinkingAgent, setThinkingAgent] = useState("");
  const eventSourceRef = useRef<EventSource | null>(null);

  const addTimelineEntry = useCallback(
    (entry: Omit<TimelineEntry, "id">) => {
      setTimeline((prev) => [
        ...prev,
        { ...entry, id: `${Date.now()}-${Math.random().toString(36).slice(2)}` },
      ]);
    },
    []
  );

  async function handleStop() {
    setIsStopping(true);
    try {
      await stopProject(projectId);
    } catch {
      setIsStopping(false);
    }
  }

  useEffect(() => {
    const es = streamProject(projectId);
    eventSourceRef.current = es;

    es.addEventListener("crew_start", (e) => {
      const data = JSON.parse(e.data);
      addTimelineEntry({
        type: "crew_start",
        message: data.message,
        timestamp: data.timestamp,
      });
    });

    es.addEventListener("agent_start", (e) => {
      const data = JSON.parse(e.data);
      setThinkingContent("");
      setThinkingAgent(data.agent || "");
      addTimelineEntry({
        type: "agent_start",
        agent: data.agent,
        message: data.message,
        timestamp: data.timestamp,
      });
    });

    es.addEventListener("agent_done", (e) => {
      const data = JSON.parse(e.data);
      setThinkingContent("");
      addTimelineEntry({
        type: "agent_done",
        agent: data.agent,
        message: data.message,
        timestamp: data.timestamp,
      });
    });

    es.addEventListener("task_start", (e) => {
      const data = JSON.parse(e.data);
      addTimelineEntry({
        type: "task_start",
        agent: data.agent,
        taskName: data.task_name,
        message: data.message,
        timestamp: data.timestamp,
      });
    });

    es.addEventListener("agent_thinking", (e) => {
      const data = JSON.parse(e.data);
      setThinkingAgent(data.agent || "");
      setThinkingContent((prev) => prev + (data.content || ""));
    });

    es.addEventListener("task_complete", (e) => {
      const data = JSON.parse(e.data);
      setThinkingContent("");
      addTimelineEntry({
        type: "task_complete",
        agent: data.agent,
        taskName: data.task_name,
        message: data.message,
        timestamp: data.timestamp,
      });
      if (data.output) {
        setOutputs((prev) => {
          if (prev.some((o) => o.task_name === data.task_name)) return prev;
          return [
            ...prev,
            {
              task_name: data.task_name,
              agent_name: data.agent,
              output: data.output,
            },
          ];
        });
      }
    });

    es.addEventListener("task_result", (e) => {
      const data = JSON.parse(e.data);
      setOutputs((prev) => {
        const existing = prev.find((o) => o.task_name === data.task_name);
        if (existing) {
          return prev.map((o) =>
            o.task_name === data.task_name
              ? { ...o, output: data.output }
              : o
          );
        }
        return [
          ...prev,
          {
            task_name: data.task_name,
            agent_name: data.agent,
            output: data.output,
          },
        ];
      });
    });

    es.addEventListener("crew_complete", (e) => {
      const data = JSON.parse(e.data);
      setThinkingContent("");
      addTimelineEntry({
        type: "crew_complete",
        message: data.message,
        timestamp: data.timestamp,
      });
      setIsRunning(false);
      es.close();
    });

    es.addEventListener("crew_stopped", (e) => {
      const data = JSON.parse(e.data);
      setThinkingContent("");
      addTimelineEntry({
        type: "crew_stopped",
        message: data.message,
        timestamp: data.timestamp,
      });
      setIsRunning(false);
      setIsStopping(false);
      es.close();
    });

    es.addEventListener("error", (e) => {
      if (e instanceof MessageEvent && e.data) {
        try {
          const data = JSON.parse(e.data);
          addTimelineEntry({
            type: "error",
            message: data.message,
            timestamp: data.timestamp,
          });
        } catch {
          addTimelineEntry({
            type: "error",
            message: "Connection error",
            timestamp: new Date().toISOString(),
          });
        }
      }
      setIsRunning(false);
      es.close();
    });

    return () => {
      es.close();
    };
  }, [projectId, addTimelineEntry]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => router.push("/")}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          New Project
        </Button>
        <div className="h-4 w-px bg-border" />
        <h2 className="text-lg font-semibold">
          Project: <code className="text-sm font-mono">{projectId}</code>
        </h2>
        <div className="flex-1" />
        {isRunning && (
          <Button
            variant="destructive"
            size="sm"
            onClick={handleStop}
            disabled={isStopping}
            className="gap-1.5"
          >
            <Square className="h-3.5 w-3.5" />
            {isStopping ? "Stopping..." : "Stop Agents"}
          </Button>
        )}
      </div>

      {/* Two-column layout: Timeline | Output */}
      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        <AgentTimeline
          entries={timeline}
          isRunning={isRunning}
          thinkingContent={thinkingContent}
          thinkingAgent={thinkingAgent}
        />
        <OutputViewer outputs={outputs} />
      </div>
    </div>
  );
}
