/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as canvases from "../canvases.js";
import type * as crm from "../crm.js";
import type * as crons from "../crons.js";
import type * as emergencyLogs from "../emergencyLogs.js";
import type * as files from "../files.js";
import type * as folders from "../folders.js";
import type * as messagehelpers from "../messagehelpers.js";
import type * as messages from "../messages.js";
import type * as milestones from "../milestones.js";
import type * as notes from "../notes.js";
import type * as notifications from "../notifications.js";
import type * as notificationsystem from "../notificationsystem.js";
import type * as payments from "../payments.js";
import type * as seedTemplate from "../seedTemplate.js";
import type * as tasks from "../tasks.js";
import type * as threads from "../threads.js";
import type * as users from "../users.js";
import type * as workspaces from "../workspaces.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  canvases: typeof canvases;
  crm: typeof crm;
  crons: typeof crons;
  emergencyLogs: typeof emergencyLogs;
  files: typeof files;
  folders: typeof folders;
  messagehelpers: typeof messagehelpers;
  messages: typeof messages;
  milestones: typeof milestones;
  notes: typeof notes;
  notifications: typeof notifications;
  notificationsystem: typeof notificationsystem;
  payments: typeof payments;
  seedTemplate: typeof seedTemplate;
  tasks: typeof tasks;
  threads: typeof threads;
  users: typeof users;
  workspaces: typeof workspaces;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
