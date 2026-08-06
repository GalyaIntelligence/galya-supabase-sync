import prompts from "prompts";
import type { Config } from "./config.js";

/**
 * Runs the interactive setup wizard.
 * Asks the user a series of questions and returns a Config object
 * shaped to match the ConfigSchema.
 *
 * Throws if the user cancels (Ctrl+C).
 */
export async function runSetupWizard(): Promise<Config> {
  const answers = await prompts(
    [
      {
        type: "text",
        name: "supabaseUrl",
        message: "Supabase project URL",
        validate: (value: string) => {
         if (!value.startsWith("https://")) return "Must be a valid https:// URL";
         if (value.includes("supabase.com/dashboard")) {
           return "That's the dashboard URL. Use your project API URL: https://<ref>.supabase.co";
            }
         if (!value.includes(".supabase.co")) {
             return "Must be your project API URL (https://<ref>.supabase.co)";
         }
         return true;
       },
      },
      {
        type: "password",
        name: "supabaseKey",
        message: "Supabase service role key",
        validate: (value: string) =>
          value.length > 20 ? true : "That key looks too short",
      },
      {
        type: "text",
        name: "table",
        message: "Table name to sync",
        validate: (value: string) =>
          value.length > 0 ? true : "Table name is required",
      },
      {
        type: "password",
        name: "galyaApiKey",
        message: "Galya API key",
        validate: (value: string) =>
          value.startsWith("galya_")
            ? true
            : "Galya API keys start with 'galya_'",
      },
      {
        type: "text",
        name: "galyaWorkspaceId",
        message: "Galya workspace ID (optional, press Enter to skip)",
      },
      {
        type: "text",
        name: "fieldId",
        message: "Column name for row ID",
        initial: "id",
      },
      {
        type: "text",
        name: "fieldUrl",
        message: "Column name for content URL",
        initial: "url",
      },
      {
        type: "text",
        name: "fieldTitle",
        message: "Column name for title (optional)",
      },
      {
        type: "text",
        name: "fieldDescription",
        message: "Column name for description (optional)",
      },
      {
        type: "select",
        name: "contentType",
        message: "Default content type for this table",
        choices: [
          { title: "Text", value: "text" },
          { title: "Image", value: "image" },
          { title: "Audio", value: "audio" },
          { title: "Video", value: "video" },
        ],
        initial: 0,
      },
      {
        type: "select",
        name: "domain",
        message: "Content domain (what category best fits your data)",
        choices: [
          { title: "Ecommerce / Shopping", value: "ecommerce" },
          { title: "Restaurants / Hospitality", value: "restaurants" },
          { title: "Travel", value: "travel" },
          { title: "Fashion", value: "fashion" },
          { title: "UI/UX / Design", value: "uiux" },
          { title: "Professional / LinkedIn", value: "professional" },
          { title: "Conversation", value: "conversation" },
        ],
        initial: 0,
      },
    ],
    {
      onCancel: () => {
        throw new Error("Setup cancelled by user");
      },
    }
  );

  return {
    supabase: {
      projectUrl: answers.supabaseUrl,
      serviceRoleKey: answers.supabaseKey,
      table: answers.table,
    },
    galya: {
      apiKey: answers.galyaApiKey,
      workspaceId: answers.galyaWorkspaceId || undefined,
    },
    fields: {
      id: answers.fieldId,
      url: answers.fieldUrl,
      title: answers.fieldTitle || undefined,
      description: answers.fieldDescription || undefined,
      type: answers.contentType,
      domain: answers.domain,
    },
  };
}
