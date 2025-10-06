// convex/payments.ts
import { v } from "convex/values";
import { mutation, action, query } from "./_generated/server";
import { api } from "./_generated/api";
import Stripe from "stripe";

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error("STRIPE_SECRET_KEY is not set");
}

// Initialize Stripe with your secret key
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2025-08-27.basil",
});

// Create a Stripe payment link (action because it calls external API)
export const createStripePaymentLink = action({
  args: {
    workspaceId: v.id("workspaces"),
    priceId: v.string(),
    quantity: v.optional(v.number()),
    metadata: v.optional(v.any()),
    serviceName: v.string(),
    serviceDescription: v.string(),
    invoiceNumber: v.string(),
  },
  handler: async (ctx, args) => {
    // Get workspace details
    const workspace = await ctx.runQuery(api.workspaces.getWorkspaceById, { 
      workspaceId: args.workspaceId 
    });
    
    if (!workspace) throw new Error("Workspace not found");

    // Create payment link in Stripe with their default success page
    const paymentLink = await stripe.paymentLinks.create({
      line_items: [
        {
          price: args.priceId,
          quantity: args.quantity || 1,
        },
      ],
      metadata: {
        workspaceId: args.workspaceId,
        workspaceName: workspace.name,
        customerEmail: workspace.invitedEmail || "",
        ...args.metadata,
      },
      allow_promotion_codes: true,
      invoice_creation: {
        enabled: true,
      },
    });

    // Get the price details to extract amount
    const price = await stripe.prices.retrieve(args.priceId);
    
    // Validate that we have a valid price
    if (!price.unit_amount || price.unit_amount <= 0) {
      throw new Error(`Invalid price amount: ${price.unit_amount}. Price ID: ${args.priceId}`);
    }
    
    if (!price.currency) {
      throw new Error(`Invalid currency for price ID: ${args.priceId}`);
    }
    
    // Store the payment link in database
    await ctx.runMutation(api.payments.storePaymentLink, {
      workspaceId: args.workspaceId,
      stripePaymentLinkId: paymentLink.id,
      stripeUrl: paymentLink.url,
      serviceName: args.serviceName,
      serviceDescription: args.serviceDescription,
      invoiceNumber: args.invoiceNumber,
      amount: price.unit_amount,
      currency: price.currency,
    });

    return {
      url: paymentLink.url,
      id: paymentLink.id,
    };
  },
});

// Store payment link in database
export const storePaymentLink = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    stripeUrl: v.string(),
    amount: v.number(),
    currency: v.string(),
    serviceName: v.string(),
    serviceDescription: v.string(),
    invoiceNumber: v.string(),
    stripePaymentLinkId: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("payments", {
      workspaceId: args.workspaceId,
      stripeLink: args.stripeUrl,
      amount: args.amount,
      currency: args.currency,
      serviceName: args.serviceName,
      serviceDescription: args.serviceDescription,
      invoiceNumber: args.invoiceNumber,
      status: "pending",
      createdAt: Date.now(),
    });
  },
});

// Get Stripe products and prices
export const getStripeProducts = action({
  args: {},
  handler: async () => {
    const products = await stripe.products.list({
      active: true,
      expand: ["data.default_price"],
    });

    const prices = await stripe.prices.list({
      active: true,
    });

    return {
      products: products.data,
      prices: prices.data,
    };
  },
});

// Get payment link details from Stripe
export const getStripePaymentLink = action({
  args: {
    paymentLinkId: v.string(),
  },
  handler: async (ctx, args) => {
    const paymentLink = await stripe.paymentLinks.retrieve(args.paymentLinkId, {
      expand: ["line_items", "invoice_creation"],
    });

    return paymentLink;
  },
});

export const createCheckoutSession = action({
  args: {
    serviceName: v.string(),
    serviceDescription: v.string(),
    invoiceNumber: v.string(),
    workspaceId: v.id("workspaces"),
    priceId: v.string(),
    mode: v.union(v.literal("payment"), v.literal("subscription")),
    quantity: v.optional(v.number()),
    customerEmail: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price: args.priceId,
          quantity: args.quantity || 1,
        },
      ],
      mode: args.mode,
      customer_email: args.customerEmail || undefined,
      metadata: {
        workspaceId: args.workspaceId,
        serviceName: args.serviceName,
        serviceDescription: args.serviceDescription,
        invoiceNumber: args.invoiceNumber,
      },
      invoice_creation: args.mode === "payment" ? { enabled: true } : undefined,
    });

    return {
      sessionId: session.id,
      url: session.url,
    };
  },
});

// Webhook handler for Stripe events
export const handleStripeWebhook = action({
  args: {
    event: v.any(),
  },
  handler: async (ctx, args) => {
    const { type, data } = args.event;

    switch (type) {
      case "checkout.session.completed": {
        const session = data.object;
        // Update payment status
        await ctx.runMutation(api.payments.updatePaymentStatus, {
          workspaceId: session.metadata.workspaceId,
          status: "paid",
        });
        break;
      }
      
      case "payment_link.created":
      case "payment_link.updated":
        // Handle payment link events
        break;
    }

    return { received: true };
  },
});

// Update payment status
export const updatePaymentStatus = mutation({
  args: {
    workspaceId: v.id("workspaces"),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const payment = await ctx.db
      .query("payments")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .first();
    
    if (payment) {
      await ctx.db.patch(payment._id, {
        status: args.status,
      });
    }
  },
});

// Get all payments with workspace details
export const getPayments = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user || user.role !== "admin") {
      throw new Error("Only admins can view all payments");
    }

    const payments = await ctx.db.query("payments").collect();
    
    // Get workspace details for each payment
    const paymentsWithWorkspaces = await Promise.all(
      payments.map(async (payment) => {
        const workspace = await ctx.db.get(payment.workspaceId);
        return {
          ...payment,
          workspace,
        };
      })
    );

    return paymentsWithWorkspaces;
  },
});

// Get active payment for a specific workspace
export const getActivePayment = query({
  args: { workspaceId: v.id("workspaces") },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", identity.subject))
      .first();

    if (!user) throw new Error("User not found");

    // Check if user has access to this workspace
    const workspace = await ctx.db.get(args.workspaceId);
    if (!workspace) throw new Error("Workspace not found");

    // Allow access if user is admin, workspace owner, or invited client
    const hasAccess = 
      user.role === "admin" || 
      workspace.ownerId === user._id || 
      workspace.invitedEmail === user.email;

    if (!hasAccess) {
      throw new Error("Access denied");
    }

    // Get the most recent payment for this workspace
    const payment = await ctx.db
      .query("payments")
      .withIndex("by_workspace", (q) => q.eq("workspaceId", args.workspaceId))
      .order("desc")
      .first();

    return payment;
  },
});

export const updatePayment = mutation({
  args: {
    id: v.id("payments"),
    updates: v.object({
      serviceName: v.optional(v.string()),
      amount: v.optional(v.number()),
      workspaceId: v.optional(v.id("workspaces")),
    }),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, args.updates);
    return { success: true };
  },
});

export const deletePayment = mutation({
  args: {
    id: v.id("payments"),
  },
  handler: async (ctx, args) => {
    // Get the payment first to check if it exists
    const payment = await ctx.db.get(args.id);
    if (!payment) {
      throw new Error("Payment not found");
    }
    
    // Delete the payment
    await ctx.db.delete(args.id);
    
    return { success: true };
  },
});