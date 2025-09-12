// app/onboarding/[workspaceId]/policies/page.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { Shield, BarChart3, Bell, Lock } from "lucide-react";

export default function PoliciesPage() {
  const router = useRouter();
  const params = useParams();
  const workspaceId = params.workspaceId as string;
  
  const updateStep = useMutation(api.workspaces.updateOnboardingStep);
  
  const [policies, setPolicies] = useState({
    enableAnalytics: true,
    enableNotifications: true,
    dataConsent: false,
  });

  const handleSubmit = async () => {
    await updateStep({
      workspaceId: workspaceId as Id<"workspaces">,
      step: 7,
      fieldToUpdate: "policies",
      data: policies,
    });
    
    router.push(`/onboarding/${workspaceId}/review`);
  };

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight mb-2">
            Policies & Tracking
          </h1>
          <p className="text-muted-foreground">
            We'll configure optional services like analytics and notifications. 
            We also need your confirmation on how your website data should be handled.
          </p>
        </div>

        <div className="space-y-6">
          {/* Analytics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Analytics
              </CardTitle>
              <CardDescription>
                Track user activity on your site to understand visitor behavior
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="analytics">Enable Analytics</Label>
                  <p className="text-sm text-muted-foreground">
                    We'll use privacy-focused analytics to track page views, visitor counts, 
                    and general usage patterns. No personal data is collected.
                  </p>
                </div>
                <Switch
                  id="analytics"
                  checked={policies.enableAnalytics}
                  onCheckedChange={(checked) => 
                    setPolicies({ ...policies, enableAnalytics: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Notifications */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="w-5 h-5" />
                Notifications
              </CardTitle>
              <CardDescription>
                Get notified about important events
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="notifications">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive email alerts for new form submissions, task updates, 
                    and important project milestones.
                  </p>
                </div>
                <Switch
                  id="notifications"
                  checked={policies.enableNotifications}
                  onCheckedChange={(checked) => 
                    setPolicies({ ...policies, enableNotifications: checked })
                  }
                />
              </div>
            </CardContent>
          </Card>

          {/* Data Consent */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Lock className="w-5 h-5" />
                Data Handling Consent
              </CardTitle>
              <CardDescription>
                Important for healthcare and sensitive industries
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm">
                    <strong>Important Notice:</strong> By enabling this, you confirm that:
                  </p>
                  <ul className="text-sm text-muted-foreground mt-2 space-y-1 list-disc list-inside">
                    <li>No sensitive data or PHI (Protected Health Information) will be stored in the CMS</li>
                    <li>All data handling complies with relevant regulations (GDPR, HIPAA, etc.)</li>
                    <li>You have necessary consents for any user data collection</li>
                    <li>You understand our data retention and processing policies</li>
                  </ul>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="consent">I confirm and consent</Label>
                    <p className="text-sm text-muted-foreground">
                      Required to proceed with setup
                    </p>
                  </div>
                  <Switch
                    id="consent"
                    checked={policies.dataConsent}
                    onCheckedChange={(checked) => 
                      setPolicies({ ...policies, dataConsent: checked })
                    }
                    className="board-1 border-accent-foreground"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Info Box */}
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-4">
            <div className="flex gap-3">
              <Shield className="w-5 h-5 text-primary mt-0.5" />
              <div className="space-y-1">
                <p className="text-sm font-medium">Your Privacy is Our Priority</p>
                <p className="text-sm text-muted-foreground">
                  All settings can be changed later in your workspace settings. 
                  We follow industry best practices for data security and privacy.
                </p>
              </div>
            </div>
          </div>

          <div className="flex justify-between">
            <Button
              variant="outline"
              onClick={() => router.push(`/onboarding/${workspaceId}/assets`)}
            >
              Back
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!policies.dataConsent}
            >
              Continue to Review
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}