"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";
import {
  Code,
  Database,
  FlaskConical,
  FileText,
  Monitor,
} from "lucide-react";
import type { TaskOutput } from "@/lib/types";

const TAB_CONFIG = [
  { key: "Architecture Planning", keyword: "architect", icon: FileText, label: "Architecture" },
  { key: "Database Design", keyword: "database", icon: Database, label: "Database" },
  { key: "Backend Implementation", keyword: "backend", icon: Code, label: "Backend" },
  { key: "Frontend Implementation", keyword: "frontend", icon: Monitor, label: "Frontend" },
  { key: "Test Suite", keyword: "test", icon: FlaskConical, label: "Tests" },
];

function matchTab(taskName: string) {
  const lower = taskName.toLowerCase();
  return TAB_CONFIG.find(
    (t) => t.key === taskName || lower.includes(t.keyword)
  );
}

function normalizeOutputs(outputs: TaskOutput[]) {
  return outputs.map((o) => {
    const tab = matchTab(o.task_name);
    return { ...o, tabKey: tab?.key || o.task_name };
  });
}

interface OutputViewerProps {
  outputs: TaskOutput[];
}

export function OutputViewer({ outputs }: OutputViewerProps) {
  if (outputs.length === 0) {
    return (
      <Card>
        <CardContent className="flex h-64 items-center justify-center">
          <p className="text-sm text-muted-foreground">
            Output will appear here as agents complete their tasks.
          </p>
        </CardContent>
      </Card>
    );
  }

  const normalized = normalizeOutputs(outputs);

  const firstTab =
    TAB_CONFIG.find((t) => normalized.some((o) => o.tabKey === t.key))?.key ||
    normalized[0]?.tabKey;

  return (
    <Tabs defaultValue={firstTab} className="w-full min-w-0">
      <TabsList className="w-full flex-wrap justify-start h-auto gap-1 bg-transparent p-0">
        {TAB_CONFIG.map((tab) => {
          const hasOutput = normalized.some((o) => o.tabKey === tab.key);
          return (
            <TabsTrigger
              key={tab.key}
              value={tab.key}
              disabled={!hasOutput}
              className="gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm"
            >
              <tab.icon className="h-3.5 w-3.5" />
              {tab.label}
              {hasOutput && (
                <Badge variant="secondary" className="ml-1 h-4 px-1 text-[10px]">
                  Done
                </Badge>
              )}
            </TabsTrigger>
          );
        })}
      </TabsList>

      {TAB_CONFIG.map((tab) => {
        const output = normalized.find((o) => o.tabKey === tab.key);
        if (!output) return null;
        return (
          <TabsContent key={tab.key} value={tab.key}>
            <Card className="overflow-hidden">
              <CardContent className="pt-6">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">{tab.label}</h3>
                    <p className="text-xs text-muted-foreground">
                      Completed by {output.agent_name}
                    </p>
                  </div>
                </div>
                <ScrollArea className="h-[calc(100vh-24rem)]">
                  <div className="markdown-body min-w-0 pr-4">
                    <ReactMarkdown rehypePlugins={[rehypeHighlight]}>
                      {output.output}
                    </ReactMarkdown>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        );
      })}
    </Tabs>
  );
}
