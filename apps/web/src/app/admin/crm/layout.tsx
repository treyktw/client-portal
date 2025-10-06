// app/admin/crm/layout.tsx
"use client";

import type { ReactNode } from "react";

export default function CRMLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="flex h-16 items-center px-6">
          <h1 className="text-xl font-semibold">CRM & Outreach</h1>
        </div>
      </div>
      <main className="flex-1">{children}</main>
    </div>
  );
}