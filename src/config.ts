import { z } from "zod";

/**
 * Schema for the CLI's configuration file (galya-sync.config.json).
 * This defines the shape of a valid configuration and validates it at runtime.
 */
export const ConfigSchema = z.object({
  supabase: z.object({
    projectUrl: z.string().url(),
    serviceRoleKey: z.string().min(1),
    table: z.string().min(1),
  }),
  galya: z.object({
    apiKey: z.string().startsWith("galya_"),
    workspaceId: z.string().optional(),
  }),
  fields: z.object({
  id: z.string().min(1),
  url: z.string().min(1),
  title: z.string().optional(),
  description: z.string().optional(),
  type: z.enum(["text", "image", "audio", "video"]).default("text"),
  domain: z.enum([
    "restaurants", "travel", "ecommerce", "uiux",
    "fashion", "conversation", "professional"
  ]),
}),
});

export type Config = z.infer<typeof ConfigSchema>;
