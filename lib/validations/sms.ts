import { z } from "zod";

// Customer validation schemas
export const createCustomerSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  phone: z.string().min(1, "Phone number is required").regex(/^\+?[\d\s\-\(\)]+$/, "Invalid phone number format"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  state: z.string().min(1, "State is required").max(50, "State name too long"),
});

export const updateCustomerSchema = createCustomerSchema.partial();

export const importCustomersSchema = z.object({
  customers: z.array(createCustomerSchema).min(1, "At least one customer is required"),
  skipDuplicates: z.boolean().default(true),
});

// Campaign validation schemas
export const createCampaignSchema = z.object({
  name: z.string().min(1, "Campaign name is required").max(200, "Name too long"),
  message: z.string().min(1, "Message is required").max(1600, "Message too long (max 1600 characters)"),
  targetState: z.string().optional(),
  scheduleTime: z.string().datetime().optional(),
  customerIds: z.array(z.string()).optional(),
});

export const updateCampaignSchema = createCampaignSchema.partial();

// Message validation schemas
export const sendImmediateMessageSchema = z.object({
  phone: z.string().min(1, "Phone number is required").regex(/^\+?[\d\s\-\(\)]+$/, "Invalid phone number format"),
  message: z.string().min(1, "Message is required").max(1600, "Message too long"),
});

// Query parameter schemas
export const customerQuerySchema = z.object({
  search: z.string().optional(),
  state: z.string().optional(),
  page: z.string().optional().transform(Number).pipe(z.number().min(1)),
  limit: z.string().optional().transform(Number).pipe(z.number().min(1).max(100)),
});

export const campaignQuerySchema = z.object({
  status: z.enum(["draft", "scheduled", "sending", "sent", "failed"]).optional(),
  page: z.string().optional().transform(Number).pipe(z.number().min(1)),
  limit: z.string().optional().transform(Number).pipe(z.number().min(1).max(100)),
});

// Types
export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
export type ImportCustomersInput = z.infer<typeof importCustomersSchema>;
export type CreateCampaignInput = z.infer<typeof createCampaignSchema>;
export type UpdateCampaignInput = z.infer<typeof updateCampaignSchema>;
export type SendImmediateMessageInput = z.infer<typeof sendImmediateMessageSchema>;