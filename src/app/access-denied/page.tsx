// app/access-denied/page.tsx
"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useClerk } from "@clerk/clerk-react";
import { ShieldOff, Home, Mail, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function AccessDenied() {
  const router = useRouter();
  const { signOut } = useClerk();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-muted/20">
      <div className="w-full max-w-md">
        <Card className="border-2">
          <CardHeader className="text-center pb-2">
            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-destructive/10 mb-4 mx-auto">
              <ShieldOff className="w-8 h-8 text-destructive" />
            </div>
            <CardTitle className="text-2xl">Access Restricted</CardTitle>
            <CardDescription className="text-base mt-2">
              You don't have permission to access this resource
            </CardDescription>
          </CardHeader>
          
          <CardContent className="space-y-4 pt-4">
            <div className="p-4 bg-muted/50 rounded-lg border">
              <h3 className="text-sm font-medium mb-2">This might be because:</h3>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                <li className="flex items-start">
                  <span className="text-primary mr-2 mt-0.5">•</span>
                  <span>You haven't been invited to a workspace yet</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2 mt-0.5">•</span>
                  <span>Your invitation is still pending acceptance</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2 mt-0.5">•</span>
                  <span>Your account doesn't have the required permissions</span>
                </li>
                <li className="flex items-start">
                  <span className="text-primary mr-2 mt-0.5">•</span>
                  <span>The workspace has been removed or archived</span>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <h3 className="text-sm font-medium">What can you do?</h3>
              <div className="grid grid-cols-2 gap-2">

              <Button 
                onClick={() => router.back()} 
                variant="outline" 
                className="w-full"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Go Back
              </Button>

              <Button className="w-full" onClick={() => signOut()} variant="outline">
                Sign Out
              </Button>
              </div>
              
              <Button asChild className="w-full">
                <Link href="/">
                  <Home className="w-4 h-4 mr-2" />
                  Go to Home
                </Link>
              </Button>
              
              <Button asChild variant="secondary" className="w-full">
                <Link href="mailto:support@telera.tech">
                  <Mail className="w-4 h-4 mr-2" />
                  Contact Support
                </Link>
              </Button>


            </div>

            <div className="pt-2 border-t">
              <p className="text-xs text-center text-muted-foreground">
                If you believe this is an error, please contact your workspace administrator or our support team.
              </p>
            </div>
          </CardContent>
        </Card>
        
        <p className="text-xs text-center text-muted-foreground mt-4">
          Need immediate help? Email us at{" "}
          <Link href="mailto:support@telera.tech" className="text-primary hover:underline">
            support@telera.tech
          </Link>
        </p>
      </div>
    </div>
  );
}