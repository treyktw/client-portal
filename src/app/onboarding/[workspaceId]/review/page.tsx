// app/onboarding/[workspaceId]/review/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { 
  CheckCircle2, 
  Building2, 
  Target, 
  Palette, 
  FileImage, 
  Shield,
  Edit,
  Loader2
} from "lucide-react";

export default function ReviewPage() {
  const router = useRouter();
  const params = useParams();
  const workspaceId = params.workspaceId as string;
  
  const workspace = useQuery(api.workspaces.getWorkspaceById, {
    workspaceId: workspaceId as Id<"workspaces">,
  });
  
  const updateStep = useMutation(api.workspaces.updateOnboardingStep);
  const [completing, setCompleting] = useState(false);

  const handleComplete = async () => {
    setCompleting(true);
    
    await updateStep({
      workspaceId: workspaceId as Id<"workspaces">,
      step: 8,
      fieldToUpdate: "complete",
      data: {},
    });
    
    // Generate project brief here if needed
    // await generateProjectBrief({ workspaceId });
    
    router.push(`/w/${workspace?.slug}`);
  };

  if (!workspace) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const sections = [
    {
      title: "Business Information",
      icon: Building2,
      path: "business-info",
      data: workspace.businessInfo,
      items: [
        { label: "Business Name", value: workspace.businessInfo?.businessName },
        { label: "Contact Person", value: workspace.businessInfo?.contactPerson },
        { label: "Email", value: workspace.businessInfo?.email },
        { label: "Phone", value: workspace.businessInfo?.phone },
        { label: "Website", value: workspace.businessInfo?.website },
      ].filter(item => item.value),
    },
    {
      title: "Goals & Services",
      icon: Target,
      path: "goals",
      data: workspace.goals,
      items: [
        { label: "Services", value: workspace.goals?.services?.join(", ") },
        { label: "Main Goals", value: workspace.goals?.mainGoals?.join(", ") },
        { label: "Notes", value: workspace.goals?.specialNotes },
      ].filter(item => item.value),
    },
    {
      title: "Theme",
      icon: Palette,
      path: "theme",
      data: { theme: workspace.theme, darkMode: workspace.darkMode },
      items: [
        { label: "Selected Theme", value: workspace.theme },
        { label: "Dark Mode", value: workspace.darkMode ? "Enabled" : "Disabled" },
      ],
    },
    {
      title: "Brand Assets",
      icon: FileImage,
      path: "assets",
      data: workspace.brandAssets,
      items: workspace.brandAssets?.uploadLater 
        ? [{ label: "Status", value: "Will upload later" }]
        : [
            { label: "Logo", value: workspace.brandAssets?.logoId ? "Uploaded" : "Not provided" },
            { label: "Primary Color", value: workspace.brandAssets?.primaryColor },
            { label: "Secondary Color", value: workspace.brandAssets?.secondaryColor },
          ].filter(item => item.value),
    },
    {
      title: "Policies",
      icon: Shield,
      path: "policies",
      data: workspace.policies,
      items: [
        { label: "Analytics", value: workspace.policies?.enableAnalytics ? "Enabled" : "Disabled" },
        { label: "Notifications", value: workspace.policies?.enableNotifications ? "Enabled" : "Disabled" },
        { label: "Data Consent", value: workspace.policies?.dataConsent ? "Confirmed" : "Not confirmed" },
      ],
    },
  ];

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 text-center">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-10 h-10 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            Review & Confirm
          </h1>
          <p className="text-muted-foreground">
            Please review your details below. Once you confirm, we'll create your workspace 
            and generate your initial project brief document.
          </p>
        </div>

        <div className="space-y-4 mb-8">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <Card key={section.title}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <Icon className="w-5 h-5" />
                      {section.title}
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => router.push(`/onboarding/${workspaceId}/${section.path}`)}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {section.items.length > 0 ? (
                    <dl className="grid gap-2">
                      {section.items.map((item) => (
                        <div key={item.label} className="flex flex-col sm:flex-row sm:gap-4">
                          <dt className="text-sm font-medium text-muted-foreground sm:w-1/3">
                            {item.label}:
                          </dt>
                          <dd className="text-sm">{item.value}</dd>
                        </div>
                      ))}
                    </dl>
                  ) : (
                    <p className="text-sm text-muted-foreground">No information provided</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Completion Box */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <h3 className="text-lg font-semibold">Ready to Get Started?</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                By confirming, you'll complete the onboarding process. 
                We'll set up your workspace with all the features you need to collaborate effectively.
              </p>
              <div className="flex gap-3 justify-center">
                <Button
                  variant="outline"
                  onClick={() => router.push(`/onboarding/${workspaceId}/policies`)}
                  disabled={completing}
                >
                  Back
                </Button>
                <Button
                  size="lg"
                  onClick={handleComplete}
                  disabled={completing}
                  className="min-w-[200px]"
                >
                  {completing ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Setting up...
                    </>
                  ) : (
                    "Confirm & Complete Setup"
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}