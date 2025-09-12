// app/onboarding/[workspaceId]/goals/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Target } from "lucide-react";

const serviceOptions = [
  "Web Development",
  "Mobile App Development",
  "E-commerce",
  "SEO Optimization",
  "Digital Marketing",
  "Brand Design",
  "Content Management",
  "Custom Software",
];

const goalOptions = [
  "Generate more leads",
  "Improve brand presence",
  "Enable online bookings",
  "Showcase portfolio",
  "Sell products online",
  "Automate processes",
  "Better customer communication",
  "Modern redesign",
];

export default function GoalsPage() {
  const router = useRouter();
  const params = useParams();
  const workspaceId = params.workspaceId as string;
  
  const updateStep = useMutation(api.workspaces.updateOnboardingStep);

  const [services, setServices] = useState<string[]>([]);
  const [goals, setGoals] = useState<string[]>([]);
  const [notes, setNotes] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    await updateStep({
      workspaceId: workspaceId as Id<"workspaces">,
      step: 4,
      fieldToUpdate: "goals", // Explicitly save to goals field
      data: {
        services,
        mainGoals: goals,
        specialNotes: notes || undefined,
      },
    });
    
    router.push(`/onboarding/${workspaceId}/theme`);
  };

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            Goals & Services
          </h1>
          <p className="text-muted-foreground">
            Help us understand your services and what success looks like for you.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Your Services
              </CardTitle>
              <CardDescription>
                Select all services you provide
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                {serviceOptions.map((service) => (
                  <div key={service} className="flex items-center space-x-2">
                    <Checkbox
                      id={service}
                      checked={services.includes(service)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setServices([...services, service]);
                        } else {
                          setServices(services.filter((s) => s !== service));
                        }
                      }}
                    />
                    <Label htmlFor={service} className="text-sm font-normal cursor-pointer">
                      {service}
                    </Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Project Goals</CardTitle>
              <CardDescription>
                What do you want to achieve with your website?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                {goalOptions.map((goal) => (
                  <div key={goal} className="flex items-center space-x-2">
                    <Checkbox
                      id={goal}
                      checked={goals.includes(goal)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setGoals([...goals, goal]);
                        } else {
                          setGoals(goals.filter((g) => g !== goal));
                        }
                      }}
                    />
                    <Label htmlFor={goal} className="text-sm font-normal cursor-pointer">
                      {goal}
                    </Label>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Special Notes</CardTitle>
              <CardDescription>
                Any specific requirements or requests?
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Tell us more about your vision, specific features you need, or any other requirements..."
                rows={4}
              />
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.push(`/onboarding/${workspaceId}/business-info`)}
            >
              Back
            </Button>
            <Button type="submit">
              Continue
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}