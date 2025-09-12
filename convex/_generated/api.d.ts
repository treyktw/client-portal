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
import type * as crons from "../crons.js";
import type * as files from "../files.js";
import type * as folders from "../folders.js";
import type * as notes from "../notes.js";
import type * as notifications from "../notifications.js";
import type * as payments from "../payments.js";
import type * as tasks from "../tasks.js";
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
  crons: typeof crons;
  files: typeof files;
  folders: typeof folders;
  notes: typeof notes;
  notifications: typeof notifications;
  payments: typeof payments;
  tasks: typeof tasks;
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
