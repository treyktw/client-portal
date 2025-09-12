// convex/crons.ts
import { cronJobs } from "convex/server";
import { api } from "./_generated/api";

const crons = cronJobs();

// Run cleanup daily at 2 AM UTC
crons.daily(
  "cleanup provisional users",
  { hourUTC: 2, minuteUTC: 0 },
  api.workspaces.cleanupProvisionalUsers
);

// Sync Clerk metadata every 6 hours
crons.interval(
  "sync clerk metadata",
  { hours: 1 },
  api.users.syncClerkMetadata
);

export default crons;