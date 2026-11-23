import { validateFile } from "../../storage/file-validation.js";
// @ts-nocheck
import { Router } from "express";
import { postgresDb } from "../../db/postgres.js";
import { authMiddleware } from "../../middleware/auth.middleware.js";
import { subscriptionEnforcementMiddleware } from "../../middleware/subscription.middleware.js";
import {
  UploadDocumentSchema,
  UpdateDocumentSchema,
} from "../../../shared/validation.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { storageService } from "../../storage/storage.service.js";

const privateDocsDir = path.resolve(
  process.env.DATA_DIR || path.join(process.cwd(), "data"),
  "private_documents",
);
const legacyUploadsDir = path.resolve(
  process.env.DATA_DIR || path.join(process.cwd(), "data"),
  "uploads",
);

if (!fs.existsSync(privateDocsDir)) {
  fs.mkdirSync(privateDocsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, privateDocsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${crypto.randomBytes(8).toString("hex")}`;
    const ext = path
      .extname(file.originalname)
      .toLowerCase()
      .replace(/[^a-z0-9.]/g, "");
    cb(null, `doc-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "application/pdf",
    ];
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(
        new Error(
          "فرمت فایل مجاز نیست. فقط تصاویر JPG/PNG و فایل‌های PDF پذیرفته می‌شوند.",
        ),
      );
    }
  },
});

const documentsRouter = Router();
documentsRouter.use(authMiddleware);
documentsRouter.use(subscriptionEnforcementMiddleware);

async function canAccessDocument(req, doc) {
  if (!doc) return false;
  const tenant = req.tenant.id;
  if (
    doc.property_id &&
    !(await postgresDb.getPropertyById(tenant, doc.property_id, req.user))
  )
    return false;
  if (
    doc.customer_id &&
    !(await postgresDb.getCustomerById(tenant, doc.customer_id, req.user))
  )
    return false;
  if (
    doc.transaction_id &&
    !(await postgresDb.getTransactionById(tenant, doc.transaction_id, req.user))
  )
    return false;
  return true;
}
async function requireDocumentAccess(req, res, next) {
  try {
    const doc = await postgresDb.getDocumentById(req.tenant.id, req.params.id);
    if (!(await canAccessDocument(req, doc)))
      return res
        .status(404)
        .json({
          success: false,
          error: {
            code: "NOT_FOUND",
            message: "سند یافت نشد یا دسترسی مجاز نیست.",
          },
        });
    next();
  } catch (error) {
    next(error);
  }
}

documentsRouter.get("/all", async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    const includeArchived = req.query.include_archived === "true";
    const docs = await postgresDb.getAllDocuments(tenantId, includeArchived);
    const visible = [];
    for (const doc of docs)
      if (await canAccessDocument(req, doc)) visible.push(doc);
    return res.json({ success: true, data: visible });
  } catch (err) {
    next(err);
  }
});

