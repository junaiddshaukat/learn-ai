"use client";

import { useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Bot,
  CheckCircle2,
  Code,
  Database,
  FlaskConical,
  Loader2,
  Monitor,
  OctagonX,
  Shield,
  XCircle,
} from "lucide-react";
import type { TimelineEntry } from "@/lib/types";

const AGENT_CONFIG: Record<string, { icon: React.ElementType; color: string }> = {
  CTO: { icon: Shield, color: "text-violet-500 bg-violet-500/10" },
  "Backend Developer": { icon: Code, color: "text-green-500 bg-green-500/10" },
  "Senior Backend Developer": { icon: Code, color: "text-green-500 bg-green-500/10" },
  "Frontend Developer": { icon: Monitor, color: "text-blue-500 bg-blue-500/10" },
  "Senior Frontend Developer": { icon: Monitor, color: "text-blue-500 bg-blue-500/10" },
  "Database Architect": { icon: Database, color: "text-amber-500 bg-amber-500/10" },
  "Senior Database Architect": { icon: Database, color: "text-amber-500 bg-amber-500/10" },
  "Testing Engineer": { icon: FlaskConical, color: "text-rose-500 bg-rose-500/10" },
  "Senior QA & Testing Engineer": { icon: FlaskConical, color: "text-rose-500 bg-rose-500/10" },
};

function getAgentVisuals(agentName?: string) {
  if (!agentName) return { icon: Bot, color: "text-muted-foreground bg-muted" };
  for (const [key, config] of Object.entries(AGENT_CONFIG)) {
    if (agentName.toLowerCase().includes(key.toLowerCase().split(" ")[0].toLowerCase())) {
      return config;
    }
  }
  const config = AGENT_CONFIG[agentName];
  return config || { icon: Bot, color: "text-muted-foreground bg-muted" };
}

interface AgentTimelineProps {
  entries: TimelineEntry[];
  isRunning: boolean;
  thinkingContent?: string;
  thinkingAgent?: string;
}

export function AgentTimeline({
  entries,
  isRunning,
  thinkingContent,
  thinkingAgent,
}: AgentTimelineProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [entries.length, thinkingContent]);

  return (
    <Card className="flex h-full flex-col">
      <CardHeader className="flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">Agent Activity</CardTitle>
        {isRunning && (
          <Badge variant="default" className="gap-1.5">
            <Loader2 className="h-3 w-3 animate-spin" />
            Running
          </Badge>
        )}
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        <ScrollArea className="h-[calc(100vh-20rem)] px-6 pb-4">
          {entries.length === 0 ? (
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
              Waiting for crew to start...
            </div>
          ) : (
            <div className="relative space-y-0">
              <div className="absolute left-4 top-2 bottom-2 w-px bg-border" />

              {entries.map((entry) => {
                const { icon: Icon, color } = getAgentVisuals(entry.agent);
                const isComplete = entry.type === "task_complete" || entry.type === "task_result";
                const isError = entry.type === "error";
                const isCrewDone = entry.type === "crew_complete";
                const isStopped = entry.type === "crew_stopped";

                return (
                  <div key={entry.id} className="relative flex gap-3 pb-4">
                    <div
                      className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                        isError
                          ? "bg-destructive/10 text-destructive"
                          : isStopped
                          ? "bg-amber-500/10 text-amber-500"
                          : isCrewDone
                          ? "bg-green-500/10 text-green-500"
                          : color
                      }`}
                    >
                      {isError ? (
                        <XCircle className="h-4 w-4" />
                      ) : isStopped ? (
                        <OctagonX className="h-4 w-4" />
                      ) : isCrewDone ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        <Icon className="h-4 w-4" />
                      )}
                    </div>

                    <div className="min-w-0 flex-1 pt-0.5">
                      <div className="flex items-center gap-2">
                        {entry.agent && (
                          <span className="text-sm font-medium">
                            {entry.agent}
                          </span>
                        )}
                        {isComplete && entry.taskName && (
                          <Badge variant="secondary" className="text-[10px]">
                            {entry.taskName}
                          </Badge>
                        )}
                        {entry.type === "task_start" && entry.taskName && (
                          <Badge variant="outline" className="text-[10px]">
                            {entry.taskName}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">
                        {entry.message}
                      </p>
                      {entry.timestamp && (
                        <p className="mt-0.5 text-[10px] text-muted-foreground/60">
                          {new Date(entry.timestamp).toLocaleTimeString()}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Live thinking stream */}
              {isRunning && thinkingContent && (
                <div className="relative flex gap-3 pb-4">
                  <div className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${getAgentVisuals(thinkingAgent).color}`}>
                    <Loader2 className="h-4 w-4 animate-spin" />
                  </div>
                  <div className="min-w-0 flex-1 pt-0.5">
                    <span className="text-sm font-medium">
                      {thinkingAgent || "Agent"}
                    </span>
                    <Badge variant="outline" className="ml-2 text-[10px]">
                      thinking
                    </Badge>
                    <p className="mt-1 max-h-32 overflow-y-auto rounded-md bg-muted/50 p-2 text-xs font-mono text-muted-foreground leading-relaxed whitespace-pre-wrap break-words">
                      {thinkingContent.slice(-500)}
                      <span className="animate-pulse">|</span>
                    </p>
                  </div>
                </div>
              )}

              {isRunning && !thinkingContent && (
                <div className="relative flex gap-3 pb-4">
                  <div className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                  <div className="pt-1.5">
                    <p className="text-sm text-muted-foreground animate-pulse">
                      Agents are working...
                    </p>
                  </div>
                </div>
              )}

              <div ref={bottomRef} />
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
