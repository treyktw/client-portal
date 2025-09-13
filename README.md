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
