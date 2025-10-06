// app/onboarding/[workspaceId]/layout.tsx
"use client";

import { use, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "@telera/convex/_generated/api";
import { Id } from "@telera/convex";
import OnboardingSidebar from "@/components/onboarding/sidebar";
import { useUser } from "@clerk/nextjs";
import { ThemeProvider } from "@/providers/theme-provider";

export default function OnboardingLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ workspaceId: string }>;
}) {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  const workspace = useQuery(api.workspaces.getWorkspaceById, {
    workspaceId: use(params).workspaceId as Id<"workspaces">,
  });

  const currentUser = useQuery(api.users.getCurrentUser);

  useEffect(() => {
    if (!isLoaded) return;

    if (!user) {
      router.push("/sign-in");
      return;
    }

    if (workspace === null) {
      router.push("/admin");
      return;
    }

    if (workspace?.onboardingCompleted) {
      router.push(`/w/${workspace.slug}`);
      return;
    }
  }, [workspace, user, isLoaded, router]);

  if (!workspace || !currentUser || !isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center container mx-auto">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <ThemeProvider
      defaultTheme={workspace.theme || "notebook"}
      defaultDarkMode={workspace.darkMode || false}
    >
      <div className="min-h-screen flex">
        <OnboardingSidebar
          currentStep={workspace.onboardingStep}
          workspaceId={use(params).workspaceId}
        />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </ThemeProvider>
  );
}
