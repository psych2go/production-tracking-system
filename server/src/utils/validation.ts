import { z } from "zod";

export const TEXT_LIMITS = {
  shortCode: 100,
  name: 100,
  packageType: 500,
  notes: 2_000,
  authCode: 2_048,
  password: 256,
  query: 100,
} as const;

export function requiredText(max: number, emptyMessage: string) {
  return z.string().min(1, emptyMessage).max(max, `内容不能超过${max}个字符`);
}

export function optionalText(max: number) {
  return z.string().max(max, `内容不能超过${max}个字符`).optional();
}

export function nullableText(max: number) {
  return z.string().max(max, `内容不能超过${max}个字符`).nullable().optional();
}

export function isoDate(label: string) {
  return z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, `${label}格式必须为YYYY-MM-DD`)
    .refine((value) => {
      const date = new Date(`${value}T00:00:00.000Z`);
      return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
    }, `${label}不是有效日期`);
}

export function boundedQuery(
  value: unknown,
  label: string,
  max: number = TEXT_LIMITS.query,
): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string") throw new Error(`${label}参数格式无效`);
  if (value.length > max) throw new Error(`${label}不能超过${max}个字符`);
  return value;
}

export function dateQuery(value: unknown, label: string): string | undefined {
  const parsed = boundedQuery(value, label, 10);
  if (parsed === undefined) return undefined;
  return isoDate(label).parse(parsed);
}
