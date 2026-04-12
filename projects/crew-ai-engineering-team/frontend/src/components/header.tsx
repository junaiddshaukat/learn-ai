"use client";

import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Bot, Circle } from "lucide-react";
import { healthCheck } from "@/lib/api";
import { ThemeToggle } from "@/components/theme-toggle";

export function Header() {
  const [backendOnline, setBackendOnline] = useState(false);

  useEffect(() => {
    healthCheck().then(setBackendOnline);
    const interval = setInterval(() => {
      healthCheck().then(setBackendOnline);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="border-b bg-card">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Bot className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">
              AI Engineering Team
            </h1>
            <p className="text-xs text-muted-foreground">
              Powered by CrewAI
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge
            variant={backendOnline ? "default" : "destructive"}
            className="gap-1.5"
          >
            <Circle
              className={`h-2 w-2 fill-current ${
                backendOnline ? "text-green-400" : "text-red-400"
              }`}
            />
            {backendOnline ? "Backend Online" : "Backend Offline"}
          </Badge>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
