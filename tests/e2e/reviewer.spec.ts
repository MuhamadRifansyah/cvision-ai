import { expect, test, type Page } from "@playwright/test";

const successfulAnalysis = {
  overallScore: 78,
  mode: "job-match",
  summary: "Estimasi ini menggabungkan kualitas CV dan kecocokan bukti.",
  categoryScores: [
    { id: "structure", label: "Struktur & keterbacaan", score: 80, weight: 25, explanation: "Bagian CV terdeteksi." },
    { id: "keywords", label: "Kecocokan kata kunci", score: 75, weight: 30, explanation: "3 dari 4 kata kunci ditemukan." },
    { id: "experience", label: "Pengalaman & dampak", score: 72, weight: 25, explanation: "Metrik terdeteksi." },
    { id: "skills", label: "Skills & relevansi", score: 85, weight: 20, explanation: "Skill relevan terdeteksi." },
  ],
  strengths: ["Struktur CV mudah dipindai."],
  gaps: ["Tambahkan satu metrik lagi."],
  recommendations: [{ priority: "high", title: "Buat pencapaian lebih terukur", detail: "Tambahkan dampak yang jujur.", category: "Pengalaman" }],
  evidence: ["5/5 bagian inti terdeteksi."],
  keywordMatch: { matched: ["react", "typescript"], missing: ["docker"], totalConsidered: 3 },
  aiStatus: "local-mock",
  injectionWarning: false,
};

async function selectPdf(page: Page) {
  await page.locator("#cv-upload").setInputFiles({
    name: "synthetic-cv.pdf",
    mimeType: "application/pdf",
    buffer: Buffer.from("%PDF-1.7 synthetic"),
  });
}

test("renders the reviewer and prevents an empty submission", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: /buat cv yang lebih siap/i })).toBeVisible();
  await page.getByRole("button", { name: /analisis cv saya/i }).click();
  await expect(page.getByText(/pilih cv pdf atau docx terlebih dahulu/i)).toBeVisible();
});

test("rejects an unsupported file before sending it", async ({ page }) => {
  await page.goto("/");
  await page.locator("#cv-upload").setInputFiles({ name: "resume.txt", mimeType: "text/plain", buffer: Buffer.from("not a resume") });
  await expect(page.getByText(/format belum didukung/i)).toBeVisible();
});

test("renders a completed review after upload", async ({ page }) => {
  await page.route("/api/analyze", (route) => route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(successfulAnalysis) }));
  await page.goto("/");
  await selectPdf(page);
  await page.getByRole("button", { name: /analisis cv saya/i }).click();
  await expect(page.getByRole("heading", { name: /cv readiness report/i })).toBeVisible();
  await expect(page.getByText("Kecocokan kata kunci").first()).toBeVisible();
  await expect(page.getByText("Buat pencapaian lebih terukur")).toBeVisible();
});

test("shows an API failure and lets the user retry", async ({ page }) => {
  let attempts = 0;
  await page.route("/api/analyze", (route) => {
    attempts += 1;
    return attempts === 1
      ? route.fulfill({ status: 500, contentType: "application/json", body: JSON.stringify({ message: "Provider timeout" }) })
      : route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(successfulAnalysis) });
  });
  await page.goto("/");
  await selectPdf(page);
  await page.getByRole("button", { name: /analisis cv saya/i }).click();
  await expect(page.getByText("Provider timeout")).toBeVisible();
  await page.getByRole("button", { name: /analisis cv saya/i }).click();
  await expect(page.getByRole("heading", { name: /cv readiness report/i })).toBeVisible();
});
