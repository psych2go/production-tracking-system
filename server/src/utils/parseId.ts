export function parseId(value: string | string[] | undefined, label = "ID"): number {
  if (!value) throw new Error(`缺少${label}参数`);
  const raw = Array.isArray(value) ? value[0] : value;
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) throw new Error(`无效的${label}`);
  return id;
}
