// app/dashboard/layout.tsx
"use client";

import { ThemeProvider } from "@/providers/theme-provider";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider defaultTheme="notebook" defaultDarkMode={false}>
      {children}
    </ThemeProvider>
  );
}