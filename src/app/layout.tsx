// app/layout.tsx
import { Architects_Daughter, Fira_Code, Geist_Mono, Inter, Montserrat } from "next/font/google";
import "./globals.css";

import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import ConvexClientProvider from "@/providers/ConvexClientProvider";
import TRPCProvider from "@/providers/TRPCProvider";
import { NavigationProgress } from "@/components/NavigationProgress";
import MobileCheck from "@/components/MobileCheck";
import { Toaster } from "@/components/ui/sonner";

const firaCode = Fira_Code({
  variable: "--font-fira-code",
  subsets: ["latin"],
});

const architectsDaughter = Architects_Daughter({
  variable: "--font-architects-daughter",
  subsets: ["latin"],
  weight: "400",
});

// Graphite theme fonts
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  subsets: ["latin"],
});

// Mono theme font
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Telera Client Portal",
  description: "Collaborative workspace for project management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${architectsDaughter.variable} ${firaCode.variable} ${inter.variable} ${montserrat.variable} ${geistMono.variable} antialiased`}
      >
        <ClerkProvider>
          <TRPCProvider>
            <ConvexClientProvider>
              <NavigationProgress />
              <MobileCheck>
                {children}
                <Toaster />
              </MobileCheck>
            </ConvexClientProvider>
          </TRPCProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}