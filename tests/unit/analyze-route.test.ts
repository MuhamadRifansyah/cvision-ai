import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { POST } from "@/app/api/analyze/route";

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

async function syntheticDocx() {
  const zip = new JSZip();
  zip.file("[Content_Types].xml", `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`);
  zip.file("_rels/.rels", `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);
  const paragraphs = [
    "Maya Putri maya@example.com linkedin.com/in/mayaputri",
    "Professional Summary", "Skills React TypeScript Next.js SQL Docker Git", "Experience",
    "Led development of a React dashboard for 10000 users and reduced reporting time by 35%.",
    "Built API integrations and improved release quality by 20%.", "Education", "Bachelor of Computer Science",
  ].map((text) => `<w:p><w:r><w:t>${text}</w:t></w:r></w:p>`).join("");
  zip.file("word/document.xml", `<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paragraphs}</w:body></w:document>`);
  return zip.generateAsync({ type: "uint8array" });
}

function requestFrom(formData: FormData) {
  return new Request("http://localhost/api/analyze", { method: "POST", body: formData });
}

describe("POST /api/analyze", () => {
  it("processes a synthetic DOCX without storing or caching its contents", async () => {
    const formData = new FormData();
    const bytes = await syntheticDocx();
    const buffer = new ArrayBuffer(bytes.byteLength);
    new Uint8Array(buffer).set(bytes);
    formData.append("cv", new Blob([buffer], { type: DOCX_MIME }), "synthetic-cv.docx");
    formData.append("jobDescription", "React TypeScript engineer with Docker and SQL experience");

    const response = await POST(requestFrom(formData));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(payload).toMatchObject({ mode: "job-match", keywordMatch: { totalConsidered: expect.any(Number) } });
  });

  it("rejects a document whose claimed format does not match its signature", async () => {
    const formData = new FormData();
    formData.append("cv", new Blob(["not a PDF"], { type: "application/pdf" }), "unsafe.pdf");

    const response = await POST(requestFrom(formData));
    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toMatchObject({ message: expect.stringMatching(/signature/i) });
  });
});
