import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

interface NewMessageEmailProps {
  workspaceName: string;
  senderName?: string;
  senderAvatar?: string;
  preview?: string;
  portalUrl: string;
  threadName?: string;
  timestamp?: string;
  adminName?: string;
  adminPhone?: string;
}

export default function NewMessageEmail({
  workspaceName,
  senderName = "Someone",
  senderAvatar,
  preview,
  portalUrl,
  threadName,
  timestamp = new Date().toLocaleString(),
  adminName = 'Telera Team',
  adminPhone,
}: NewMessageEmailProps) {
  const previewText = `${senderName} sent a message in ${workspaceName}`;

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
              New message in your workspace
            </Heading>

            {/* Sender Info Box */}
            <Section style={senderBox}>
              <div style={senderInfo}>
                {senderAvatar ? (
                  <Img 
                    src={senderAvatar} 
                    alt={senderName}
                    width={48}
                    height={48}
                    style={avatarImage}
                  />
                ) : (
                  <div style={avatarFallback}>
                    {(senderName || 'U').charAt(0).toUpperCase()}
                  </div>
                )}
                <div style={senderDetails}>
                  <Text style={senderNameStyle}>{senderName}</Text>
                  <Text style={timestampStyle}>{timestamp}</Text>
                </div>
              </div>
            </Section>

            {/* Workspace & Thread Info */}
            <Section style={workspaceBox}>
              <div style={workspaceRow}>
                <Text style={workspaceLabel}>Workspace</Text>
                <Text style={workspaceValue}>{workspaceName}</Text>
              </div>
              {threadName && (
                <>
                  <Hr style={divider} />
                  <div style={workspaceRow}>
                    <Text style={workspaceLabel}>Thread</Text>
                    <Text style={workspaceValue}>{threadName}</Text>
                  </div>
                </>
              )}
            </Section>

            {/* Message Preview */}
            {preview && (
              <Section style={messagePreview}>
                <Text style={messageLabel}>Message Preview</Text>
                <div style={messageContent}>
                  <Text style={messageText}>"{preview}"</Text>
                </div>
              </Section>
            )}

            <Text style={paragraph}>
              Click the button below to view the full conversation and reply:
            </Text>

            <Section style={buttonContainer}>
              <Button style={button} href={portalUrl}>
                View Conversation
              </Button>
            </Section>

            <Text style={smallText}>
              Or copy and paste this link into your browser:
            </Text>
            <Link href={portalUrl} style={link}>
              {portalUrl}
            </Link>

            <Hr style={hr} />

            {/* Admin Contact */}
            <Heading style={h3}>Need help?</Heading>
            <Section style={featuresContainer}>
              <div style={feature}>
                <Text style={featureTitle}>Your Account Manager</Text>
                <Text style={featureDescription}>
                  {adminName}
                  {adminPhone ? ` • ${adminPhone}` : ''}
                </Text>
              </div>
            </Section>

            <Hr style={hr} />

            {/* Quick Actions */}
            <Heading style={h3}>Quick Actions</Heading>
            
            <Section style={featuresContainer}>
              <div style={feature}>
                <Text style={featureTitle}>📨 Reply Directly</Text>
                <Text style={featureDescription}>
                  Jump straight into the conversation
                </Text>
              </div>
              
              <div style={feature}>
                <Text style={featureTitle}>📁 View Files</Text>
                <Text style={featureDescription}>
                  Access any shared documents or attachments
                </Text>
              </div>
              
              <div style={feature}>
                <Text style={featureTitle}>🔔 Manage Notifications</Text>
                <Text style={featureDescription}>
                  Update your notification preferences anytime
                </Text>
              </div>
            </Section>

            <Hr style={hr} />

            <Text style={footer}>
              You're receiving this notification because you're a member of the {workspaceName} workspace.
              To manage your notification preferences, visit your{" "}
              <Link href={`${portalUrl.split('/messages')[0]}/settings`} style={link}>
                workspace settings
              </Link>.
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

// Sender Info Styles
const senderBox = {
  backgroundColor: "#f8f9fa",
  borderRadius: "8px",
  padding: "16px",
  margin: "24px 0",
  borderLeft: "4px solid #18181b",
};

const senderInfo = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
};

const avatarImage = {
  width: "48px",
  height: "48px",
  borderRadius: "50%",
  objectFit: "cover" as const,
};

const avatarFallback = {
  width: "48px",
  height: "48px",
  borderRadius: "50%",
  backgroundColor: "#18181b",
  color: "#ffffff",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontSize: "20px",
  fontWeight: "600",
};

const senderDetails = {
  flex: "1",
};

const senderNameStyle = {
  color: "#18181b",
  fontSize: "16px",
  fontWeight: "600",
  margin: "0 0 4px",
};

const timestampStyle = {
  color: "#71717a",
  fontSize: "13px",
  margin: "0",
};

// Workspace Box Styles
const workspaceBox = {
  backgroundColor: "#f4f4f5",
  borderRadius: "8px",
  padding: "16px",
  margin: "24px 0",
};

const workspaceRow = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  margin: "8px 0",
};

const workspaceLabel = {
  color: "#71717a",
  fontSize: "12px",
  fontWeight: "600",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  margin: "0",
};

const workspaceValue = {
  color: "#18181b",
  fontSize: "15px",
  fontWeight: "500",
  margin: "0",
};

const divider = {
  borderColor: "#e4e4e7",
  margin: "12px 0",
};

// Message Preview Styles
const messagePreview = {
  backgroundColor: "#fefce8",
  borderRadius: "8px",
  padding: "16px",
  margin: "24px 0",
  border: "1px solid #fef3c7",
};

const messageLabel = {
  color: "#92400e",
  fontSize: "11px",
  fontWeight: "600",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  margin: "0 0 8px",
};

const messageContent = {
  backgroundColor: "#ffffff",
  borderRadius: "6px",
  padding: "12px",
  border: "1px solid #fde68a",
};

const messageText = {
  color: "#18181b",
  fontSize: "15px",
  lineHeight: "22px",
  margin: "0",
  fontStyle: "italic",
};

// Button Styles
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
  wordBreak: "break-all" as const,
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

// Features Section Styles
const featuresContainer = {
  margin: "24px 0",
};

const feature = {
  marginBottom: "16px",
  padding: "12px",
  backgroundColor: "#fafafa",
  borderRadius: "6px",
};

const featureTitle = {
  color: "#18181b",
  fontSize: "14px",
  fontWeight: "600",
  margin: "0 0 4px",
};

const featureDescription = {
  color: "#71717a",
  fontSize: "13px",
  margin: "0",
};

const footer = {
  color: "#71717a",
  fontSize: "12px",
  lineHeight: "16px",
  margin: "8px 0",
};