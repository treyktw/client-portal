# Telera Client Portal

A modern, collaborative client portal built with Next.js, featuring real-time collaboration, project management, and comprehensive workspace management for agencies and service providers.

## 🚀 Features

### Core Functionality
- **Multi-tenant Workspace Management** - Create and manage multiple client workspaces
- **Real-time Collaboration** - Live editing with BlockNote editor and Excalidraw integration
- **Role-based Access Control** - Admin and client user roles with appropriate permissions
- **Onboarding Flow** - Guided setup process for new clients
- **File Management** - Upload, organize, and preview files with drag-and-drop support
- **Task Management** - Create, assign, and track tasks with drag-and-drop functionality
- **Note-taking System** - Rich text editor with templates and real-time sync
- **Canvas Collaboration** - Interactive whiteboard for brainstorming and planning

### Advanced Features
- **Email Integration** - Send invitations and notifications via Resend
- **Payment Processing** - Stripe integration for billing and payments
- **Real-time Validation** - Email, website, and address validation with tRPC
- **Security & Rate Limiting** - Arcjet protection for API endpoints
- **Error Handling** - Effect.js for robust error management and retry policies
- **Theme Customization** - Multiple themes (Notebook, Coffee, Mono, Graphite)
- **Responsive Design** - Mobile-first approach with Tailwind CSS

## 🛠 Tech Stack

### Frontend
- **Next.js 15** - React framework with App Router
- **React 19** - Latest React with concurrent features
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **Radix UI** - Accessible component primitives
- **Lucide React** - Beautiful icon library

### Backend & Database
- **Convex** - Real-time backend-as-a-service
- **tRPC** - End-to-end type-safe APIs
- **Zod** - Schema validation

### Authentication & Security
- **Clerk** - Authentication and user management
- **Arcjet** - Rate limiting and bot protection
- **Sentry** - Error monitoring and performance tracking

### Real-time & Collaboration
- **Liveblocks** - Real-time collaboration infrastructure
- **BlockNote** - Rich text editor with collaborative features
- **Excalidraw** - Interactive whiteboard
- **React Query** - Server state management

### Additional Services
- **Resend** - Email delivery service
- **Stripe** - Payment processing
- **Google Places API** - Address autocomplete
- **Effect.js** - Functional error handling and concurrency

## 📁 Project Structure

```
client-portal/
├── convex/                    # Convex backend functions
│   ├── auth.config.ts        # Authentication configuration
│   ├── schema.ts             # Database schema
│   ├── users.ts              # User management
│   ├── workspaces.ts         # Workspace operations
│   ├── notes.ts              # Note management
│   ├── tasks.ts              # Task management
│   ├── files.ts              # File operations
│   └── payments.ts           # Payment processing
├── src/
│   ├── app/                  # Next.js App Router
│   │   ├── (auth)/           # Authentication routes
│   │   ├── dashboard/        # Admin dashboard
│   │   ├── onboarding/       # Client onboarding flow
│   │   ├── w/[slug]/         # Workspace pages
│   │   └── api/              # API routes
│   ├── components/           # React components
│   │   ├── ui/               # Reusable UI components
│   │   ├── dashboard/        # Dashboard-specific components
│   │   ├── editor/           # Editor components
│   │   └── files/            # File management components
│   ├── lib/                  # Utility libraries
│   │   ├── trpc.ts           # tRPC configuration
│   │   ├── arcjet.ts         # Security configuration
│   │   ├── effects/          # Effect.js utilities
│   │   └── templates/        # Note templates
│   └── providers/            # React context providers
└── public/                   # Static assets
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- pnpm (recommended) or npm
- Convex account
- Clerk account
- Resend account (for emails)
- Stripe account (for payments)

### Environment Variables

Create a `.env.local` file with the following variables:

```env
# Convex
CONVEX_DEPLOYMENT=your-convex-deployment-url
NEXT_PUBLIC_CONVEX_URL=your-convex-url

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your-clerk-publishable-key
CLERK_SECRET_KEY=your-clerk-secret-key
CLERK_JWT_ISSUER_DOMAIN=your-clerk-jwt-issuer-domain

