// components/onboarding/sidebar.tsx
"use client";

import { useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { 
  Building2, 
  Target, 
  Palette, 
  FileImage, 
  Shield, 
  CheckCircle2,
  ChevronLeft,
  Circle
} from "lucide-react";
import { Button } from "../ui/button";
import Link from "next/link";

interface OnboardingStep {
  id: number;
  label: string;
  icon: React.ElementType;
  path: string;
  description: string;
}

const steps: OnboardingStep[] = [
  {
    id: 1,
    label: "Welcome",
    icon: Building2,
    path: "welcome",
    description: "Get started with your workspace"
  },
  {
    id: 2,
    label: "Business Info",
    icon: Building2,
    path: "business-info",
    description: "Tell us about your business"
  },
  {
    id: 3,
    label: "Goals",
    icon: Target,
    path: "goals",
    description: "What do you want to achieve?"
  },
  {
    id: 4,
    label: "Theme",
    icon: Palette,
    path: "theme",
    description: "Choose your workspace style"
  },
  {
    id: 5,
    label: "Assets",
    icon: FileImage,
    path: "assets",
    description: "Upload your brand materials"
  },
  {
    id: 6,
    label: "Policies",
    icon: Shield,
    path: "policies",
    description: "Configure privacy settings"
  },
  {
    id: 7,
    label: "Review",
    icon: CheckCircle2,
    path: "review",
    description: "Review and confirm"
  }
];

interface OnboardingSidebarProps {
  currentStep: number;
  workspaceId: string;
}

export default function OnboardingSidebar({ 
  currentStep, 
  workspaceId 
}: OnboardingSidebarProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleStepClick = (step: OnboardingStep) => {
    // Only allow clicking on completed steps or the current step
    if (step.id <= currentStep) {
      router.push(`/onboarding/${workspaceId}/${step.path}`);
    }
  };

  const handleGoBack = () => {
    router.push("/admin");
  };

  return (
    <aside className="w-80 bg-sidebar border border-sidebar-border flex flex-col rounded-2xl ml-4 mt-4 mb-4">
      {/* Header */}
      <div className="p-6 border-b border-sidebar-border">
        <Button
          onClick={handleGoBack}
          className="flex items-center gap-2 text-sm text-white hover:text-white transition-colors mb-4"
        >
          <ChevronLeft className="w-4 h-4" />
          Go back
        </Button>
        <h2 className="text-2xl font-bold">Setup Your Workspace</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Complete these steps to get started
        </p>
      </div>

      {/* Steps */}
      <nav className="flex-1 p-6">
        <div className="space-y-6">
          {steps.map((step) => {
            const isActive = pathname?.includes(step.path);
            const isCompleted = step.id < currentStep;
            const isAccessible = step.id <= currentStep;

            return (
              <Button
                key={step.id}
                onClick={() => handleStepClick(step)}
                disabled={!isAccessible}
                className={cn(
                  "w-full flex items-start gap-2 p-2.5 rounded-lg transition-all text-left group",
                  isActive && "bg-sidebar-accent text-sidebar-accent-foreground",
                  !isActive && isAccessible && "hover:bg-sidebar-accent",
                  !isAccessible && "opacity-50 cursor-not-allowed"
                )}
              >
                <div className="relative flex items-center mb-2 ">
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-accent group-hover:text-white " />
                  ) : (
                    <div className={cn(
                      "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                      isActive ? "border-primary bg-primary" : "border-muted-foreground bg-accent",
                      !isAccessible && "border-muted bg-accent"
                    )}>
                      {isActive && (
                        <Circle className="w-2 h-2 fill-primary-accent text-primary-foreground" />
                      )}
                    </div>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "font-medium transition-colors",
                      isActive && "text-sidebar-accent-foreground",
                      !isActive && isAccessible && "text-accent group-hover:text-accent-foreground",
                      !isAccessible && "text-accent"
                    )}>
                      {step.label}
                    </span>
                  </div>
                  <p className={cn(
                    "text-sm mt-1 mb-2",
                    isActive ? "text-sidebar-accent-foreground/80" : "text-muted-foreground"
                  )}>
                    {step.description}
                  </p>
                </div>
              </Button>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="p-6 border-t border-sidebar-border">
        <div className="text-sm text-muted-foreground">
          Step {currentStep} of {steps.length}
        </div>
        <div className="w-full bg-muted rounded-full h-2 mt-2">
          <div 
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${(currentStep / steps.length) * 100}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          This usually takes less than 10 minutes
        </p>
      </div>

      {/* Help Link */}
      <div className="p-6 pt-0">
        <Link 
          href="#" 
          className="text-sm text-primary hover:text-primary/80 transition-colors"
        >
          Need help?
        </Link>
      </div>
    </aside>
  );
}