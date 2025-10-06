// emails/invitation.tsx
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

interface InvitationEmailProps {
  workspaceName: string;
  inviteLink: string;
  senderName: string;
  recipientEmail: string;
}

export default function InvitationEmail({
  workspaceName,
  inviteLink,
  senderName,
  recipientEmail,
}: InvitationEmailProps) {
  const previewText = `You're invited to collaborate on ${workspaceName}`;

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Header */}
          <Section style={header}>
            <Heading style={h1}>Telera</Heading>
          </Section>

          {/* Main Content */}
          <Section style={content}>
            <Heading style={h2}>
              You're invited to collaborate!
            </Heading>
            
            <Text style={paragraph}>
              Hi there,
            </Text>
            
            <Text style={paragraph}>
              {senderName} has invited you to collaborate on <strong>{workspaceName}</strong> in Telera's client portal.
            </Text>

            <Section style={workspaceBox}>
              <Text style={workspaceTitle}>Workspace</Text>
              <Text style={workspaceNameStyle}>{workspaceName}</Text>
            </Section>

            <Text style={paragraph}>
              Click the button below to accept the invitation and get started with the onboarding process:
            </Text>

            <Section style={buttonContainer}>
              <Button style={button} href={inviteLink}>
                Accept Invitation
              </Button>
            </Section>

            <Text style={smallText}>
              Or copy and paste this link into your browser:
            </Text>
            <Link href={inviteLink} style={link}>
              {inviteLink}
            </Link>

            <Hr style={hr} />

            <Heading style={h3}>What happens next?</Heading>
            
            <Section style={featuresContainer}>
              <div style={feature}>
                <Text style={featureTitle}>1. Complete Onboarding</Text>
                <Text style={featureDescription}>
                  Share your business details and preferences
                </Text>
              </div>
              
              <div style={feature}>
                <Text style={featureTitle}>2. Choose Your Theme</Text>
                <Text style={featureDescription}>
                  Select from our professional workspace themes
                </Text>
              </div>
              
              <div style={feature}>
                <Text style={featureTitle}>3. Start Collaborating</Text>
                <Text style={featureDescription}>
                  Access notes, tasks, canvas, and file sharing
                </Text>
              </div>
            </Section>

            <Hr style={hr} />

            <Text style={footer}>
              This invitation was sent to {recipientEmail}. If you weren't expecting this invitation, you can safely ignore this email.
            </Text>
            
            <Text style={footer}>
              Need help? Contact us at{" "}
              <Link href="mailto:support@telera.tech" style={link}>
                support@telera.tech
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// Styles
const main = {
  backgroundColor: "#f6f9fc",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "20px 0 48px",
  marginBottom: "64px",
  borderRadius: "8px",
  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
};

const header = {
  padding: "32px 32px 0",
  textAlign: "center" as const,
};

const content = {
  padding: "0 32px",
};

const h1 = {
  color: "#333",
  fontSize: "28px",
  fontWeight: "bold",
  margin: "0",
  padding: "0",
  textAlign: "center" as const,
};

const h2 = {
  color: "#333",
  fontSize: "24px",
  fontWeight: "600",
  margin: "32px 0 16px",
  padding: "0",
  textAlign: "center" as const,
};

const h3 = {
  color: "#333",
  fontSize: "18px",
  fontWeight: "600",
  margin: "24px 0 16px",
  padding: "0",
};

const paragraph = {
  color: "#525252",
  fontSize: "16px",
  lineHeight: "24px",
  margin: "16px 0",
};

const workspaceBox = {
  backgroundColor: "#f4f4f5",
  borderRadius: "8px",
  padding: "16px",
  margin: "24px 0",
};

const workspaceTitle = {
  color: "#71717a",
  fontSize: "12px",
  fontWeight: "600",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  margin: "0 0 8px",
};

const workspaceNameStyle = {
  color: "#18181b",
  fontSize: "20px",
  fontWeight: "600",
  margin: "0",
};

const buttonContainer = {
  textAlign: "center" as const,
  margin: "32px 0",
};

const button = {
  backgroundColor: "#18181b",
  borderRadius: "6px",
  color: "#fff",
  fontSize: "16px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "12px 24px",
};

const link = {
  color: "#2563eb",
  textDecoration: "underline",
  fontSize: "14px",
};

const smallText = {
  color: "#71717a",
  fontSize: "14px",
  lineHeight: "20px",
  margin: "16px 0 8px",
};

const hr = {
  borderColor: "#e4e4e7",
  margin: "32px 0",
};

const featuresContainer = {
  margin: "24px 0",
};

const feature = {
  marginBottom: "16px",
};

const featureTitle = {
  color: "#18181b",
  fontSize: "14px",
  fontWeight: "600",
  margin: "0 0 4px",
};

const featureDescription = {
  color: "#71717a",
  fontSize: "14px",
  margin: "0",
};

const footer = {
  color: "#71717a",
  fontSize: "12px",
  lineHeight: "16px",
  margin: "8px 0",
};