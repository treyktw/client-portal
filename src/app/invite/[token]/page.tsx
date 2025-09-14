// app/invite/[token]/page.tsx
"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Building2, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Mail,
  ArrowRight,
  Sparkles,
  Users,
  Shield,
  Rocket
} from "lucide-react";

export default function InvitePage({ 
  params 
}: { 
  params: Promise<{ token: string }> 
}) {
  const router = useRouter();
  const { token } = use(params);
  const { user, isLoaded } = useUser();
  const [status, setStatus] = useState<"loading" | "valid" | "invalid" | "accepting" | "accepted">("loading");
  const [error, setError] = useState<string | null>(null);
  
  const acceptInvite = useMutation(api.workspaces.acceptInvite);
  
  // Get workspace by token to display info
  const workspace = useQuery(api.workspaces.getWorkspaceByInviteToken, {
    inviteToken: token,
  });

  console.log(user?.emailAddresses[0]?.emailAddress);

  useEffect(() => {
    if (!isLoaded) return;
    
    if (!user) {
      // Store token in session storage to redirect after sign-in
      sessionStorage.setItem("pendingInviteToken", token);
      router.push(`/sign-in?redirect=/invite/${token}`);
      return;
    }

    if (workspace === undefined) {
      // Still loading
      return;
    }

    if (workspace === null) {
      setStatus("invalid");
      setError("This invite link is invalid or has expired.");
      return;
    }

    // Check if user email matches invite
    const userEmail = user.emailAddresses[0]?.emailAddress;
    if (workspace.invitedEmail !== userEmail) {
      setStatus("invalid");
      setError(`This invite was sent to ${workspace.invitedEmail}. Please sign in with that email address.`);
      return;
    }

    // Check if already accepted
    if (workspace.inviteStatus === "completed") {
      router.push(`/w/${workspace.slug}`);
      return;
    }

    if (workspace.inviteStatus === "accepted") {
      router.push(`/onboarding/${workspace._id}/welcome`);
      return;
    }

    setStatus("valid");
  }, [user, isLoaded, workspace, router, token]);

  const handleAcceptInvite = async () => {
    if (!workspace) return;
    
    setStatus("accepting");
    
    try {
      await acceptInvite({ inviteToken: token });
      setStatus("accepted");
      
      // Redirect to onboarding
      setTimeout(() => {
        router.push(`/onboarding/${workspace._id}/welcome`);
      }, 1500);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Failed to accept invite");
      setStatus("valid");
    }
  };

  if (status === "loading" || !isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center py-8">
            <Loader2 className="w-8 h-8 animate-spin mb-4" />
            <p className="text-sm text-muted-foreground">Validating invite...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "invalid") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-destructive/10 mb-4">
              <AlertCircle className="w-6 h-6 text-destructive" />
            </div>
            <CardTitle>Invalid Invite</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => router.push("/admin")} 
              className="w-full"
              variant="outline"
            >
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (status === "accepted") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center py-8">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/20 mb-4">
              <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Invite Accepted!</h3>
            <p className="text-sm text-muted-foreground text-center">
              Redirecting you to complete setup...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2">Welcome to Telera</h1>
          <p className="text-lg text-muted-foreground">
            You've been invited to collaborate on a project
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Invite Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="w-5 h-5" />
                Your Invitation
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {workspace && (
                <>
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Workspace</p>
                    <p className="font-semibold text-lg flex items-center gap-2">
                      <Building2 className="w-4 h-4" />
                      {workspace.name}
                    </p>
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Invited Email</p>
                    <p className="font-mono text-sm">{workspace.invitedEmail}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Status</p>
                    <Badge variant="secondary">
                      Pending Acceptance
                    </Badge>
                  </div>

                  {user && (
                    <Alert>
                      <CheckCircle2 className="w-4 h-4" />
                      <AlertDescription>
                        Signed in as {user.emailAddresses[0]?.emailAddress}
                      </AlertDescription>
                    </Alert>
                  )}
                </>
              )}

              <Button 
                onClick={handleAcceptInvite}
                disabled={status === "accepting"}
                className="w-full"
                size="lg"
              >
                {status === "accepting" ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Accepting...
                  </>
                ) : (
                  <>
                    Accept Invitation
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* What's Next */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5" />
                What Happens Next
              </CardTitle>
              <CardDescription>
                After accepting, you'll set up your workspace
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-semibold">1</span>
                  </div>
                  <div>
                    <p className="font-medium">Complete Onboarding</p>
                    <p className="text-sm text-muted-foreground">
                      Share your business details and preferences
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-semibold">2</span>
                  </div>
                  <div>
                    <p className="font-medium">Choose Your Theme</p>
                    <p className="text-sm text-muted-foreground">
                      Select from our professional workspace themes
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <span className="text-sm font-semibold">3</span>
                  </div>
                  <div>
                    <p className="font-medium">Start Collaborating</p>
                    <p className="text-sm text-muted-foreground">
                      Access notes, tasks, canvas, and file sharing
                    </p>
                  </div>
                </div>

                <Separator />

                <div className="grid grid-cols-3 gap-4 pt-2">
                  <div className="text-center">
                    <Users className="w-6 h-6 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">Real-time Collaboration</p>
                  </div>
                  <div className="text-center">
                    <Shield className="w-6 h-6 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">Secure & Private</p>
                  </div>
                  <div className="text-center">
                    <Rocket className="w-6 h-6 mx-auto mb-1 text-muted-foreground" />
                    <p className="text-xs text-muted-foreground">Fast & Simple</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}