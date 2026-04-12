"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Code,
  Database,
  FlaskConical,
  Loader2,
  Monitor,
  Rocket,
  Shield,
} from "lucide-react";
import { createProject } from "@/lib/api";
import type { ProjectMode } from "@/lib/types";

const AGENTS = [
  { name: "CTO", role: "Tech Lead & Architect", icon: Shield, color: "text-violet-500" },
  { name: "Frontend Dev", role: "React/Next.js Specialist", icon: Monitor, color: "text-blue-500" },
  { name: "Backend Dev", role: "API & Server Engineer", icon: Code, color: "text-green-500" },
  { name: "DB Architect", role: "Schema & Data Design", icon: Database, color: "text-amber-500" },
  { name: "QA Engineer", role: "Testing & Quality", icon: FlaskConical, color: "text-rose-500" },
];

export function ProjectForm() {
  const router = useRouter();
  const [projectName, setProjectName] = useState("");
  const [description, setDescription] = useState("");
  const [mode, setMode] = useState<ProjectMode>("plan_only");
  const [managerModel, setManagerModel] = useState("gpt-4o");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const canSubmit = projectName.trim().length > 0 && description.trim().length >= 10;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setError("");

    try {
      const res = await createProject({
        project_name: projectName.trim(),
        project_description: description.trim(),
        mode,
        manager_model: managerModel,
      });
      router.push(`/project/${res.project_id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-8 px-6 py-10 lg:grid-cols-[1fr_340px]">
      {/* Main Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Start a New Project</CardTitle>
          <CardDescription>
            Describe your project and the AI engineering team will architect,
            design, code, and test it for you.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Project Name */}
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Project Name
              </label>
              <input
                id="name"
                type="text"
                placeholder="e.g. TaskFlow, BookShelf, FitTrack..."
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                maxLength={100}
              />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label htmlFor="desc" className="text-sm font-medium">
                Project Description
              </label>
              <Textarea
                id="desc"
                placeholder="Describe what your app should do, who uses it, key features, etc. The more detail you give, the better the output."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                maxLength={2000}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground">
                {description.length}/2000 characters
              </p>
            </div>

            <Separator />

            {/* Mode Selection */}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Output Mode</label>
                <Select
                  value={mode}
                  onValueChange={(v) => v && setMode(v as ProjectMode)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="plan_only">
                      Plan Only (specs & architecture)
                    </SelectItem>
                    <SelectItem value="plan_and_code">
                      Plan + Code (full implementation)
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Model Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">CTO Model</label>
                <Select
                  value={managerModel}
                  onValueChange={(v) => v && setManagerModel(v)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-4o">GPT-4o (OpenAI)</SelectItem>
                    <SelectItem value="gpt-4o-mini">GPT-4o Mini (OpenAI)</SelectItem>
                    <SelectItem value="anthropic/claude-sonnet-4-20250514">Claude Sonnet (Anthropic)</SelectItem>
                    <SelectItem value="gemini/gemini-2.5-pro">Gemini 2.5 Pro (Google)</SelectItem>
                    <SelectItem value="gemini/gemini-2.0-flash">Gemini 2.0 Flash (Google)</SelectItem>
                    <SelectItem value="groq/llama-3.3-70b-versatile">Llama 3.3 70B (Groq)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <Button
              type="submit"
              size="lg"
              className="w-full gap-2"
              disabled={!canSubmit || loading}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Rocket className="h-4 w-4" />
              )}
              {loading ? "Starting Team..." : "Launch Engineering Team"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Sidebar - Team Overview */}
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Your Engineering Team</CardTitle>
            <CardDescription className="text-xs">
              5 AI agents working in a hierarchical structure
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {AGENTS.map((agent) => (
              <div key={agent.name} className="flex items-center gap-3">
                <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted ${agent.color}`}>
                  <agent.icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium leading-tight">
                    {agent.name}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {agent.role}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <h3 className="mb-2 text-sm font-medium">How it works</h3>
            <ol className="space-y-2 text-xs text-muted-foreground">
              <li className="flex gap-2">
                <Badge variant="secondary" className="h-5 w-5 shrink-0 items-center justify-center rounded-full p-0 text-[10px]">1</Badge>
                <span>CTO analyzes requirements & plans architecture</span>
              </li>
              <li className="flex gap-2">
                <Badge variant="secondary" className="h-5 w-5 shrink-0 items-center justify-center rounded-full p-0 text-[10px]">2</Badge>
                <span>DB Architect designs the database schema</span>
              </li>
              <li className="flex gap-2">
                <Badge variant="secondary" className="h-5 w-5 shrink-0 items-center justify-center rounded-full p-0 text-[10px]">3</Badge>
                <span>Backend Dev builds API & server logic</span>
              </li>
              <li className="flex gap-2">
                <Badge variant="secondary" className="h-5 w-5 shrink-0 items-center justify-center rounded-full p-0 text-[10px]">4</Badge>
                <span>Frontend Dev creates the UI components</span>
              </li>
              <li className="flex gap-2">
                <Badge variant="secondary" className="h-5 w-5 shrink-0 items-center justify-center rounded-full p-0 text-[10px]">5</Badge>
                <span>QA Engineer writes comprehensive tests</span>
              </li>
            </ol>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
