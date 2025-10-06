// app/w/[slug]/page.tsx
"use client";

import { useRouter } from "next/navigation";
import { use, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";

export default function WorkspacePage({ params }: { params: Promise<{ slug: string }> }) {
  const router = useRouter();
  const slug = use(params).slug;
  
  useEffect(() => {
    const timer = setTimeout(() => {
      router.push(`/w/${slug}/notes`);
    }, 1500); // Show loading for 1.5 seconds
    
    return () => clearTimeout(timer);
  }, [router, slug]);
  
  return (
    <div className="container mx-auto py-8">
      <div className="mb-6 flex justify-between items-center">
        <div>
          <Skeleton className="h-9 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <Skeleton className="h-10 w-32" />
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, () => (
          <div key={Math.random()} className="border rounded-lg p-6">
            <Skeleton className="h-5 w-32 mb-2" />
            <Skeleton className="h-4 w-48" />
          </div>
        ))}
      </div>
    </div>
  );
}