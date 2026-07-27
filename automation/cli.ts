#!/usr/bin/env node
/**
 * CLI entry point for Meesho shipping charge automation.
 *
 * Usage:
 *   npx tsx automation/cli.ts login
 *   npx tsx automation/cli.ts compare --images ./path/to/variants
 *   npx tsx automation/cli.ts compare --images ./variants --headed
 */

import path from "node:path";
import { login } from "./login.js";
import { logger } from "./lib/logger.js";
import {
  discoverVariantsFromDirectory,
  formatComparisonSummary,
  runShippingComparison,
} from "./runner.js";
import { isMeeshoAutomationError } from "./lib/errors.js";

type CliArgs = {
  command: "login" | "compare";
  imagesDir?: string;
  headed: boolean;
  forceLogin: boolean;
};

function parseArgs(argv: string[]): CliArgs {
  const args = argv.slice(2);
  const command = (args[0] as CliArgs["command"]) ?? "compare";

  let imagesDir: string | undefined;
  let headed = false;
  let forceLogin = false;

  for (let i = 1; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--images" || arg === "-i") {
      imagesDir = args[++i];
    } else if (arg === "--headed") {
      headed = true;
    } else if (arg === "--force-login") {
      forceLogin = true;
    } else if (arg === "--help" || arg === "-h") {
      printHelp();
      process.exit(0);
    }
  }

  return { command, imagesDir, headed, forceLogin };
}

function printHelp(): void {
  console.log(`
Meesho Shipping Charge Automation CLI

Commands:
  login     Authenticate with Meesho and save session
  compare   Test all image variants and find lowest shipping charge

Options:
  --images, -i <dir>   Directory containing variant images (compare command)
  --headed             Run browser in headed (visible) mode
  --force-login        Ignore saved session and re-authenticate
  --help, -h           Show this help

Environment variables:
  MEESHO_SELLER_EMAIL      Seller account email
  MEESHO_SELLER_PASSWORD   Seller account password
  MEESHO_HEADED=1          Same as --headed
  MEESHO_LOG_LEVEL         debug | info | warn | error (default: info)

Examples:
  npx tsx automation/cli.ts login
  npx tsx automation/cli.ts login --headed
  npx tsx automation/cli.ts compare --images ./test-variants
  npx tsx automation/cli.ts compare --images ./test-variants --headed
`);
}

async function runLogin(args: CliArgs): Promise<void> {
  logger.info("Starting login flow");
  const result = await login({ headless: !args.headed, forceLogin: args.forceLogin });
  logger.info("Login successful — session saved", { sessionPath: result.sessionPath });
  await result.context.close();
  await result.browser.close();
}

async function runCompare(args: CliArgs): Promise<void> {
  if (!args.imagesDir) {
    console.error("Error: --images <dir> is required for compare command");
    printHelp();
    process.exit(1);
  }

  const absoluteDir = path.resolve(args.imagesDir);
  const variants = await discoverVariantsFromDirectory(absoluteDir);

  if (variants.length === 0) {
    console.error(`No image files found in ${absoluteDir}`);
    process.exit(1);
  }

  logger.info(`Found ${variants.length} variants to test`);

  const result = await runShippingComparison(variants, {
    headless: !args.headed,
    forceLogin: args.forceLogin,
  });

  console.log(formatComparisonSummary(result));

  if (!result.best) {
    process.exit(1);
  }
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv);

  try {
    if (args.command === "login") {
      await runLogin(args);
    } else if (args.command === "compare") {
      await runCompare(args);
    } else {
      console.error(`Unknown command: ${args.command}`);
      printHelp();
      process.exit(1);
    }
  } catch (error) {
    if (isMeeshoAutomationError(error)) {
      logger.error(error.message, { code: error.code, screenshot: error.screenshotPath });
    } else {
      logger.error(error instanceof Error ? error.message : String(error));
    }
    process.exit(1);
  }
}

main();