# Email Service (Resend)
RESEND_API_KEY=your-resend-api-key

# Payment Processing (Stripe)
STRIPE_SECRET_KEY=your-stripe-secret-key
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
STRIPE_WEBHOOK_SECRET=your-stripe-webhook-secret

# Security (Arcjet)
ARCJET_KEY=your-arcjet-key

# Google Places API
GOOGLE_PLACES_API_KEY=your-google-places-api-key

# Admin User Creation
ADMIN_USER_SECRET=your-admin-secret-key

# Error Monitoring (Sentry)
SENTRY_DSN=your-sentry-dsn
```

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd client-portal
   ```

2. **Install dependencies**
   ```bash
   pnpm install
   ```

3. **Set up Convex**
   ```bash
   npx convex dev
   ```

4. **Run the development server**
   ```bash
   pnpm dev
   ```

5. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

## 🔧 Configuration

### Convex Setup
1. Create a new Convex project
2. Configure the database schema in `convex/schema.ts`
3. Set up authentication with Clerk in `convex/auth.config.ts`
4. Deploy your functions: `npx convex deploy`

### Clerk Authentication
1. Create a Clerk application
2. Configure JWT templates for Convex integration
3. Set up OAuth providers (Google, GitHub, etc.)
4. Configure redirect URLs for your domain

### Email Configuration
1. Set up Resend account
2. Verify your domain
3. Configure email templates in `src/emails/`

### Payment Setup
1. Create Stripe account
2. Set up webhook endpoints
3. Configure products and pricing
4. Test with Stripe test keys

## 📖 Usage

### Admin Workflow
1. **Sign in** as an admin user
2. **Create workspaces** for clients
3. **Send invitations** via email
4. **Monitor progress** through the dashboard
5. **Manage payments** and billing

### Client Workflow
1. **Receive invitation** via email
2. **Complete onboarding** process
3. **Access workspace** with notes, tasks, and files
4. **Collaborate in real-time** with team members
5. **Manage settings** and preferences

### Workspace Features
- **Notes**: Rich text editor with templates
- **Tasks**: Drag-and-drop task management
- **Files**: Upload and organize documents
- **Canvas**: Interactive whiteboard collaboration
- **Settings**: Customize theme and preferences

## 🎨 Theming

The application supports multiple themes:
- **Notebook**: Clean, paper-like interface
- **Coffee**: Warm, professional theme
- **Mono**: Minimalist monochrome design
- **Graphite**: Modern dark theme

Themes can be customized per workspace in the settings.

## 🔒 Security Features

- **Rate Limiting**: API endpoints protected with Arcjet
- **Bot Detection**: Automated bot protection
- **Input Validation**: Zod schema validation
- **Error Handling**: Comprehensive error management with Effect.js
- **Authentication**: Secure user authentication with Clerk
- **Authorization**: Role-based access control

## 📊 Monitoring & Analytics

- **Sentry Integration**: Error tracking and performance monitoring
- **Real-time Logs**: Convex function logging
- **User Analytics**: Workspace usage tracking
- **Payment Analytics**: Stripe dashboard integration

## 🚀 Deployment

### Vercel (Recommended)
1. Connect your GitHub repository to Vercel
2. Configure environment variables
3. Deploy automatically on push

### Other Platforms
The application can be deployed to any platform that supports Next.js:
- Netlify
- Railway
- DigitalOcean App Platform
- AWS Amplify

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit your changes: `git commit -m 'Add amazing feature'`
4. Push to the branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support and questions:
- Create an issue in the GitHub repository
- Check the documentation
- Contact the development team

## 🔄 Changelog

### Version 0.1.0
- Initial release
- Core workspace management
- Real-time collaboration
- Payment integration
- Email notifications
- Security features

