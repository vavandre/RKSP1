import { z } from "zod";

export const loginSchema = z.object({
  username: z.string().min(3).max(30),
  password: z.string().min(8).max(64)
});

export const createUserSchema = z.object({
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_.-]+$/),
  full_name: z.string().min(3).max(100),
  password: z.string().min(8).max(64),
  role: z.enum(["admin", "engineer", "viewer"])
});

export const createAssetSchema = z.object({
  name: z.string().min(2).max(80),
  type: z.string().min(2).max(40),
  status: z.enum(["active", "maintenance", "retired"]),
  location: z.string().min(2).max(80),
  owner_id: z.number().int().positive().nullable().optional()
});

export const updateAssetSchema = createAssetSchema.partial();

export const createTicketSchema = z.object({
  title: z.string().min(3).max(120),
  description: z.string().min(5).max(1000),
  priority: z.enum(["low", "medium", "high", "critical"]),
  status: z.enum(["open", "in_progress", "resolved", "closed"]),
  asset_id: z.number().int().positive(),
  assignee_id: z.number().int().positive().nullable().optional()
});

export const updateTicketSchema = createTicketSchema.partial();
