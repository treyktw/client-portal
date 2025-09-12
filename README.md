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
│  ├─ crons.ts
│  ├─ files.ts
│  ├─ folders.ts
│  ├─ notes.ts
│  ├─ notifications.ts
│  ├─ payments.ts
│  ├─ README.md
│  ├─ schema.ts
│  ├─ tasks.ts
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
│  │  ├─ invitation.tsx
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
│  │  │  ├─ validate-email/
│  │  │  │  └─ route.ts
│  │  │  └─ validate-website/
│  │  │     └─ route.ts
│  │  ├─ client-redirect/
│  │  │  └─ page.tsx
│  │  ├─ dashboard/
│  │  │  ├─ payment/
│  │  │  │  ├─ loading.tsx
│  │  │  │  └─ page.tsx
│  │  │  ├─ layout.tsx
│  │  │  ├─ loading.tsx
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
│  │  ├─ client/
│  │  │  └─ ClientSettingsModal.tsx
│  │  ├─ dashboard/
│  │  │  ├─ CreateWorkspaceModal.tsx
│  │  │  └─ WorkspaceSettingsModal.tsx
│  │  ├─ editor/
│  │  │  ├─ BlockNoteEditor.tsx
│  │  │  └─ EditorToolbar.tsx
│  │  ├─ files/
│  │  │  ├─ FileCard.tsx
│  │  │  ├─ FilePreviewDialog.tsx
│  │  │  ├─ FolderCard.tsx
│  │  │  └─ FolderDialog.tsx
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
│  │  ├─ NavigationProgress.tsx
│  │  └─ ValidationForm.tsx
│  ├─ emails/
│  │  └─ invitation.tsx
│  ├─ hooks/
│  │  ├─ use-mobile.ts
│  │  └─ useDebounce.ts
│  ├─ lib/
│  │  ├─ effects/
│  │  │  ├─ api.ts
│  │  │  ├─ errors.ts
│  │  │  └─ sync.ts
│  │  ├─ routers/
│  │  │  ├─ index.ts
│  │  │  ├─ invitations.ts
│  │  │  └─ validation.ts
│  │  ├─ templates/
│  │  │  └─ general-note-template.md
│  │  ├─ arcjet.ts
│  │  ├─ canvasSyncEngine.ts
│  │  ├─ fileUtils.tsx
│  │  ├─ noteTemplates.ts
│  │  ├─ taskSyncEngine.ts
│  │  ├─ trpc-client.ts
│  │  ├─ trpc.ts
│  │  └─ utils.ts
│  ├─ providers/
│  │  ├─ ConvexClientProvider.tsx
│  │  ├─ theme-provider.tsx
│  │  └─ TRPCProvider.tsx
│  ├─ instrumentation-client.ts
│  ├─ instrumentation.ts
│  └─ middleware.ts
├─ .env.local
├─ .env.sentry-build-plugin
├─ .gitignore
├─ biome.json
├─ components.json
├─ next-env.d.ts
├─ next.config.ts
├─ package.json
├─ pnpm-lock.yaml
├─ postcss.config.mjs
├─ README.md
├─ sentry.edge.config.ts
├─ sentry.server.config.ts
└─ tsconfig.json
