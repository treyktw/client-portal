// app/sign-in/[[...sign-in]]/page.tsx
import { SignIn } from "@clerk/nextjs";
import Image from "next/image";
// import Image from "next/image";

export default function SignInPage() {
  return (
    <div className="min-h-screen flex">
      {/* Left side - Branding/Image */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary/10 via-accent/5 to-background relative overflow-hidden">
        <div className="absolute inset-0 bg-grid-pattern opacity-5" />
        <div className="relative z-10 flex flex-col justify-center items-center w-full p-12">
          <div className="text-center space-y-6 max-w-md">
            <div className="w-24 h-24 mx-auto bg-primary/10 rounded-2xl flex items-center justify-center">
              <Image src="/telera-portal-logo.png" alt="Telera Portal Logo" width={96} height={96} />
            </div>
            <h1 className="text-4xl font-bold tracking-tight">
              Welcome to Telera Portal
            </h1>
            <p className="text-muted-foreground text-lg">
              Your collaborative workspace for project management and client success.
            </p>
            <div className="grid grid-cols-2 gap-4 pt-8">
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">100%</div>
                <div className="text-sm text-muted-foreground">Secure</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-primary">24/7</div>
                <div className="text-sm text-muted-foreground">Available</div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute top-20 left-20 w-72 h-72 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-20 w-96 h-96 bg-accent/20 rounded-full blur-3xl" />
      </div>

      {/* Right side - Sign In */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          <div className="text-center lg:hidden">
            <h1 className="text-3xl font-bold tracking-tight mb-2">
              Welcome to Telera Portal
            </h1>
            <p className="text-muted-foreground">
              Sign in to access your workspace
            </p>
          </div>

          <SignIn
            appearance={{
              elements: {
                rootBox: "w-full",
                card: "shadow-none p-0 w-full",
                headerTitle: "shown",
                headerSubtitle: "shown",
                socialButtonsBlockButton: 
                  "border border-input bg-background hover:bg-accent hover:text-accent-foreground transition-colors",
                formButtonPrimary: 
                  "bg-primary text-primary-foreground hover:bg-primary/90 transition-colors",
                formFieldInput: 
                  "bg-background border-input",
                footerActionLink: 
                  "text-primary hover:text-primary/80 transition-colors",
                identityPreviewEditButton:
                  "text-primary hover:text-primary/80",
                formFieldLabel: "text-foreground",
                dividerLine: "bg-border",
                dividerText: "text-muted-foreground",
              },
              layout: {
                socialButtonsPlacement: "top",
                socialButtonsVariant: "blockButton",
              },
            }}
            redirectUrl="/client-redirect"
          />
        </div>
      </div>
    </div>
  );
}