documentsRouter.post(
  "/upload",
  upload.single("file"),
  async (req, res, next) => {
    try {
      const tenantId = req.tenant.id;
      const userId = req.user.id;

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: {
            code: "FILE_REQUIRED",
            message: "هیچ فایلی برای بارگذاری ارسال نشده است.",
          },
        });
      }

      validateFile(
        await fs.promises.readFile(req.file.path),
        req.file.originalname,
        req.file.mimetype,
      );
      const validated = UploadDocumentSchema.parse(req.body);
      let propertyId = undefined;
      if (
        req.body.property_id &&
        req.body.property_id !== "" &&
        req.body.property_id !== "none"
      ) {
        const prop = await postgresDb.getPropertyById(
          tenantId,
          req.body.property_id,
          req.user,
        );
        if (!prop) {
          if (req.file) {
            try {
              fs.unlinkSync(req.file.path);
            } catch {}
          }
          return res.status(404).json({
            success: false,
            error: {
              code: "PROPERTY_NOT_FOUND",
              message: "ملک انتخابی یافت نشد یا دسترسی مجاز نیست.",
            },
          });
        }
        propertyId = prop.id;
      }

      let customerId = undefined;
      if (
        req.body.customer_id &&
        req.body.customer_id !== "" &&
        req.body.customer_id !== "none"
      ) {
        const cust = await postgresDb.getCustomerById(
          tenantId,
          req.body.customer_id,
          req.user,
        );
        if (!cust) {
          if (req.file) {
            try {
              fs.unlinkSync(req.file.path);
            } catch {}
          }
          return res.status(404).json({
            success: false,
            error: {
              code: "CUSTOMER_NOT_FOUND",
              message: "متقاضی انتخابی یافت نشد یا دسترسی مجاز نیست.",
            },
          });
        }
        customerId = cust.id;
      }

      const doc = await postgresDb.createDocument(tenantId, userId, {
        file_name: req.file.originalname,
        display_name: validated.display_name?.trim() || req.file.originalname,
        mime_type: req.file.mimetype,
        file_size: req.file.size,
        storage_key: req.file.filename,
        document_type: validated.document_type || "OTHER",
        description: validated.description,
        property_id: propertyId,
        customer_id: customerId,
      });

      return res.status(201).json({
        success: true,
        data: doc,
        message: "سند با موفقیت بارگذاری و ثبت شد.",
      });
    } catch (err) {
      if (req.file) {
        try {
          fs.unlinkSync(req.file.path);
        } catch {}
      }
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          success: false,
          error: {
            code: "FILE_TOO_LARGE",
            message: "حجم فایل بیشتر از حد مجاز (۱۰ مگابایت) است.",
          },
        });
      }
      next(err);
    }
  },
);

documentsRouter.get("/properties/:propertyId", async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    const propertyId = String(req.params.propertyId);
    const property = await postgresDb.getPropertyById(
      tenantId,
      propertyId,
      req.user,
    );
    if (!property) {
      return res.status(404).json({
        success: false,
        error: {
          code: "PROPERTY_NOT_FOUND",
          message: "ملک مورد نظر یافت نشد یا دسترسی مجاز نیست.",
        },
      });
    }
    const docs = await postgresDb.getDocumentsByProperty(tenantId, propertyId);
    return res.json({ success: true, data: docs });
  } catch (err) {
    next(err);
  }
});

documentsRouter.post(
  "/properties/:propertyId",
  upload.single("file"),
  async (req, res, next) => {
    try {
      const tenantId = req.tenant.id;
      const userId = req.user.id;
      const propertyId = String(req.params.propertyId);
      const property = await postgresDb.getPropertyById(
        tenantId,
        propertyId,
        req.user,
      );

      if (!property) {
        if (req.file) {
          try {
            fs.unlinkSync(req.file.path);
          } catch {}
        }
        return res.status(404).json({
          success: false,
          error: {
            code: "PROPERTY_NOT_FOUND",
            message: "ملک مورد نظر یافت نشد یا دسترسی مجاز نیست.",
          },
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: {
            code: "FILE_REQUIRED",
            message: "هیچ فایلی برای بارگذاری ارسال نشده است.",
          },
        });
      }

      validateFile(
        await fs.promises.readFile(req.file.path),
        req.file.originalname,
        req.file.mimetype,
      );
      const validated = UploadDocumentSchema.parse(req.body);
      const doc = await postgresDb.createDocument(tenantId, userId, {
        file_name: req.file.originalname,
        display_name: validated.display_name?.trim() || req.file.originalname,
        mime_type: req.file.mimetype,
        file_size: req.file.size,
        storage_key: req.file.filename,
        document_type: validated.document_type || "OTHER",
        description: validated.description,
        property_id: propertyId,
      });

      return res.status(201).json({
        success: true,
        data: doc,
        message: "سند با موفقیت بارگذاری و پیوست شد.",
      });
    } catch (err) {
      if (req.file) {
        try {
          fs.unlinkSync(req.file.path);
        } catch {}
      }
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          success: false,
          error: {
            code: "FILE_TOO_LARGE",
            message: "حجم فایل بیشتر از حد مجاز (۱۰ مگابایت) است.",
          },
        });
      }
      next(err);
    }
  },
);

