#!/usr/bin/env node
import { Command } from "commander";
import { runSetupWizard } from "./prompts.js";
import { loadConfig, saveConfig, configExists, CONFIG_FILE} from "./storage.js";
import { checkSupabase, checkGalya } from "./check.js";

const program = new Command();

program
  .name("galya-supabase-sync")
  .description(
    "Sync Supabase tables to Galya for taste-based search and reranking"
  )
  .version("0.1.0");

program
  .command("setup")
  .description("Interactive setup wizard")
  .action(async () => {
    try {
      if (await configExists()) {
        console.log(
          `A ${CONFIG_FILE} already exists in this directory. Aborting to avoid overwriting it.`
        );
        process.exit(2);
      }

      const config = await runSetupWizard();
      const filePath = await saveConfig(config);
      console.log(`\n☑️  Config saved to ${filePath}`); 
      console.log(`Next: run 'galya-supabase-sync validate' to check it.`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`\n✗ Setup failed: ${message}`);
      process.exit(1);
   }
  });
program
  .command("validate")
  .description("Validate configuration and credentials")
  .action(async () => {
    try {
      const config = await loadConfig();
      if (!config) {
        console.error(
          `✗ No ${CONFIG_FILE} found in this directory. Run 'galya-supabase-sync setup' first.`
        );
        process.exit(2);
      }

      console.log("Checking Supabase...");
      const supa = await checkSupabase(config);
      console.log(`  ${supa.ok ? "✓" : "✗"} ${supa.message}`);

      console.log("Checking Galya...");
      const galya = await checkGalya(config);
      console.log(`  ${galya.ok ? "✓" : "✗"} ${galya.message}`);

      if (supa.ok && galya.ok) {
        console.log("\n✓ All checks passed. You're ready to sync.");
      } else {
        console.error("\n✗ One or more checks failed. Fix them and re-run.");
        process.exit(3);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`\n✗ Validation failed: ${message}`);
      process.exit(1);
    }
  });
program.parseAsync(process.argv);

