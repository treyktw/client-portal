import {
  Body,
  Button,
  Container,
  Column,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Row,
  Section,
  Text,
} from "@react-email/components";

interface EmergencyNotificationEmailProps {
  type: 'emergency_call_completed' | 'emergency_sms' | 'emergency_escalation' | 'system_error';
  from: string;
  message?: string;
  recordingUrl?: string;
  transcription?: string;
  priority?: 'critical' | 'high' | 'medium' | 'low';
  timestamp?: string;
  callDuration?: string;
  location?: {
    city?: string;
    state?: string;
    country?: string;
  };
  actionUrl?: string;
  escalationReason?: string;
  errorDetails?: string;
}

export default function EmergencyNotificationEmail({
  type,
  from,
  message,
  recordingUrl,
  transcription,
  priority = 'high',
  timestamp = new Date().toLocaleString(),
  callDuration,
  location,
  actionUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://telera.tech/admin/emergency',
  escalationReason,
  errorDetails,
}: EmergencyNotificationEmailProps) {
  
  const getSubject = () => {
    switch (type) {
      case 'emergency_call_completed':
        return `🚨 Emergency Call Completed from ${from}`;
      case 'emergency_sms':
        return `🚨 Emergency SMS from ${from}`;
      case 'emergency_escalation':
        return `⚠️ ESCALATION REQUIRED: Emergency from ${from}`;
      case 'system_error':
        return `🔴 System Error: Emergency Handler Failed`;
      default:
        return `🚨 Emergency Alert from ${from}`;
    }
  };

  const getPriorityColor = () => {
    switch (priority) {
      case 'critical': return '#dc2626'; // red-600
      case 'high': return '#ea580c';     // orange-600
      case 'medium': return '#ca8a04';   // yellow-600
      case 'low': return '#16a34a';      // green-600
      default: return '#ea580c';
    }
  };

  const getPriorityEmoji = () => {
    switch (priority) {
      case 'critical': return '🔴';
      case 'high': return '🟠';
      case 'medium': return '🟡';
      case 'low': return '🟢';
      default: return '🟠';
    }
  };

  const previewText = getSubject();

  return (
    <Html>
      <Head />
      <Preview>{previewText}</Preview>
      <Body style={main}>
        <Container style={container}>
          {/* Critical Alert Header */}
          <Section style={{
            ...header,
            backgroundColor: getPriorityColor(),
          }}>
            <Heading style={emergencyHeader}>
              {type === 'emergency_escalation' ? '⚠️ ESCALATION REQUIRED ⚠️' : '🚨 EMERGENCY ALERT 🚨'}
            </Heading>
            <Text style={headerSubtext}>
              Immediate Action Required
            </Text>
          </Section>

          {/* Main Content */}
          <Section style={content}>
            {/* Alert Type Badge */}
            <div style={alertBadge}>
              <Text style={alertBadgeText}>
                {getPriorityEmoji()} {priority.toUpperCase()} PRIORITY {type.replace(/_/g, ' ').toUpperCase()}
              </Text>
            </div>

            {/* Contact Information Box */}
            <Section style={infoBox}>
              <Heading style={h3}>Contact Information</Heading>
              <Row>
                <Column style={infoColumn}>
                  <Text style={infoLabel}>FROM</Text>
                  <Text style={infoValue}>{from}</Text>
                </Column>
                <Column style={infoColumn}>
                  <Text style={infoLabel}>TIME</Text>
                  <Text style={infoValue}>{timestamp}</Text>
                </Column>
              </Row>
              
              {location && (location.city || location.state || location.country) && (
                <Row style={{ marginTop: '16px' }}>
                  <Column>
                    <Text style={infoLabel}>LOCATION</Text>
                    <Text style={infoValue}>
                      {[location.city, location.state, location.country]
                        .filter(Boolean)
                        .join(', ')}
                    </Text>
                  </Column>
                </Row>
              )}

              {callDuration && (
                <Row style={{ marginTop: '16px' }}>
                  <Column>
                    <Text style={infoLabel}>CALL DURATION</Text>
                    <Text style={infoValue}>{callDuration}</Text>
                  </Column>
                </Row>
              )}
            </Section>

            {/* Message Content */}
            {message && (
              <Section style={messageSection}>
                <Heading style={h3}>Message Content</Heading>
                <div style={messageBox}>
                  <Text style={messageText}>"{message}"</Text>
                </div>
              </Section>
            )}

            {/* Transcription */}
            {transcription && (
              <Section style={messageSection}>
                <Heading style={h3}>Call Transcription</Heading>
                <div style={transcriptionBox}>
                  <Text style={transcriptionText}>{transcription}</Text>
                </div>
              </Section>
            )}

            {/* Escalation Reason */}
            {escalationReason && (
              <Section style={warningSection}>
                <Heading style={h3}>⚠️ Escalation Reason</Heading>
                <Text style={warningText}>{escalationReason}</Text>
              </Section>
            )}

            {/* System Error Details */}
            {errorDetails && (
              <Section style={errorSection}>
                <Heading style={h3}>🔴 Error Details</Heading>
                <Text style={errorText}>{errorDetails}</Text>
              </Section>
            )}

            {/* Action Buttons */}
            <Section style={buttonContainer}>
              <Row>
                <Column align="center">
                  <Button
                    style={primaryButton}
                    href={actionUrl}
                  >
                    View Emergency Dashboard
                  </Button>
                </Column>
              </Row>
              
              <Row style={{ marginTop: '12px' }}>
                <Column align="center">
                  <Button
                    style={secondaryButton}
                    href={`tel:${from}`}
                  >
                    Call Back: {from}
                  </Button>
                </Column>
              </Row>

              {recordingUrl && (
                <Row style={{ marginTop: '12px' }}>
                  <Column align="center">
                    <Button
                      style={secondaryButton}
                      href={recordingUrl}
                    >
                      Listen to Recording
                    </Button>
                  </Column>
                </Row>
              )}
            </Section>

            <Hr style={hr} />

            {/* Response Protocol */}
            <Section style={protocolSection}>
              <Heading style={h3}>📋 Response Protocol</Heading>
              <div style={protocolBox}>
                <Text style={protocolStep}>
                  <strong>1. ACKNOWLEDGE</strong> - Mark as acknowledged in dashboard within 2 minutes
                </Text>
                <Text style={protocolStep}>
                  <strong>2. CONTACT</strong> - Call or message sender immediately
                </Text>
                <Text style={protocolStep}>
                  <strong>3. RESOLVE</strong> - Take necessary action to resolve the issue
                </Text>
                <Text style={protocolStep}>
                  <strong>4. DOCUMENT</strong> - Update emergency log with resolution details
                </Text>
                {type === 'emergency_escalation' && (
                  <Text style={protocolStepUrgent}>
                    <strong>⚠️ ESCALATED</strong> - This emergency was not acknowledged in time. Immediate action required!
                  </Text>
                )}
              </div>
            </Section>

            {/* Quick Links */}
            <Section style={quickLinksSection}>
              <Text style={quickLinksTitle}>Quick Actions</Text>
              <Text style={quickLinks}>
                <Link href={actionUrl} style={link}>Emergency Dashboard</Link>
                {' • '}
                <Link href={`sms:${from}`} style={link}>Send SMS</Link>
                {' • '}
                <Link href={`tel:${from}`} style={link}>Call Now</Link>
                {' • '}
                <Link href={`${process.env.NEXT_PUBLIC_APP_URL}/admin/contacts`} style={link}>View Contact</Link>
              </Text>
            </Section>

            <Hr style={hr} />

            <Text style={footer}>
              This is an automated emergency notification from Telera's emergency response system.
              You're receiving this because you're designated as an emergency contact.
            </Text>
            
            <Text style={footer}>
              To update your emergency notification preferences,{" "}
              <Link href={`${process.env.NEXT_PUBLIC_APP_URL}/settings/notifications`} style={link}>
                click here
              </Link>.
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// Styles
const main = {
  backgroundColor: "#f3f4f6",
  fontFamily:
    '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
};

const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  marginBottom: "64px",
  borderRadius: "8px",
  overflow: "hidden",
  boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
};

const header = {
  padding: "24px 32px",
  textAlign: "center" as const,
  background: "linear-gradient(135deg, #dc2626 0%, #991b1b 100%)",
};

const emergencyHeader = {
  color: "#ffffff",
  fontSize: "28px",
  fontWeight: "bold",
  margin: "0",
  padding: "0",
  textAlign: "center" as const,
  letterSpacing: "1px",
};

const headerSubtext = {
  color: "#fef2f2",
  fontSize: "14px",
  margin: "8px 0 0",
  textAlign: "center" as const,
};

const content = {
  padding: "32px",
};

const alertBadge = {
  backgroundColor: "#fef2f2",
  border: "2px solid #dc2626",
  borderRadius: "6px",
  padding: "8px 16px",
  marginBottom: "24px",
  textAlign: "center" as const,
};

const alertBadgeText = {
  color: "#991b1b",
  fontSize: "14px",
  fontWeight: "700",
  margin: "0",
  letterSpacing: "0.5px",
};

const h3 = {
  color: "#111827",
  fontSize: "18px",
  fontWeight: "600",
  margin: "0 0 12px",
};

const infoBox = {
  backgroundColor: "#f9fafb",
  borderRadius: "8px",
  padding: "20px",
  marginBottom: "24px",
};

const infoColumn = {
  width: "50%",
};

const infoLabel = {
  color: "#6b7280",
  fontSize: "11px",
  fontWeight: "600",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  margin: "0 0 4px",
};

const infoValue = {
  color: "#111827",
  fontSize: "16px",
  fontWeight: "500",
  margin: "0",
};

const messageSection = {
  marginBottom: "24px",
};

const messageBox = {
  backgroundColor: "#fffbeb",
  border: "1px solid #fbbf24",
  borderRadius: "6px",
  padding: "16px",
};

const messageText = {
  color: "#111827",
  fontSize: "15px",
  lineHeight: "24px",
  margin: "0",
  fontStyle: "italic",
};

const transcriptionBox = {
  backgroundColor: "#f0f9ff",
  border: "1px solid #0ea5e9",
  borderRadius: "6px",
  padding: "16px",
};

const transcriptionText = {
  color: "#111827",
  fontSize: "14px",
  lineHeight: "22px",
  margin: "0",
  whiteSpace: "pre-wrap" as const,
};

const warningSection = {
  backgroundColor: "#fef3c7",
  borderLeft: "4px solid #f59e0b",
  padding: "16px",
  marginBottom: "24px",
};

const warningText = {
  color: "#92400e",
  fontSize: "14px",
  margin: "0",
};

const errorSection = {
  backgroundColor: "#fee2e2",
  borderLeft: "4px solid #dc2626",
  padding: "16px",
  marginBottom: "24px",
};

const errorText = {
  color: "#991b1b",
  fontSize: "13px",
  margin: "0",
  fontFamily: "monospace",
};

const buttonContainer = {
  margin: "32px 0",
};

const primaryButton = {
  backgroundColor: "#dc2626",
  borderRadius: "6px",
  color: "#ffffff",
  fontSize: "16px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "14px 28px",
  width: "100%",
  maxWidth: "300px",
};

const secondaryButton = {
  backgroundColor: "#4b5563",
  borderRadius: "6px",
  color: "#ffffff",
  fontSize: "14px",
  fontWeight: "600",
  textDecoration: "none",
  textAlign: "center" as const,
  display: "inline-block",
  padding: "12px 24px",
  width: "100%",
  maxWidth: "300px",
};

const protocolSection = {
  marginTop: "24px",
  marginBottom: "24px",
};

const protocolBox = {
  backgroundColor: "#f3f4f6",
  borderRadius: "6px",
  padding: "16px",
};

const protocolStep = {
  color: "#374151",
  fontSize: "14px",
  lineHeight: "20px",
  margin: "8px 0",
};

const protocolStepUrgent = {
  color: "#dc2626",
  fontSize: "14px",
  lineHeight: "20px",
  margin: "12px 0",
  backgroundColor: "#fee2e2",
  padding: "8px",
  borderRadius: "4px",
};

const quickLinksSection = {
  textAlign: "center" as const,
  marginBottom: "24px",
};

const quickLinksTitle = {
  color: "#6b7280",
  fontSize: "12px",
  fontWeight: "600",
  textTransform: "uppercase" as const,
  letterSpacing: "0.5px",
  margin: "0 0 8px",
};

const quickLinks = {
  color: "#4b5563",
  fontSize: "14px",
  margin: "0",
};

const link = {
  color: "#2563eb",
  textDecoration: "underline",
};

const hr = {
  borderColor: "#e5e7eb",
  margin: "32px 0",
};

const footer = {
  color: "#6b7280",
  fontSize: "12px",
  lineHeight: "16px",
  margin: "8px 0",
};