documentsRouter.get("/customers/:customerId", async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    const customerId = String(req.params.customerId);
    const customer = await postgresDb.getCustomerById(
      tenantId,
      customerId,
      req.user,
    );
    if (!customer) {
      return res.status(404).json({
        success: false,
        error: {
          code: "CUSTOMER_NOT_FOUND",
          message: "متقاضی مورد نظر یافت نشد یا دسترسی مجاز نیست.",
        },
      });
    }
    const docs = await postgresDb.getDocumentsByCustomer(tenantId, customerId);
    return res.json({ success: true, data: docs });
  } catch (err) {
    next(err);
  }
});

documentsRouter.post(
  "/customers/:customerId",
  upload.single("file"),
  async (req, res, next) => {
    try {
      const tenantId = req.tenant.id;
      const userId = req.user.id;
      const customerId = String(req.params.customerId);
      const customer = await postgresDb.getCustomerById(
        tenantId,
        customerId,
        req.user,
      );

      if (!customer) {
        if (req.file) {
          try {
            fs.unlinkSync(req.file.path);
          } catch {}
        }
        return res.status(404).json({
          success: false,
          error: {
            code: "CUSTOMER_NOT_FOUND",
            message: "متقاضی مورد نظر یافت نشد یا دسترسی مجاز نیست.",
          },
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: {
            code: "FILE_REQUIRED",
            message: "هیچ فایلی برای بارگذاری ارسال نشده است.",
          },
        });
      }

      validateFile(
        await fs.promises.readFile(req.file.path),
        req.file.originalname,
        req.file.mimetype,
      );
      const validated = UploadDocumentSchema.parse(req.body);
      const doc = await postgresDb.createDocument(tenantId, userId, {
        file_name: req.file.originalname,
        display_name: validated.display_name?.trim() || req.file.originalname,
        mime_type: req.file.mimetype,
        file_size: req.file.size,
        storage_key: req.file.filename,
        document_type: validated.document_type || "OTHER",
        description: validated.description,
        customer_id: customerId,
      });

      return res.status(201).json({
        success: true,
        data: doc,
        message: "سند متقاضی با موفقیت بارگذاری و پیوست شد.",
      });
    } catch (err) {
      if (req.file) {
        try {
          fs.unlinkSync(req.file.path);
        } catch {}
      }
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(400).json({
          success: false,
          error: {
            code: "FILE_TOO_LARGE",
            message: "حجم فایل بیشتر از حد مجاز (۱۰ مگابایت) است.",
          },
        });
      }
      next(err);
    }
  },
);

