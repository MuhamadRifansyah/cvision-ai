import { describe, expect, it } from "vitest";
import { MAX_FILE_SIZE, UploadValidationError, validateUpload } from "@/lib/upload-validation";
import { DocumentExtractionError, ensureUsableText, extractionFailureMessage } from "@/lib/document-extraction";

describe("upload validation", () => {
  it("accepts files only when extension, MIME type, and signature agree", () => {
    expect(validateUpload({ name: "resume.pdf", type: "application/pdf", size: 8, bytes: new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37]) })).toBe("pdf");
    expect(validateUpload({ name: "resume.docx", type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", size: 8, bytes: new Uint8Array([0x50, 0x4b, 0x03, 0x04, 0, 0, 0, 0]) })).toBe("docx");
  });

  it("rejects unsupported MIME types, mismatched signatures, and oversized files", () => {
    expect(() => validateUpload({ name: "resume.pdf", type: "text/plain", size: 8, bytes: new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0, 0, 0]) })).toThrow(UploadValidationError);
    expect(() => validateUpload({ name: "resume.docx", type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", size: 8, bytes: new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]) })).toThrow(UploadValidationError);
    expect(() => validateUpload({ name: "resume.pdf", type: "application/pdf", size: MAX_FILE_SIZE + 1, bytes: new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]) })).toThrow(/maksimal 5 MB/i);
  });
});

describe("extracted text safeguards", () => {
  it("rejects empty or scan-like extracted documents", () => {
    expect(() => ensureUsableText("too short")).toThrow(DocumentExtractionError);
    expect(ensureUsableText("word ".repeat(20))).toContain("word");
  });

  it("returns an actionable PDF extraction error without exposing parser internals", () => {
    expect(extractionFailureMessage("pdf", new Error("PasswordException"))).toMatch(/password/i);
    expect(extractionFailureMessage("pdf", new Error("broken xref"))).toMatch(/bisa diseleksi/i);
  });
});
