import path from "node:path";
import fs from "node:fs/promises";
import { runShippingComparison, formatComparisonSummary } from "../runner.js";
import type { VariantInput } from "../types.js";

async function main() {
  console.log("=== RUNNING FULL MULTI-VARIANT SHIPPING COMPARISON ===");

  const tempDir = path.resolve("automation/.debug/test_variants");
  await fs.mkdir(tempDir, { recursive: true });

  const dummyJpg = Buffer.from(
    "/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=",
    "base64",
  );

  const sampleVariants: VariantInput[] = [
    { name: "variant_50kb", sizeKB: 50, path: path.join(tempDir, "variant_50kb.jpg") },
    { name: "variant_100kb", sizeKB: 100, path: path.join(tempDir, "variant_100kb.jpg") },
    { name: "variant_200kb", sizeKB: 200, path: path.join(tempDir, "variant_200kb.jpg") },
  ];

  for (const v of sampleVariants) {
    if (v.path) await fs.writeFile(v.path, dummyJpg);
  }

  console.log(
    "Testing 3 image variants:",
    sampleVariants.map((v) => v.name),
  );

  const result = await runShippingComparison(sampleVariants, { headless: true });

  console.log("\n" + formatComparisonSummary(result));

  if (result.success) {
    console.log("🎉 FULL MULTI-VARIANT SHIPPING COMPARISON SUCCESSFUL!");
  } else {
    console.error("❌ Comparison failed:", result.error);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Full comparison error:", err);
  process.exit(1);
});
