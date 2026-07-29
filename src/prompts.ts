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
        validate: (value: string) =>
          value.startsWith("https://") ? true : "Must be a valid https:// URL",
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
    },
  };
}
