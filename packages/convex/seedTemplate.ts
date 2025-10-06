// convex/seedTemplates.ts
import { internalMutation } from "./_generated/server";

export const seedMessageTemplates = internalMutation({
  handler: async (ctx) => {
    // Get admin user (you'll need to update this with actual admin ID)
    const adminUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("role"), "admin"))
      .first();

    if (!adminUser) {
      console.error("No admin user found for seeding templates");
      return;
    }

    const now = Date.now();

    // SMS Templates
    const smsTemplates = [
      {
        channel: "sms" as const,
        name: "Intro/Recap",
        body: "Telera: Hi {ownerFirst}, this is {yourName}. I added notes from our chat about {businessName}. Want me to send a short proposal by email? Reply YES. Reply STOP to opt out.",
        variables: ["ownerFirst", "yourName", "businessName"],
        category: "outreach" as const,
      },
      {
        channel: "sms" as const,
        name: "Proposal Ready",
        body: "Telera: Your proposal for {businessName} is ready. View in your portal: {portalUrl}. Reply STOP to opt out.",
        variables: ["businessName", "portalUrl"],
        category: "followup" as const,
      },
      {
        channel: "sms" as const,
        name: "Appointment Reminder",
        body: "Telera: Reminder—call today at {time}. Reply 1 to confirm, 2 to reschedule. Reply STOP to opt out.",
        variables: ["time"],
        category: "followup" as const,
      },
      {
        channel: "sms" as const,
        name: "Payment Reminder",
        body: "Telera: Invoice {invoiceId} for {amount} is due {dueDate}. Pay: {invoiceUrl}. Reply STOP to opt out.",
        variables: ["invoiceId", "amount", "dueDate", "invoiceUrl"],
        category: "payment" as const,
      },
      {
        channel: "sms" as const,
        name: "Milestone Reached",
        body: "Telera: Great news! Milestone '{milestoneTitle}' completed for {businessName}. Check progress: {portalUrl}. Reply STOP to opt out.",
        variables: ["milestoneTitle", "businessName", "portalUrl"],
        category: "milestone" as const,
      },
      {
        channel: "sms" as const,
        name: "Task Assigned",
        body: "Telera: New task '{taskTitle}' assigned. View details: {portalUrl}. Reply STOP to opt out.",
        variables: ["taskTitle", "portalUrl"],
        category: "task" as const,
      },
    ];

    // Email Templates
    const emailTemplates = [
      {
        channel: "email" as const,
        name: "Intro/Recap",
        subject: "Quick recap & next steps — {businessName}",
        body: `Hi {ownerFirst},

Great speaking today. Here's a quick recap and next steps:
• Goals: {goalsSummary}
• Timeline: {timelineSummary}
• Deliverables: {deliverablesSummary}

I can share a proposal tomorrow. Does {proposedDate} work?

{yourName}
Telera Tech`,
        variables: ["ownerFirst", "businessName", "goalsSummary", "timelineSummary", "deliverablesSummary", "proposedDate", "yourName"],
        category: "outreach" as const,
      },
      {
        channel: "email" as const,
        name: "Proposal Ready",
        subject: "Proposal ready — {projectName}",
        body: `Hi {ownerFirst},

Your proposal is ready in the portal:
{portalUrl}

Let me know if you'd like a quick walkthrough.

{yourName}`,
        variables: ["ownerFirst", "projectName", "portalUrl", "yourName"],
        category: "followup" as const,
      },
      {
        channel: "email" as const,
        name: "Payment Reminder",
        subject: "Reminder — Invoice {invoiceId} due {dueDate}",
        body: `Hi {ownerFirst},

A friendly reminder that invoice {invoiceId} for {amount} is due on {dueDate}.
Pay securely here: {invoiceUrl}

Thank you,
Telera Tech`,
        variables: ["ownerFirst", "invoiceId", "amount", "dueDate", "invoiceUrl"],
        category: "payment" as const,
      },
      {
        channel: "email" as const,
        name: "Welcome to Workspace",
        subject: "Welcome to your Telera workspace!",
        body: `Hi {ownerFirst},

Welcome to Telera! Your workspace is ready at:
{portalUrl}

Here's what you can do:
• Complete your onboarding
• Upload brand assets
• Track project progress
• Chat with your team

Need help? Just reply to this email.

Best,
{yourName}
Telera Tech`,
        variables: ["ownerFirst", "portalUrl", "yourName"],
        category: "system" as const,
      },
      {
        channel: "email" as const,
        name: "Milestone Completed",
        subject: "Milestone completed: {milestoneTitle}",
        body: `Hi {ownerFirst},

Great news! We've completed the milestone "{milestoneTitle}" for {businessName}.

View full details and next steps in your portal:
{portalUrl}

{yourName}
Telera Tech`,
        variables: ["ownerFirst", "milestoneTitle", "businessName", "portalUrl", "yourName"],
        category: "milestone" as const,
      },
      {
        channel: "email" as const,
        name: "New Task Assigned",
        subject: "New task: {taskTitle}",
        body: `Hi {ownerFirst},

A new task has been added to your project:

Task: {taskTitle}
Description: {taskDescription}
Due: {dueDate}

View in portal: {portalUrl}

{yourName}`,
        variables: ["ownerFirst", "taskTitle", "taskDescription", "dueDate", "portalUrl", "yourName"],
        category: "task" as const,
      },
    ];

    // Insert SMS templates
    for (const template of smsTemplates) {
      await ctx.db.insert("messageTemplates", {
        ...template,
        isActive: true,
        createdBy: adminUser._id,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Insert Email templates
    for (const template of emailTemplates) {
      await ctx.db.insert("messageTemplates", {
        ...template,
        isActive: true,
        createdBy: adminUser._id,
        createdAt: now,
        updatedAt: now,
      });
    }

    console.log(`Seeded ${smsTemplates.length + emailTemplates.length} message templates`);
    
    return { 
      success: true, 
      count: smsTemplates.length + emailTemplates.length,
    };
  },
});