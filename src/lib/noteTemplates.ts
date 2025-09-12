// lib/noteTemplates.ts - Fixed version
import type { Doc } from "@/convex/_generated/dataModel";

export function getGeneralNoteTemplate(workspace: Doc<"workspaces">): string {
  const businessInfo = workspace.businessInfo;
  const goals = workspace.goals;
  const brandAssets = workspace.brandAssets;
  
  // Pre-fill the template with actual data from onboarding
  return `# Project Brief — ${businessInfo?.businessName || workspace.name}
*Generated on ${new Date().toLocaleDateString()} • Auto-populated from onboarding data*

## 1) Business Basics
**Business / Practice Name:** ${businessInfo?.businessName || ''}
**Primary Contact:** ${businessInfo?.contactPerson || ''}
**Email:** ${businessInfo?.email || ''}
**Phone:** ${businessInfo?.phone || 'Not provided'}
**Address:** ${businessInfo?.address || 'Not provided'}
**Website:** ${businessInfo?.website || 'None'}
**Domain Status:** ${businessInfo?.website ? 'Using existing' : 'To be determined'}

${businessInfo?.socialLinks && businessInfo.socialLinks.length > 0 ? `
### Social Media Presence
${businessInfo.socialLinks.map(link => `**${link.platform}:** ${link.url}`).join('\n')}
` : ''}

## 2) Services You Offer
${goals?.services && goals.services.length > 0 
  ? goals.services.map(service => `• ${service}`).join('\n')
  : '• Service 1\n• Service 2\n• Service 3'}

**Primary service to highlight:** ${goals?.services?.[0] || 'To be determined'}

## 3) Main Goals for the Website
Check all that apply:
- [ ] Generate more leads/inquiries
- [ ] Showcase portfolio/work
- [ ] Sell products/services online
- [ ] Provide information/resources
- [ ] Build credibility/trust
- [ ] Enable online bookings
- [ ] Better customer communication
- [ ] Modern redesign

**Your selected goals:**
${goals?.mainGoals && goals.mainGoals.length > 0 
  ? goals.mainGoals.map(goal => `• ${goal}`).join('\n')
  : 'No goals selected yet'}

## 4) Target Audience
**Who are your ideal customers?**
**Age range:** ${goals?.specialNotes?.includes('age') ? 'See notes' : 'To be determined'}
**Location:** ${businessInfo?.address ? 'Local to ' + businessInfo.address.split(',')[1] : 'To be determined'}
**Interests/needs:** ${goals?.specialNotes ? 'See special notes below' : 'To be determined'}

## 5) Design Preferences
**Selected theme:** ${workspace.theme ? workspace.theme.charAt(0).toUpperCase() + workspace.theme.slice(1) : 'Not selected'}
**Dark mode:** ${workspace.darkMode ? 'Enabled' : 'Disabled'}

**Brand colors:**
${brandAssets?.primaryColor ? `**Primary:** ${brandAssets.primaryColor}` : '**Primary:** To be determined'}
${brandAssets?.secondaryColor ? `**Secondary:** ${brandAssets.secondaryColor}` : '**Secondary:** To be determined'}

**Logo status:** ${brandAssets?.logoId ? '✅ Uploaded' : brandAssets?.uploadLater ? '📅 Will upload later' : '❌ Not provided'}

## 6) Content & Features
**Pages needed:**
- [ ] Home
- [ ] About
- [ ] Services
- [ ] Portfolio/Gallery
- [ ] Contact
- [ ] Blog
- [ ] Shop/Store
- [ ] Other: _______________

**Special features needed:**
- [ ] Contact forms
- [ ] Online booking/scheduling
- [ ] Payment processing
- [ ] Member login area
- [ ] Newsletter signup
- [ ] Social media integration
- [ ] Live chat
- [ ] Other: _______________

## 7) Special Requirements & Notes
${goals?.specialNotes || '*No special notes provided during onboarding*'}

## 8) Project Settings
**Analytics enabled:** ${workspace.policies?.enableAnalytics ? 'Yes' : 'No'}
**Email notifications:** ${workspace.policies?.enableNotifications ? 'Yes' : 'No'}
**Data consent:** ${workspace.policies?.dataConsent ? '✅ Confirmed' : '⚠️ Pending'}

## 9) Next Steps
1. Review this auto-generated brief
2. Add any missing information
3. Check off applicable items above
4. Share with team members for feedback
5. Begin project implementation

---
*This document was automatically generated from your onboarding responses. Feel free to edit and expand any section as needed.*`;
}

export function markdownToBlockNote(markdown: string): string {
  // Convert markdown to BlockNote format
  const lines = markdown.split('\n');
  const blocks: any[] = [];
  
  lines.forEach((line) => {
    const id = crypto.randomUUID();
    
    if (line.startsWith('# ')) {
      blocks.push({
        id,
        type: "heading",
        props: { level: 1 },
        content: [{ type: "text", text: line.slice(2), styles: {} }],
        children: [],
      });
    } else if (line.startsWith('## ')) {
      blocks.push({
        id,
        type: "heading",
        props: { level: 2 },
        content: [{ type: "text", text: line.slice(3), styles: {} }],
        children: [],
      });
    } else if (line.startsWith('### ')) {
      blocks.push({
        id,
        type: "heading",
        props: { level: 3 },
        content: [{ type: "text", text: line.slice(4), styles: {} }],
        children: [],
      });
    } else if (line.startsWith('• ')) {
      blocks.push({
        id,
        type: "bulletListItem",
        props: {},
        content: [{ type: "text", text: line.slice(2), styles: {} }],
        children: [],
      });
    } else if (line.startsWith('- [ ]') || line.startsWith('- [x]')) {
      const isChecked = line.startsWith('- [x]');
      const text = line.slice(6);
      
      blocks.push({
        id,
        type: "checkListItem", 
        props: { checked: isChecked },
        content: [{ type: "text", text, styles: {} }],
        children: [],
      });
    } else if (line.trim() === '---') {
      blocks.push({
        id,
        type: "paragraph",
        props: {},
        content: [{ type: "text", text: "—".repeat(50), styles: {} }],
        children: [],
      });
    } else if (line.trim()) {
      // Parse bold text patterns
      const content = [];
      let lastIndex = 0;
      
       // Match **bold text:** pattern
       const boldPattern = /\*\*([^:]+):\*\*/g;
       let match: RegExpExecArray | null = null;
       
       match = boldPattern.exec(line);
       while (match !== null) {
        // Add text before the match
        if (match.index > lastIndex) {
          const textBefore = line.slice(lastIndex, match.index);
          if (textBefore) {
            content.push({ type: "text", text: textBefore, styles: {} });
          }
        }
        
         // Add the bold text with colon
         content.push({ type: "text", text: match[1] + ":", styles: { bold: true } });
         lastIndex = match.index + match[0].length;
         
         match = boldPattern.exec(line);
       }
      
      // Add remaining text after last match
      if (lastIndex < line.length) {
        const remainingText = line.slice(lastIndex);
        if (remainingText.trim()) {
          content.push({ type: "text", text: remainingText, styles: {} });
        }
      }
      
      // If no bold patterns found, treat as regular text
      if (content.length === 0) {
        content.push({ type: "text", text: line, styles: {} });
      }
      
      blocks.push({
        id,
        type: "paragraph",
        props: {},
        content,
        children: [],
      });
    }
  });
  
  return JSON.stringify(blocks);
}