---

Built with ❤️ by the Telera team
client-portal/
├─ convex/
│  ├─ _generated/
│  │  ├─ api.d.ts
│  │  ├─ api.js
│  │  ├─ dataModel.d.ts
│  │  ├─ server.d.ts
│  │  └─ server.js
│  ├─ auth.config.ts
│  ├─ canvases.ts
│  ├─ crm.ts
│  ├─ crons.ts
│  ├─ emergencyLogs.ts
│  ├─ files.ts
│  ├─ folders.ts
│  ├─ messagehelpers.ts
│  ├─ messages.ts
│  ├─ milestones.ts
│  ├─ notes.ts
│  ├─ notifications.ts
│  ├─ notificationsystem.ts
│  ├─ payments.ts
│  ├─ README.md
│  ├─ schema.ts
│  ├─ seedTemplate.ts
│  ├─ tasks.ts
│  ├─ threads.ts
│  ├─ tsconfig.json
│  ├─ users.ts
│  └─ workspaces.ts
├─ public/
│  ├─ file.svg
│  ├─ globe.svg
│  ├─ next.svg
│  ├─ telera-portal-logo.png
│  ├─ vercel.svg
│  └─ window.svg
├─ react-email-starter/
│  ├─ emails/
│  │  ├─ static/
│  │  │  ├─ notion-logo.png
│  │  │  ├─ plaid-logo.png
│  │  │  ├─ plaid.png
│  │  │  ├─ stripe-logo.png
│  │  │  ├─ vercel-arrow.png
│  │  │  ├─ vercel-logo.png
│  │  │  ├─ vercel-team.png
│  │  │  └─ vercel-user.png
│  │  ├─ emergency-notification.tsx
│  │  ├─ invitation.tsx
│  │  ├─ new-message.tsx
│  │  ├─ notion-magic-link.tsx
│  │  ├─ plaid-verify-identity.tsx
│  │  ├─ stripe-welcome.tsx
│  │  └─ vercel-invite-user.tsx
│  ├─ package.json
│  ├─ pnpm-lock.yaml
│  ├─ readme.md
│  └─ tsconfig.json
├─ src/
│  ├─ actions/
│  │  └─ invitations.ts
│  ├─ app/
│  │  ├─ (auth)/
│  │  │  └─ sign-in/
│  │  │     └─ [[...sign-in]]/
│  │  │        └─ page.tsx
│  │  ├─ access-denied/
│  │  │  └─ page.tsx
│  │  ├─ admin/
│  │  │  ├─ crm/
│  │  │  │  ├─ [contactId]/
│  │  │  │  │  └─ page.tsx
│  │  │  │  ├─ layout.tsx
│  │  │  │  └─ page.tsx
│  │  │  ├─ messages/
│  │  │  │  └─ page.tsx
│  │  │  ├─ milestones/
│  │  │  │  └─ page.tsx
│  │  │  ├─ payments/
│  │  │  │  ├─ loading.tsx
│  │  │  │  └─ page.tsx
│  │  │  ├─ layout.tsx
│  │  │  ├─ loading.tsx
│  │  │  └─ page.tsx
│  │  ├─ api/
│  │  │  ├─ invitations/
│  │  │  │  └─ send/
│  │  │  │     └─ route.ts
│  │  │  ├─ places-autocomplete/
│  │  │  │  └─ route.ts
│  │  │  ├─ stripe/
│  │  │  │  └─ webhook/
│  │  │  │     └─ route.ts
│  │  │  ├─ trpc/
│  │  │  │  └─ [trpc]/
│  │  │  │     └─ route.ts
│  │  │  ├─ twilio/
│  │  │  │  ├─ emc/
│  │  │  │  │  └─ voice/
│  │  │  │  │     └─ route.ts
│  │  │  │  └─ voice/
│  │  │  │     └─ route.ts
│  │  │  ├─ validate-email/
│  │  │  │  └─ route.ts
│  │  │  ├─ validate-website/
│  │  │  │  └─ route.ts
│  │  │  ├─ webhook/
│  │  │  │  └─ twilio/
│  │  │  │     └─ route.ts
│  │  │  └─ welcome/
│  │  │     └─ sms/
│  │  │        ├─ emc/
│  │  │        │  └─ reply/
│  │  │        │     └─ route.ts
│  │  │        └─ reply/
│  │  │           └─ route.ts
│  │  ├─ client-redirect/
│  │  │  └─ page.tsx
│  │  ├─ invite/
│  │  │  └─ [token]/
│  │  │     └─ page.tsx
│  │  ├─ onboarding/
│  │  │  └─ [workspaceId]/
│  │  │     ├─ assets/
│  │  │     │  └─ page.tsx
│  │  │     ├─ business-info/
│  │  │     │  └─ page.tsx
│  │  │     ├─ goals/
│  │  │     │  └─ page.tsx
│  │  │     ├─ policies/
│  │  │     │  └─ page.tsx
│  │  │     ├─ review/
│  │  │     │  └─ page.tsx
│  │  │     ├─ theme/
│  │  │     │  └─ page.tsx
│  │  │     ├─ welcome/
│  │  │     │  └─ page.tsx
│  │  │     └─ layout.tsx
│  │  ├─ w/
│  │  │  └─ [slug]/
│  │  │     ├─ canvas/
│  │  │     │  └─ page.tsx
│  │  │     ├─ files/
│  │  │     │  └─ page.tsx
│  │  │     ├─ messages/
│  │  │     │  └─ page.tsx
│  │  │     ├─ notes/
│  │  │     │  └─ page.tsx
│  │  │     ├─ payment/
│  │  │     │  └─ page.tsx
│  │  │     ├─ settings/
│  │  │     │  └─ page.tsx
│  │  │     ├─ tasks/
│  │  │     │  └─ page.tsx
│  │  │     ├─ layout.tsx
│  │  │     ├─ loading.tsx
│  │  │     └─ page.tsx
│  │  ├─ favicon.ico
│  │  ├─ global-error.tsx
│  │  ├─ globals.css
│  │  ├─ layout.tsx
│  │  └─ page.tsx
│  ├─ components/
│  │  ├─ admin/
│  │  │  ├─ admin-sidebar.tsx
│  │  │  ├─ AdminSettingsModal.tsx
│  │  │  ├─ CreateWorkspaceModal.tsx
│  │  │  ├─ WorkspaceSelector.tsx
│  │  │  ├─ WorkspaceSettingsModal.tsx
│  │  │  └─ WorkspaceTable.tsx
│  │  ├─ client/
│  │  │  └─ ClientSettingsModal.tsx
│  │  ├─ crm/
│  │  │  ├─ ConsentBadge.tsx
│  │  │  ├─ CreateContactModal.tsx
│  │  │  ├─ CreateWorkspaceModal.tsx
│  │  │  ├─ EditContactModal.tsx
│  │  │  ├─ OutreachComposer.tsx
│  │  │  ├─ QuickOutreachModal.tsx
│  │  │  └─ Timeline.tsx
│  │  ├─ editor/
│  │  │  ├─ BlockNoteEditor.tsx
│  │  │  └─ EditorToolbar.tsx
│  │  ├─ files/
│  │  │  ├─ FileCard.tsx
│  │  │  ├─ FilePreviewDialog.tsx
│  │  │  ├─ FolderCard.tsx
│  │  │  └─ FolderDialog.tsx
│  │  ├─ messages/
│  │  │  ├─ LinkPreview.tsx
│  │  │  ├─ MembersList.tsx
│  │  │  ├─ MessageContent.tsx
│  │  │  ├─ MessageInput.tsx
│  │  │  ├─ MessageItem.tsx
│  │  │  ├─ MessageList.tsx
│  │  │  ├─ RightSidebar.tsx
│  │  │  ├─ ThreadItem.tsx
│  │  │  ├─ ThreadList.tsx
│  │  │  ├─ TypingIndicator.tsx
│  │  │  └─ UnreadBadge.tsx
│  │  ├─ onboarding/
│  │  │  └─ sidebar.tsx
│  │  ├─ task/
│  │  │  └─ TaskEditModal.tsx
│  │  ├─ ui/
│  │  │  ├─ accordion.tsx
│  │  │  ├─ alert-dialog.tsx
│  │  │  ├─ alert.tsx
│  │  │  ├─ aspect-ratio.tsx
│  │  │  ├─ avatar.tsx
│  │  │  ├─ badge.tsx
│  │  │  ├─ breadcrumb.tsx
│  │  │  ├─ button.tsx
│  │  │  ├─ calendar.tsx
│  │  │  ├─ card.tsx
│  │  │  ├─ carousel.tsx
│  │  │  ├─ chart.tsx
│  │  │  ├─ checkbox.tsx
│  │  │  ├─ collapsible.tsx
│  │  │  ├─ command.tsx
│  │  │  ├─ context-menu.tsx
│  │  │  ├─ dialog.tsx
│  │  │  ├─ drawer.tsx
│  │  │  ├─ dropdown-menu.tsx
│  │  │  ├─ form.tsx
│  │  │  ├─ hover-card.tsx
│  │  │  ├─ input-otp.tsx
│  │  │  ├─ input.tsx
│  │  │  ├─ label.tsx
│  │  │  ├─ menubar.tsx
│  │  │  ├─ navigation-menu.tsx
│  │  │  ├─ pagination.tsx
│  │  │  ├─ popover.tsx
│  │  │  ├─ progress.tsx
│  │  │  ├─ radio-group.tsx
│  │  │  ├─ resizable.tsx
│  │  │  ├─ scroll-area.tsx
│  │  │  ├─ select.tsx
│  │  │  ├─ separator.tsx
│  │  │  ├─ sheet.tsx
│  │  │  ├─ sidebar.tsx
│  │  │  ├─ skeleton.tsx
│  │  │  ├─ slider.tsx
│  │  │  ├─ sonner.tsx
│  │  │  ├─ switch.tsx
│  │  │  ├─ table.tsx
│  │  │  ├─ tabs.tsx
│  │  │  ├─ textarea.tsx
│  │  │  ├─ toggle-group.tsx
│  │  │  ├─ toggle.tsx
│  │  │  └─ tooltip.tsx
│  │  ├─ HelpButton.tsx
│  │  ├─ MilestoneOverlay.tsx
│  │  ├─ MobileCheck.tsx
│  │  ├─ NavigationProgress.tsx
│  │  ├─ ValidationForm.tsx
│  │  └─ WelcomeModal.tsx
│  ├─ emails/
│  │  ├─ emergency-notification.tsx
│  │  ├─ invitation.tsx
│  │  └─ new-message.tsx
│  ├─ hooks/
│  │  ├─ use-mobile.ts
│  │  ├─ useAutoTour.ts
│  │  └─ useDebounce.ts
│  ├─ lib/
│  │  ├─ effects/
│  │  │  ├─ api.ts
│  │  │  ├─ errors.ts
│  │  │  └─ sync.ts
│  │  ├─ routers/
│  │  │  ├─ index.ts
│  │  │  ├─ invitations.ts
│  │  │  ├─ notifications.ts
│  │  │  └─ validation.ts
│  │  ├─ templates/
│  │  │  └─ general-note-template.md
│  │  ├─ arcjet.ts
│  │  ├─ canvasSyncEngine.ts
│  │  ├─ emergency-notifications.ts
│  │  ├─ fileUtils.tsx
│  │  ├─ noteTemplates.ts
│  │  ├─ taskSyncEngine.ts
│  │  ├─ trpc-client.ts
│  │  ├─ trpc.ts
│  │  ├─ twilio-utils.ts
│  │  └─ utils.ts
│  ├─ providers/
│  │  ├─ ConvexClientProvider.tsx
│  │  ├─ DriverProvider.tsx
│  │  ├─ theme-provider.tsx
│  │  └─ TRPCProvider.tsx
│  ├─ types/
│  │  ├─ admin.ts
│  │  └─ crm.ts
│  ├─ instrumentation-client.ts
│  ├─ instrumentation.ts
│  └─ middleware.ts
├─ .env.local
├─ .env.sentry-build-plugin
├─ .gitignore
├─ biome.json
├─ components.json
├─ env.twilio.template
├─ filelayout.md
├─ filetree.md
├─ next-env.d.ts
├─ next.config.ts
├─ package.json
├─ pnpm-lock.yaml
├─ postcss.config.mjs
├─ README.md
├─ sentry.edge.config.ts
├─ sentry.server.config.ts
└─ tsconfig.json


