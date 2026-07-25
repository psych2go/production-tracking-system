/**
 * 解析列表分页参数：page 从 1 起，pageSize 限制在 [1, maxPageSize]。
 * 拒绝 0、负数、NaN、超大值（防 DoS 与 Prisma skip/take 越界报错）。
 */
export function parsePagination(
  query: Record<string, unknown>,
  opts: { pageDefault?: number; pageSizeDefault?: number; maxPageSize?: number; maxPage?: number } = {}
): { page: number; pageSize: number } {
  const { pageDefault = 1, pageSizeDefault = 50, maxPageSize = 100, maxPage = 10000 } = opts;

  const rawPage = Math.floor(Number(query.page));
  const page = Number.isFinite(rawPage) && rawPage >= 1 ? Math.min(rawPage, maxPage) : pageDefault;

  const rawPageSize = Math.floor(Number(query.pageSize));
  const pageSize = Number.isFinite(rawPageSize) && rawPageSize >= 1
    ? Math.min(rawPageSize, maxPageSize)
    : pageSizeDefault;

  return { page, pageSize };
}
