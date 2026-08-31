import { describe, it, expect } from "vitest";
import { registerSchema, resetPasswordSchema, changePasswordSchema } from "@/schemas/auth";
import { groupSchema } from "@/schemas/groups";
import { taskDetailsSchema } from "@/schemas/tasks";
import {
  materialUploadSchema,
  MAX_MATERIAL_FILE_SIZE,
  ALLOWED_MATERIAL_EXTENSIONS,
  ALLOWED_MATERIAL_MIME_TYPES,
} from "@/schemas/materials";

describe("registerSchema", () => {
  it("rejects a password shorter than 8 characters", () => {
    const result = registerSchema.safeParse({ email: "a@b.com", password: "short1" });
    expect(result.success).toBe(false);
  });

  it("accepts an 8-character password with a valid email", () => {
    const result = registerSchema.safeParse({ email: "a@b.com", password: "12345678" });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid email address", () => {
    const result = registerSchema.safeParse({ email: "not-an-email", password: "12345678" });
    expect(result.success).toBe(false);
  });
});

describe("resetPasswordSchema", () => {
  it("rejects mismatched password/confirmPassword", () => {
    const result = resetPasswordSchema.safeParse({
      password: "12345678",
      confirmPassword: "87654321",
    });
    expect(result.success).toBe(false);
  });

  it("accepts matching passwords of valid length", () => {
    const result = resetPasswordSchema.safeParse({
      password: "12345678",
      confirmPassword: "12345678",
    });
    expect(result.success).toBe(true);
  });
});

describe("changePasswordSchema", () => {
  it("rejects a new password identical to the current password", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "12345678",
      newPassword: "12345678",
      confirmNewPassword: "12345678",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a valid, different new password with matching confirmation", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "12345678",
      newPassword: "87654321",
      confirmNewPassword: "87654321",
    });
    expect(result.success).toBe(true);
  });
});

describe("groupSchema", () => {
  const base = {
    name: "TEST_ Group",
    description: "",
    groupType: "study" as const,
    courseId: "00000000-0000-0000-0000-000000000000",
    targetDegree: "",
    targetYear: "",
    maxMembers: 5,
  };

  it("rejects an empty group name", () => {
    const result = groupSchema.safeParse({ ...base, name: "   " });
    expect(result.success).toBe(false);
  });

  it("rejects maxMembers below 2", () => {
    const result = groupSchema.safeParse({ ...base, maxMembers: 1 });
    expect(result.success).toBe(false);
  });

  it("accepts maxMembers of exactly 2 (the minimum allowed)", () => {
    const result = groupSchema.safeParse({ ...base, maxMembers: 2 });
    expect(result.success).toBe(true);
  });

  it("rejects a non-UUID courseId", () => {
    const result = groupSchema.safeParse({ ...base, courseId: "not-a-uuid" });
    expect(result.success).toBe(false);
  });
});

describe("taskDetailsSchema", () => {
  it("rejects an empty title", () => {
    const result = taskDetailsSchema.safeParse({
      title: "   ",
      description: "",
      assigneeId: "",
      dueDate: "",
    });
    expect(result.success).toBe(false);
  });

  it("accepts a valid title with empty optional fields", () => {
    const result = taskDetailsSchema.safeParse({
      title: "TEST_ Task",
      description: "",
      assigneeId: "",
      dueDate: "",
    });
    expect(result.success).toBe(true);
  });
});

describe("materialUploadSchema", () => {
  it("rejects an empty title", () => {
    const result = materialUploadSchema.safeParse({ title: "  ", category: "summary" });
    expect(result.success).toBe(false);
  });

  it("rejects a category outside the allowed enum", () => {
    const result = materialUploadSchema.safeParse({ title: "TEST_ Material", category: "notes" });
    expect(result.success).toBe(false);
  });

  it("accepts a valid title and category", () => {
    const result = materialUploadSchema.safeParse({ title: "TEST_ Material", category: "summary" });
    expect(result.success).toBe(true);
  });
});

describe("material upload constants", () => {
  it("caps file size at 20MB", () => {
    expect(MAX_MATERIAL_FILE_SIZE).toBe(20 * 1024 * 1024);
  });

  it("allows the documented file types (PDF, Word, PowerPoint, text, images)", () => {
    for (const ext of [".pdf", ".doc", ".docx", ".ppt", ".pptx", ".txt", ".png", ".jpg", ".jpeg"]) {
      expect(ALLOWED_MATERIAL_EXTENSIONS).toContain(ext);
    }
    expect(ALLOWED_MATERIAL_MIME_TYPES).toContain("application/pdf");
  });
});
