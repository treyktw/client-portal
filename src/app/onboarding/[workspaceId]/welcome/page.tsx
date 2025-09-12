// app/onboarding/[workspaceId]/welcome/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Sparkles, Zap, Users, FileText } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";

export default function WelcomePage() {
  const router = useRouter();
  const params = useParams();
  const workspaceId = params.workspaceId as string;

  const updateStep = useMutation(api.workspaces.updateOnboardingStep);

  const handleContinue = async () => {
    try {
      await updateStep({
        workspaceId: workspaceId as Id<"workspaces">,
        step: 2,
        fieldToUpdate: undefined, // No data to save on welcome
        data: undefined,
      });
      router.push(`/onboarding/${workspaceId}/business-info`);
    } catch (error) {
      console.error("Error updating step:", error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="max-w-2xl w-full space-y-8">
        <div className="text-center space-y-4">
          <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto">
            <Sparkles className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight">
            Welcome to Your Project Setup!
          </h1>
          <p className="text-lg text-muted-foreground max-w-lg mx-auto">
            We'll walk you through a few short steps to collect information.
            This will help us prepare your project brief and set up your
            workspace.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <Card className="p-6 text-center">
            <Zap className="w-8 h-8 text-primary mx-auto mb-3" />
            <h3 className="font-semibold mb-1">Quick Setup</h3>
            <p className="text-sm text-muted-foreground">
              Less than 10 minutes
            </p>
          </Card>
          <Card className="p-6 text-center">
            <Users className="w-8 h-8 text-primary mx-auto mb-3" />
            <h3 className="font-semibold mb-1">Collaborative</h3>
            <p className="text-sm text-muted-foreground">Work with your team</p>
          </Card>
          <Card className="p-6 text-center">
            <FileText className="w-8 h-8 text-primary mx-auto mb-3" />
            <h3 className="font-semibold mb-1">Auto Brief</h3>
            <p className="text-sm text-muted-foreground">
              We'll generate your brief
            </p>
          </Card>
        </div>

        <div className="flex justify-center">
          <Button size="lg" onClick={handleContinue} className="min-w-[200px]">
            Let's Get Started
          </Button>
        </div>
      </div>
    </div>
  );
}
