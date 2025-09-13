// app/page.tsx - Simplified version
"use client";

import { useEffect, useRef } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function Home() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const currentUser = useQuery(api.users.getCurrentUser);
  const createUser = useMutation(api.users.createOrUpdateUser);
  const hasRedirected = useRef(false);

  // Create/update user on first load
  useEffect(() => {
    if (user && !currentUser && isLoaded) {
      createUser({
        clerkId: user.id,
        email: user.emailAddresses[0].emailAddress,
        name: user.fullName || undefined,
        imageUrl: user.imageUrl || undefined,
      });
    }
  }, [user, currentUser, isLoaded, createUser]);

  useEffect(() => {
    // Prevent multiple redirects
    if (hasRedirected.current) return;
    
    // Wait for everything to load
    if (!isLoaded || currentUser === undefined) return;

    // Not signed in
    if (!user) {
      hasRedirected.current = true;
      router.push("/sign-in");
      return;
    }

    // Admin users go directly to dashboard
    if (currentUser?.role === "admin") {
      hasRedirected.current = true;
      router.push("/dashboard");
      return;
    }

    // All other authenticated users (including clients and new users) 
    // go through client-redirect
    hasRedirected.current = true;
    router.push("/client-redirect");
    
  }, [user, isLoaded, currentUser, router]); // Added router to dependencies

  // Loading state
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted/20">
      <div className="text-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
        <div>
          <h2 className="text-lg font-medium">Welcome to Telera Portal</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Preparing your workspace...
          </p>
        </div>
      </div>
    </div>
  );
}