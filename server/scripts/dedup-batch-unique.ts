/**
 * 数据去重脚本：查找并修复 `batches` 表中 batchNo + productId 重复的记录。
 *
 * 在运行 `npx prisma migrate deploy` 之前执行此脚本，确保 @@unique([batchNo, productId])
 * 约束迁移不会因现有重复数据而失败。
 *
 * 使用方式：
 *   cd server && npx tsx scripts/dedup-batch-unique.ts
 *
 * 去重策略：对每组重复记录，保留 id 最小的那条，其余记录的 batchNo 追加 `_dup_<id>` 后缀。
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // 找出 batchNo + productId 重复的分组
  const duplicates = await prisma.$queryRaw<
    Array<{ batchNo: string; productId: number; cnt: bigint }>
  >`
    SELECT batch_no AS "batchNo", product_id AS "productId", COUNT(*) AS cnt
    FROM batches
    WHERE product_id IS NOT NULL
    GROUP BY batch_no, product_id
    HAVING COUNT(*) > 1
  `;

  if (duplicates.length === 0) {
    console.log("✓ 未发现重复的 (batchNo, productId) 组合，无需处理。");
    await prisma.$disconnect();
    return;
  }

  console.log(`发现 ${duplicates.length} 组重复记录：`);

  for (const dup of duplicates) {
    const records = await prisma.batch.findMany({
      where: { batchNo: dup.batchNo, productId: dup.productId },
      orderBy: { id: "asc" },
      select: { id: true, batchNo: true, productId: true },
    });

    // 保留第一条（id 最小），其余重命名
    const [keep, ...toRename] = records;
    console.log(`  重复组：batchNo="${dup.batchNo}", productId=${dup.productId}`);
    console.log(`    → 保留记录 ID=${keep.id}`);
    for (const r of toRename) {
      const newBatchNo = `${r.batchNo}_dup_${r.id}`;
      await prisma.batch.update({
        where: { id: r.id },
        data: { batchNo: newBatchNo },
      });
      console.log(`    → 重命名 ID=${r.id} 的 batchNo: "${r.batchNo}" → "${newBatchNo}"`);
    }
  }

  console.log("\n✓ 去重完成，现在可以安全执行 npx prisma migrate deploy");
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("去重脚本执行失败:", e);
  process.exit(1);
});