documentsRouter.get(
  "/:id/download",
  requireDocumentAccess,
  async (req, res, next) => {
    try {
      const tenantId = req.tenant.id;
      const documentId = req.params.id;
      const doc = await postgresDb.getDocumentById(tenantId, documentId);
      const allowArchived = req.query.allow_archived === "true";

      if (!doc || (doc.is_archived && !allowArchived)) {
        return res.status(404).json({
          success: false,
          error: {
            code: "DOCUMENT_NOT_FOUND",
            message: "سند مورد نظر یافت نشد.",
          },
        });
      }

      if (doc.property_id) {
        const prop = await postgresDb.getPropertyById(
          tenantId,
          doc.property_id,
          req.user,
        );
        if (!prop) {
          return res.status(403).json({
            success: false,
            error: {
              code: "ACCESS_DENIED",
              message: "شما به این سند دسترسی ندارید.",
            },
          });
        }
      }

      if (doc.customer_id) {
        const cust = await postgresDb.getCustomerById(
          tenantId,
          doc.customer_id,
          req.user,
        );
        if (!cust) {
          return res.status(403).json({
            success: false,
            error: {
              code: "ACCESS_DENIED",
              message: "شما به این سند دسترسی ندارید.",
            },
          });
        }
      }

      // Path traversal protection and robust file lookup
      let filePath = storageService.getFilePath(doc.storage_key, tenantId);
      if (!filePath) {
        const safeKey = path.basename(doc.storage_key);
        const candidates = [
          path.join(privateDocsDir, safeKey),
          path.join(privateDocsDir, tenantId, safeKey),
          path.join(legacyUploadsDir, safeKey),
          path.join(legacyUploadsDir, tenantId, safeKey),
        ];
        for (const c of candidates) {
          if (fs.existsSync(c)) {
            filePath = c;
            break;
          }
        }
      }

      if (!filePath || !fs.existsSync(filePath)) {
        return res
          .status(404)
          .json({
            success: false,
            error: {
              code: "FILE_MISSING",
              message: "فایل سند در دسترس نیست؛ با پشتیبانی تماس بگیرید.",
            },
          });
      }

      await postgresDb.addAuditLog(
        tenantId,
        req.user.id,
        "DOCUMENT_DOWNLOADED",
        "DOCUMENT",
        documentId,
        {
          display_name: doc.display_name,
        },
      );

      const encodedFileName = encodeURIComponent(
        doc.file_name || `${doc.display_name || "document"}.pdf`,
      );
      const asciiFallback = (doc.file_name || "document.pdf").replace(
        /[^\x20-\x7E]/g,
        "_",
      );
      res.setHeader("Content-Type", doc.mime_type || "application/pdf");
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encodedFileName}`,
      );
      return res.sendFile(filePath);
    } catch (err) {
      next(err);
    }
  },
);

documentsRouter.patch("/:id", requireDocumentAccess, async (req, res, next) => {
  try {
    const tenantId = req.tenant.id;
    const userId = req.user.id;
    const documentId = req.params.id;
    const validated = UpdateDocumentSchema.parse(req.body);
    const updated = await postgresDb.updateDocument(
      tenantId,
      userId,
      documentId,
      validated,
    );
    if (!updated) {
      return res.status(404).json({
        success: false,
        error: {
          code: "DOCUMENT_NOT_FOUND",
          message: "سند مورد نظر یافت نشد.",
        },
      });
    }
    return res.json({
      success: true,
      data: updated,
      message: "مشخصات سند با موفقیت بروزرسانی شد.",
    });
  } catch (err) {
    next(err);
  }
});

documentsRouter.delete(
  "/:id",
  requireDocumentAccess,
  async (req, res, next) => {
    try {
      const tenantId = req.tenant.id;
      const userId = req.user.id;
      const documentId = req.params.id;
      const archived = await postgresDb.archiveDocument(
        tenantId,
        userId,
        documentId,
      );
      if (!archived) {
        return res.status(404).json({
          success: false,
          error: {
            code: "DOCUMENT_NOT_FOUND",
            message: "سند مورد نظر یافت نشد.",
          },
        });
      }
      return res.json({
        success: true,
        message: "سند با موفقیت بایگانی (حذف نرم) شد.",
      });
    } catch (err) {
      next(err);
    }
  },
);

documentsRouter.post(
  "/:id/restore",
  requireDocumentAccess,
  async (req, res, next) => {
    try {
      const tenantId = req.tenant.id;
      const userId = req.user.id;
      const documentId = req.params.id;
      const restored = await postgresDb.unarchiveDocument(
        tenantId,
        userId,
        documentId,
      );
      if (!restored) {
        return res.status(404).json({
          success: false,
          error: {
            code: "DOCUMENT_NOT_FOUND",
            message: "سند مورد نظر یافت نشد.",
          },
        });
      }
      return res.json({
        success: true,
        message: "سند با موفقیت از بایگانی بازیابی و فعال شد.",
      });
    } catch (err) {
      next(err);
    }
  },
);

export { documentsRouter };
