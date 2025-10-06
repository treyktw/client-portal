// app/onboarding/[workspaceId]/theme/page.tsx
"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useMutation } from "convex/react";
import { api } from "@telera/convex/_generated/api";
import { Id } from "@telera/convex";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { useTheme } from "@/providers/theme-provider";

const themes = [
  {
    id: "notebook",
    name: "Notebook",
    description: "Playful handwritten style with rounded corners",
    font: "Architects Daughter",
    preview: {
      bg: "bg-[#faf8f7]",
      text: "text-[#593f3f]",
      accent: "bg-[#efe89c]",
      border: "border-[#8c8b80]",
    },
  },
  {
    id: "coffee",
    name: "Coffee",
    description: "Warm and inviting with coffee tones",
    font: "System UI",
    preview: {
      bg: "bg-[#faf7f4]",
      text: "text-[#3e3e3e]",
      accent: "bg-[#6f5f4f]",
      border: "border-[#e0d7ce]",
    },
  },
  {
    id: "graphite",
    name: "Graphite",
    description: "Professional grayscale design",
    font: "Inter",
    preview: {
      bg: "bg-[#f3f3f3]",
      text: "text-[#525252]",
      accent: "bg-[#7d7d7d]",
      border: "border-[#dadada]",
    },
  },
  {
    id: "mono",
    name: "Mono",
    description: "Minimalist monospace terminal style",
    font: "Geist Mono",
    preview: {
      bg: "bg-white",
      text: "text-[#242424]",
      accent: "bg-[#8e8e8e]",
      border: "border-[#ebebeb]",
    },
  },
];

export default function ThemePage() {
  const router = useRouter();
  const params = useParams();
  const workspaceId = params.workspaceId as string;

  const updateStep = useMutation(api.workspaces.updateOnboardingStep);
  const {
    theme: currentTheme,
    darkMode: currentDarkMode,
    setTheme,
    setDarkMode,
  } = useTheme();

  const [selectedTheme, setSelectedTheme] = useState(currentTheme);
  const [darkMode, setDarkModeState] = useState(currentDarkMode);

  // Update theme in real-time as user selects
  useEffect(() => {
    setTheme(selectedTheme as "notebook" | "coffee" | "graphite" | "mono");
  }, [selectedTheme, setTheme]);

  useEffect(() => {
    setDarkMode(darkMode);
  }, [darkMode, setDarkMode]);

  const handleSubmit = async () => {
    await updateStep({
      workspaceId: workspaceId as Id<"workspaces">,
      step: 5,
      fieldToUpdate: "theme",
      data: {
        theme: selectedTheme as "notebook" | "coffee" | "graphite" | "mono",
        darkMode,
      },
    });

    router.push(`/onboarding/${workspaceId}/assets`);
  };

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            Choose Your Theme
          </h1>
          <p className="text-muted-foreground">
            Select the style you prefer for your workspace. You can see the
            changes in real-time!
          </p>
        </div>

        <div className="space-y-6">
          {/* Theme Selection */}
          <div className="grid md:grid-cols-2 gap-4">
            {themes.map((theme) => (
              <Card
                key={theme.id}
                className={cn(
                  "relative cursor-pointer transition-all hover:shadow-lg",
                  selectedTheme === theme.id && "ring-2 ring-primary",
                )}
                onClick={() => setSelectedTheme(theme.id as "notebook" | "coffee" | "graphite" | "mono")}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-semibold text-lg">{theme.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {theme.description}
                      </p>
                    </div>
                    <div
                      className={cn(
                        "w-5 h-5 rounded-full border-2 transition-all",
                        selectedTheme === theme.id
                          ? "border-primary bg-primary"
                          : "border-muted-foreground",
                      )}
                    >
                      {selectedTheme === theme.id && (
                        <div className="w-full h-full rounded-full bg-primary-foreground scale-50" />
                      )}
                    </div>
                  </div>

                  {/* Theme Preview */}
                  <div
                    className={cn(
                      "rounded-lg p-4 space-y-2",
                      theme.preview.bg,
                      theme.preview.text,
                      theme.preview.border,
                      "border",
                    )}
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "w-2 h-2 rounded-full",
                          theme.preview.accent,
                        )}
                      />
                      <div className="text-sm font-medium">Sample Text</div>
                    </div>
                    <div className="text-xs opacity-70">
                      This is how your workspace will look
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{theme.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {theme.description}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Font: {theme.font}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <div
                        className={cn(
                          "px-2 py-1 rounded text-xs",
                          theme.preview.accent,
                          "text-white",
                        )}
                      >
                        Button
                      </div>
                      <div
                        className={cn(
                          "px-2 py-1 rounded text-xs border",
                          theme.preview.border,
                        )}
                      >
                        Secondary
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Dark Mode Toggle */}
          <Card>
            <div className="p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="dark-mode" className="text-base font-medium">
                    Dark Mode
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Enable dark mode for better visibility in low light
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Sun className="w-4 h-4 text-muted-foreground" />
                  <Switch
                    id="dark-mode"
                    checked={darkMode}
                    onCheckedChange={setDarkModeState}
                  />
                  <Moon className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
            </div>
          </Card>

          {/* Live Preview Notice */}
          <div className="bg-accent/20 border border-accent rounded-lg p-4">
            <p className="text-sm text-accent-foreground">
              ✨ The theme is being applied in real-time! Look at the sidebar
              and this page to see your selected theme in action.
            </p>
          </div>

          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => router.push(`/onboarding/${workspaceId}/goals`)}
            >
              Back
            </Button>
            <Button onClick={handleSubmit}>Continue</Button>
          </div>
        </div>
      </div>
    </div>
  );
}
