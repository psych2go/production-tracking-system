import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

export async function listUsers(filters: {
  keyword?: string;
  role?: string;
  page?: number;
  pageSize?: number;
}) {
  const { keyword, role, page = 1, pageSize = 20 } = filters;

  const where: Record<string, unknown> = {};
  if (role) where.role = role;
  if (keyword) {
    where.OR = [
      { name: { contains: keyword } },
      { department: { contains: keyword } },
      { wwUserId: { contains: keyword } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        wwUserId: true,
        name: true,
        department: true,
        role: true,
        avatarUrl: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.user.count({ where }),
  ]);

  return { items, total, page, pageSize };
}

export async function updateUser(
  id: number,
  data: { role?: string; department?: string; isActive?: boolean }
) {
  return prisma.user.update({
    where: { id },
    data,
    select: {
      id: true,
      wwUserId: true,
      name: true,
      department: true,
      role: true,
      avatarUrl: true,
      isActive: true,
    },
  });
}

export async function deactivateUser(id: number) {
  return prisma.user.update({
    where: { id },
    data: { isActive: false },
    select: {
      id: true,
      name: true,
      isActive: true,
    },
  });
}
