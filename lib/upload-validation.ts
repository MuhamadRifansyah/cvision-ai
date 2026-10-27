export const MAX_FILE_SIZE = 5 * 1024 * 1024;

const acceptedTypes = {
  pdf: ["application/pdf"],
  docx: [
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/zip",
  ],
} as const;

export type ValidatedFileType = "pdf" | "docx";

export type UploadCandidate = {
  name: string;
  type: string;
  size: number;
  bytes: Uint8Array;
};

export class UploadValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UploadValidationError";
  }
}

function hasPrefix(bytes: Uint8Array, prefix: number[]) {
  return prefix.every((byte, index) => bytes[index] === byte);
}

function extensionOf(name: string) {
  return name.trim().toLowerCase().split(".").pop();
}

export function validateUpload(file: UploadCandidate): ValidatedFileType {
  if (!file.name || file.name.length > 180) {
    throw new UploadValidationError("Nama file tidak valid.");
  }
  if (!Number.isSafeInteger(file.size) || file.size <= 0) {
    throw new UploadValidationError("File tidak boleh kosong.");
  }
  if (file.size > MAX_FILE_SIZE) {
    throw new UploadValidationError("Ukuran file maksimal 5 MB.");
  }

  const extension = extensionOf(file.name);
  const mime = file.type.toLowerCase();
  const isPdf = hasPrefix(file.bytes, [0x25, 0x50, 0x44, 0x46, 0x2d]);
  const isZip = hasPrefix(file.bytes, [0x50, 0x4b, 0x03, 0x04]);

  if (extension === "pdf") {
    if (!acceptedTypes.pdf.includes(mime as "application/pdf") || !isPdf) {
      throw new UploadValidationError("File PDF tidak cocok dengan tipe atau signature-nya.");
    }
    return "pdf";
  }

  if (extension === "docx") {
    if (!acceptedTypes.docx.includes(mime as "application/vnd.openxmlformats-officedocument.wordprocessingml.document" | "application/zip") || !isZip) {
      throw new UploadValidationError("File DOCX tidak cocok dengan tipe atau signature-nya.");
    }
    return "docx";
  }

  throw new UploadValidationError("Format belum didukung. Upload PDF atau DOCX.");
}