mobile 
mobile/
├─ .expo/
│  ├─ devices.json
│  └─ README.md
├─ assets/
│  ├─ fonts/
│  │  ├─ ArchitectsDaughter-Regular.ttf
│  │  ├─ FiraCode-Regular.ttf
│  │  └─ Inter-Regular.ttf
│  ├─ adaptive-icon.png
│  ├─ favicon.png
│  ├─ icon.png
│  └─ splash-icon.png
├─ src/
│  ├─ constants/
│  │  └─ themes.ts
│  ├─ navigation/
│  │  ├─ AuthNavigator.tsx
│  │  ├─ MessagesNavigator.tsx
│  │  ├─ NotesNavigator.tsx
│  │  ├─ OnboardingNavigator.tsx
│  │  ├─ RootNavigator.tsx
│  │  ├─ TabNavigator.tsx
│  │  └─ types.ts
│  ├─ providers/
│  │  ├─ ClerkProvider.tsx
│  │  ├─ ConvexProvider.tsx
│  │  ├─ NotificationProvider.tsx
│  │  └─ ThemeProviders.tsx
│  ├─ screens/
│  │  ├─ auth/
│  │  │  ├─ SignInScreen.tsx
│  │  │  └─ SignUpScreen.tsx
│  │  ├─ files/
│  │  │  └─ FilesScreen.tsx
│  │  ├─ onboarding/
│  │  │  ├─ OnboardingBusinessScreen.tsx
│  │  │  ├─ OnboardingCompleteScreen.tsx
│  │  │  ├─ OnboardingGoalsScreen.tsx
│  │  │  └─ OnBoardingWelcomeScreen.tsx
│  │  ├─ tasks/
│  │  │  └─ TaskScreen.tsx
│  │  ├─ workspace/
│  │  │  └─ WorkspaceSelectScreen.tsx
│  │  ├─ HomeScreen.tsx
│  │  └─ LoadingScreen.tsx
│  ├─ store/
│  │  └─ workspaceStore.tsx
│  └─ App.tsx
├─ .gitignore
├─ app.json
├─ babel.config.js
├─ eas.json
├─ index.ts
├─ metro.config.js
├─ package.json
├─ pnpm-lock.yaml
└─ tsconfig.json

convex/
├─ _generated/
│  ├─ api.d.ts
│  ├─ api.js
│  ├─ dataModel.d.ts
│  ├─ server.d.ts
│  └─ server.js
├─ auth.config.ts
├─ canvases.ts
├─ crm.ts
├─ crons.ts
├─ emergencyLogs.ts
├─ files.ts
├─ folders.ts
├─ messagehelpers.ts
├─ messages.ts
├─ milestones.ts
├─ notes.ts
├─ notifications.ts
├─ notificationsystem.ts
├─ package.json
├─ payments.ts
├─ README.md
├─ schema.ts
├─ seedTemplate.ts
├─ tasks.ts
├─ threads.ts
├─ tsconfig.json
├─ users.ts
└─ workspaces.ts
