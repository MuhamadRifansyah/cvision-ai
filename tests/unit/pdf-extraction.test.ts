import { describe, expect, it } from "vitest";
import { extractDocumentText } from "@/lib/document-extraction";

function syntheticPdf(text: string) {
  const stream = `BT\n/F1 12 Tf\n72 720 Td\n(${text.replace(/[()\\]/g, "\\$&")}) Tj\nET`;
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let pdf = "%PDF-1.4\n%\xFF\xFF\xFF\xFF\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`).join("");
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return new Uint8Array(Buffer.from(pdf, "binary"));
}

describe("PDF extraction", () => {
  it("extracts readable text from a valid text PDF", async () => {
    const source = "Maya Putri Experience React TypeScript delivered measurable dashboard improvements for users ".repeat(2);
    await expect(extractDocumentText(syntheticPdf(source), "pdf")).resolves.toContain("Maya Putri");
  });
});
