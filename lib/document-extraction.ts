import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";
import type { ValidatedFileType } from "@/lib/upload-validation";

export class DocumentExtractionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DocumentExtractionError";
  }
}

export function cleanExtractedText(value: string) {
  return value.replace(/\u0000/g, "").replace(/\s+/g, " ").trim();
}

export function ensureUsableText(value: string) {
  const text = cleanExtractedText(value);
  if (text.length < 80) {
    throw new DocumentExtractionError(
      "Teks CV tidak cukup terbaca. Jika ini PDF hasil scan, gunakan PDF yang bisa diseleksi atau DOCX.",
    );
  }
  return text.slice(0, 100_000);
}

export function extractionFailureMessage(type: ValidatedFileType, error: unknown) {
  const cause = error instanceof Error ? error.message.toLowerCase() : "";
  if (type === "pdf" && /password|encrypted|encryption/.test(cause)) {
    return "PDF ini dilindungi password. Hapus password-nya lalu upload ulang.";
  }
  if (type === "pdf") {
    return "Teks pada PDF tidak dapat diekstrak. Pastikan PDF tidak terkunci dan teksnya bisa diseleksi. Untuk PDF hasil scan, gunakan versi OCR atau upload DOCX.";
  }
  return "Dokumen DOCX tidak dapat dibaca. Buka dokumen di Word/Google Docs lalu simpan ulang sebagai DOCX dan coba lagi.";
}

export async function extractDocumentText(bytes: Uint8Array, type: ValidatedFileType) {
  try {
    if (type === "docx") {
      const result = await mammoth.extractRawText({ buffer: Buffer.from(bytes) });
      return ensureUsableText(result.value);
    }

    const parser = new PDFParse({ data: Buffer.from(bytes) });
    try {
      const result = await parser.getText();
      return ensureUsableText(result.text);
    } finally {
      await parser.destroy();
    }
  } catch (error) {
    if (error instanceof DocumentExtractionError) throw error;
    throw new DocumentExtractionError(extractionFailureMessage(type, error));
  }
}
