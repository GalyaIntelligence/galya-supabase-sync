#!/usr/bin/env node
import { Command } from "commander";
import { runSetupWizard } from "./prompts.js";
import { loadConfig, saveConfig, configExists, CONFIG_FILE} from "./storage.js";
import { checkSupabase, checkGalya } from "./check.js";
import { generate } from "./generator.js"
import { checkSupabaseCli, checkProjectLinked, setSecrets, deployFunctions, pushMigration } from "./deployer.js";

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
program
  .command("generate")
  .description("Generate Supabase Edge Functions and SQL trigger from config")
  .action(async () => {
    try {
      const config = await loadConfig();
      if (!config) {
        console.error(
          `✗ No ${CONFIG_FILE} found. Run 'galya-supabase-sync setup' first.`
        );
        process.exit(2);
      }

      console.log(`Generating files for table '${config.supabase.table}'...`);

      const result = await generate(config);

      console.log(`\n✓ Generated sync function:    ${result.syncFunction}`);
      console.log(`✓ Generated rerank function:  ${result.rerankFunction}`);
      console.log(`✓ Generated SQL trigger:      ${result.triggerSql}`);
      console.log(`
Next steps:
  1. Review the generated files
  2. Add galya_sync_trigger.sql to your .gitignore (it contains your service role key)
  3. Run 'galya-supabase-sync deploy' to deploy to Supabase  (coming soon)
  4. Or deploy manually:
       supabase functions deploy galya-sync-${config.supabase.table}
       supabase functions deploy galya-rerank-${config.supabase.table}
       supabase db push
`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`\n✗ Generate failed: ${message}`);
      process.exit(1);
    }
  });
program
  .command("deploy")
  .description("Generate, deploy Edge Functions, set secrets, and push SQL trigger")
  .action(async () => {
    const cwd = process.cwd();

    try {
      // 1. Load config
      const config = await loadConfig();
      if (!config) {
        console.error(
          `✗ No ${CONFIG_FILE} found. Run 'galya-supabase-sync setup' first.`
        );
        process.exit(2);
      }

      // 2. Check prerequisites
      console.log("Checking prerequisites...");
      await checkSupabaseCli();
      console.log("  ✓ Supabase CLI found");
      await checkProjectLinked(config, cwd);
      console.log("  ✓ Supabase project linked");

      // 3. Generate files
      console.log("\nGenerating Edge Functions and SQL trigger...");
      const result = await generate(config, cwd);
      console.log(`  ✓ ${result.syncFunction}`);
      console.log(`  ✓ ${result.rerankFunction}`);
      console.log(`  ✓ ${result.triggerSql}`);

      // 4. Set secrets
      console.log("\nSetting Supabase secrets...");
      await setSecrets(config, cwd);

      // 5. Deploy Edge Functions
      console.log("\nDeploying Edge Functions...");
      await deployFunctions(config, cwd);

      // 6. Push SQL migration
      console.log("\nPushing SQL trigger migration...");
      await pushMigration(cwd);

      // 7. Done
      const table = config.supabase.table;
      console.log(`
✓ Deployment complete!

Your Supabase table '${table}' is now connected to Galya:
  • Every INSERT / UPDATE / DELETE → syncs to Galya automatically
  • Call galya-rerank-${table} to get personalised results for a user

Next: run 'galya-supabase-sync validate' to confirm credentials are healthy.
`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error(`\n✗ Deploy failed: ${message}`);
      process.exit(1);
    }
  });
program.parseAsync(process.argv);

