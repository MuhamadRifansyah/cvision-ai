import { NextResponse } from "next/server";
import { analyzeCv } from "@/lib/analysis";
import { DocumentExtractionError, extractDocumentText } from "@/lib/document-extraction";
import { checkRateLimit } from "@/lib/rate-limit";
import { ProviderRateLimitError, ProviderResponseError, ProviderTimeoutError } from "@/lib/llm/provider";
import { UploadValidationError, validateUpload } from "@/lib/upload-validation";

export const runtime = "nodejs";

const MAX_JOB_DESCRIPTION_CHARS = 12_000;

function response(payload: unknown, status = 200) {
  return NextResponse.json(payload, {
    status,
    headers: {
      "Cache-Control": "no-store, max-age=0",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function clientKey(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anonymous";
}

export async function POST(request: Request) {
  const rateLimit = checkRateLimit(clientKey(request));
  if (!rateLimit.allowed) {
    return response({ message: "Terlalu banyak analisis. Coba lagi sebentar.", retryAfter: rateLimit.retryAfterSeconds }, 429);
  }

  try {
    const formData = await request.formData();
    const files = formData.getAll("cv").filter((value): value is File => value instanceof File);
    if (files.length !== 1) return response({ message: "Upload tepat satu file CV." }, 400);

    const jobDescriptionValue = formData.get("jobDescription");
    const jobDescription = typeof jobDescriptionValue === "string" ? jobDescriptionValue.trim() : "";
    if (jobDescription.length > MAX_JOB_DESCRIPTION_CHARS) {
      return response({ message: "Deskripsi pekerjaan maksimal 12.000 karakter." }, 400);
    }

    const file = files[0];
    const bytes = new Uint8Array(await file.arrayBuffer());
    const type = validateUpload({ name: file.name, type: file.type, size: file.size, bytes });
    const cvText = await extractDocumentText(bytes, type);
    const result = await analyzeCv(cvText, jobDescription || undefined);

    // Raw CV contents and uploaded bytes are intentionally never logged or persisted.
    return response(result);
  } catch (error) {
    if (error instanceof UploadValidationError || error instanceof DocumentExtractionError) {
      return response({ message: error.message }, 400);
    }
    if (error instanceof ProviderTimeoutError) {
      return response({ message: "AI reviewer melebihi batas waktu. Coba lagi." }, 504);
    }
    if (error instanceof ProviderRateLimitError) {
      return response({ message: "AI reviewer sedang banyak digunakan. Coba lagi sebentar." }, 429);
    }
    if (error instanceof ProviderResponseError) {
      return response({ message: "AI reviewer belum tersedia. Coba lagi nanti." }, 502);
    }
    return response({ message: "Analisis belum bisa diproses. Coba ulang beberapa saat lagi." }, 500);
  }
}
