import { Router } from "express";
import { z } from "zod";
import { authGuard, roleGuard } from "../middleware/auth.js";
import { validate } from "../middleware/validator.js";
import { auditLog } from "../middleware/audit.js";
import { createStage, updateStage, deleteStage, listPackageTypes, createPackageType, deletePackageType, listCustomerCodes, createCustomerCode, deleteCustomerCode } from "../services/settings.js";

export const settingsRoutes = Router();

const createStageSchema = z.object({
  code: z.string().min(1, "工序代码不能为空"),
  name: z.string().min(1, "工序名称不能为空"),
  stageOrder: z.number().int().positive("排序号必须大于0"),
  isQcStage: z.boolean().optional(),
  description: z.string().optional(),
});

const updateStageSchema = z.object({
  name: z.string().min(1).optional(),
  stageOrder: z.number().int().positive().optional(),
  isQcStage: z.boolean().optional(),
  description: z.string().nullable().optional(),
});

// Create stage
settingsRoutes.post(
  "/stages",
  authGuard,
  roleGuard("admin"),
  auditLog("create", "stage"),
  validate(createStageSchema),
  async (req, res, next) => {
    try {
      const stage = await createStage(req.body);
      res.status(201).json(stage);
    } catch (err) {
      next(err);
    }
  }
);

// Update stage
settingsRoutes.put(
  "/stages/:id",
  authGuard,
  roleGuard("admin"),
  auditLog("update", "stage"),
  validate(updateStageSchema),
  async (req, res, next) => {
    try {
      const stage = await updateStage(parseInt(req.params.id as string), req.body);
      res.json(stage);
    } catch (err) {
      next(err);
    }
  }
);

// Delete stage
settingsRoutes.delete(
  "/stages/:id",
  authGuard,
  roleGuard("admin"),
  auditLog("delete", "stage"),
  async (req, res, next) => {
    try {
      const stage = await deleteStage(parseInt(req.params.id as string));
      res.json(stage);
    } catch (err) {
      next(err);
    }
  }
);

// ===== Package Type Routes =====

const createPackageTypeSchema = z.object({
  name: z.string().min(1, "封装形式名称不能为空"),
  category: z.string().optional(),
  sortOrder: z.number().int().optional(),
});

// List package types
settingsRoutes.get(
  "/package-types",
  authGuard,
  async (_req, res, next) => {
    try {
      const types = await listPackageTypes();
      res.json(types);
    } catch (err) {
      next(err);
    }
  }
);

// Create package type
settingsRoutes.post(
  "/package-types",
  authGuard,
  roleGuard("admin"),
  auditLog("create", "package_type"),
  validate(createPackageTypeSchema),
  async (req, res, next) => {
    try {
      const pt = await createPackageType(req.body);
      res.status(201).json(pt);
    } catch (err) {
      next(err);
    }
  }
);

// Delete package type
settingsRoutes.delete(
  "/package-types/:id",
  authGuard,
  roleGuard("admin"),
  auditLog("delete", "package_type"),
  async (req, res, next) => {
    try {
      const pt = await deletePackageType(parseInt(req.params.id as string));
      res.json(pt);
    } catch (err) {
      next(err);
    }
  }
);

// ===== Customer Code Routes =====

const createCustomerCodeSchema = z.object({
  code: z.string().min(1, "客户代码不能为空"),
});

// List customer codes
settingsRoutes.get(
  "/customer-codes",
  authGuard,
  async (_req, res, next) => {
    try {
      const codes = await listCustomerCodes();
      res.json(codes);
    } catch (err) {
      next(err);
    }
  }
);

// Create customer code
settingsRoutes.post(
  "/customer-codes",
  authGuard,
  roleGuard("admin"),
  auditLog("create", "customer_code"),
  validate(createCustomerCodeSchema),
  async (req, res, next) => {
    try {
      const cc = await createCustomerCode(req.body);
      res.status(201).json(cc);
    } catch (err) {
      next(err);
    }
  }
);

// Delete customer code
settingsRoutes.delete(
  "/customer-codes/:id",
  authGuard,
  roleGuard("admin"),
  auditLog("delete", "customer_code"),
  async (req, res, next) => {
    try {
      const cc = await deleteCustomerCode(parseInt(req.params.id as string));
      res.json(cc);
    } catch (err) {
      next(err);
    }
  }
);
