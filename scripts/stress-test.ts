import "dotenv/config";
import { getPrisma } from "../lib/prisma";

async function runStressTest() {
  console.log("🚀 Starting Load & Stress Test against Hostinger Database...\n");

  const totalRequests = 5000;
  const concurrency = 1000; // 1000 simultaneous users browsing at the exact same millisecond
  let successCount = 0;
  let failCount = 0;
  const startTime = Date.now();

  const prisma = getPrisma();

  console.log(`📊 Parameters: ${totalRequests} total queries | ${concurrency} concurrent virtual shoppers\n`);

  // Define realistic customer query scenarios
  const tasks: (() => Promise<any>)[] = [];

  for (let i = 0; i < totalRequests; i++) {
    const taskType = i % 4;
    if (taskType === 0) {
      // Customer browsing categories
      tasks.push(() => prisma.category.findMany());
    } else if (taskType === 1) {
      // Customer viewing published products with variants
      tasks.push(() =>
        prisma.product.findMany({
          where: { status: "PUBLISHED" },
          include: { variants: true },
          take: 10,
        })
      );
    } else if (taskType === 2) {
      // Checking session / user authentication state
      tasks.push(() =>
        prisma.session.findFirst({
          where: { expiresAt: { gt: new Date() } },
          include: { user: true },
        })
      );
    } else {
      // Looking up discount codes
      tasks.push(() => prisma.discountCode.findMany({ where: { active: true } }));
    }
  }

  // Execute in batches of `concurrency`
  for (let i = 0; i < tasks.length; i += concurrency) {
    const batch = tasks.slice(i, i + concurrency);
    const results = await Promise.allSettled(batch.map((task) => task()));

    for (const res of results) {
      if (res.status === "fulfilled") {
        successCount++;
      } else {
        failCount++;
        console.error("❌ Query Failed:", res.reason?.message || res.reason);
      }
    }
    process.stdout.write(`  Executed ${Math.min(i + concurrency, totalRequests)}/${totalRequests} queries...\r`);
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);
  const rps = (totalRequests / Number(duration)).toFixed(1);

  console.log("\n\n🏆 LOAD TEST RESULTS");
  console.log("──────────────────────────────────────────────────");
  console.log(` ✅ Successful Queries: ${successCount}/${totalRequests}`);
  console.log(` ❌ Failed Queries:     ${failCount}/${totalRequests}`);
  console.log(` ⏱️  Total Duration:     ${duration} seconds`);
  console.log(` ⚡ Throughput:         ${rps} queries/second`);
  console.log("──────────────────────────────────────────────────");

  if (failCount === 0) {
    console.log("🎉 PASSED! Zero database connection drops or pool timeouts.\n");
  } else {
    console.log("⚠️ TEST FAILED with errors.\n");
  }
}

runStressTest()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Fatal stress test error:", err);
    process.exit(1);
  });
