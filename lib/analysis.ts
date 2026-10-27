import { analysisResultSchema, type AnalysisResult, type Recommendation } from "@/lib/schemas";
import { getSuggestionProvider } from "@/lib/llm/provider";

const STOP_WORDS = new Set([
  "and", "the", "for", "with", "from", "this", "that", "will", "your", "you", "our", "are", "job", "role", "work", "team", "years", "year", "have", "has", "who", "all", "their", "into", "using", "about", "within", "ability", "skills", "experience", "required", "preferred", "candidate", "position", "responsible", "including", "through", "strong", "plus", "can", "also", "atau", "dan", "yang", "dengan", "untuk", "pada", "dari", "dalam", "sebagai", "kami", "anda", "memiliki", "pengalaman", "kerja", "posisi", "kandidat", "tahun",
]);

const SKILL_VOCAB = [
  "react", "next.js", "nextjs", "typescript", "javascript", "node.js", "nodejs", "python", "java", "sql", "postgresql", "mysql", "mongodb", "aws", "azure", "gcp", "docker", "kubernetes", "figma", "excel", "power bi", "tableau", "google analytics", "seo", "salesforce", "hubspot", "agile", "scrum", "project management", "product management", "data analysis", "machine learning", "generative ai", "api", "rest", "graphql", "tailwind", "git", "linux", "communication", "leadership",
];

const ACTION_VERBS = [
  "led", "built", "created", "increased", "reduced", "improved", "managed", "launched", "delivered", "designed", "developed", "optimized", "automated", "grew", "achieved", "implemented", "memimpin", "membangun", "meningkatkan", "mengurangi", "mengelola", "meluncurkan", "mengembangkan", "mengoptimalkan", "mencapai",
];

const SECTION_RULES = [
  ["contact", /\b(email|e-mail|phone|telepon|linkedin|github)\b/i],
  ["summary", /\b(summary|profile|profil|about me|ringkasan)\b/i],
  ["skills", /\b(skills|keahlian|kompetensi|technical skills)\b/i],
  ["experience", /\b(experience|employment|work history|pengalaman kerja|riwayat kerja)\b/i],
  ["education", /\b(education|pendidikan|university|universitas|bachelor|sarjana)\b/i],
] as const;

function cap(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function normalizedWeightScore(items: Array<{ score: number; weight: number }>) {
  const totalWeight = items.reduce((sum, item) => sum + item.weight, 0);
  if (totalWeight <= 0) return 0;
  return cap(items.reduce((sum, item) => sum + item.score * item.weight, 0) / totalWeight);
}

function tokenise(value: string) {
  return value.toLowerCase().match(/[\p{L}\p{N}+#.]{2,}/gu) ?? [];
}

export function extractJobKeywords(jobDescription: string) {
  const lower = jobDescription.toLowerCase();
  const phrases = SKILL_VOCAB.filter((skill) => lower.includes(skill));
  const words = tokenise(jobDescription)
    .filter((word) => word.length >= 3 && !STOP_WORDS.has(word) && !/^\d/.test(word));
  const frequency = new Map<string, number>();
  for (const word of words) frequency.set(word, (frequency.get(word) ?? 0) + 1);
  const frequent = [...frequency.entries()]
    .filter(([, count]) => count >= 2)
    .sort((a, b) => b[1] - a[1])
    .map(([word]) => word)
    .slice(0, 14);
  return [...new Set([...phrases, ...frequent])].slice(0, 20);
}

export function matchKeywords(cvText: string, jobDescription: string) {
  const candidates = extractJobKeywords(jobDescription);
  const lowerCv = cvText.toLowerCase();
  const matched = candidates.filter((keyword) => lowerCv.includes(keyword));
  const missing = candidates.filter((keyword) => !lowerCv.includes(keyword));
  return { matched, missing, totalConsidered: candidates.length };
}

function hasPromptInjection(text: string) {
  return /ignore (all |any |the )?(previous|above) instructions|system message|act as (a |an )?(system|assistant)|jailbreak|developer message/i.test(text);
}

function scoreStructure(text: string) {
  const found = SECTION_RULES.filter(([, rule]) => rule.test(text)).map(([name]) => name);
  const hasEmail = /[\w.+-]+@[\w-]+\.[\w.-]+/.test(text);
  const hasLinks = /linkedin\.com|github\.com/i.test(text);
  const score = found.length * 16 + (hasEmail ? 10 : 0) + (hasLinks ? 10 : 0);
  return { score: cap(score), found, hasEmail, hasLinks };
}

function scoreExperience(text: string) {
  const lower = text.toLowerCase();
  const actions = ACTION_VERBS.filter((verb) => new RegExp(`\\b${verb}\\b`, "i").test(lower));
  const metrics = text.match(/(?:\$|rp\s?)?\d+[\d,.]*\s?(?:%|x|k|m|million|juta|ribu)?/gi) ?? [];
  const bulletCount = (text.match(/(?:^|\n)\s*(?:[-•*]|\d+[.)])/g) ?? []).length;
  const score = 22 + Math.min(actions.length * 7, 28) + Math.min(metrics.length * 9, 30) + Math.min(bulletCount * 2, 12) + (/\b(experience|pengalaman)\b/i.test(text) ? 8 : 0);
  return { score: cap(score), actions, metrics, bulletCount };
}

function scoreSkills(text: string) {
  const lower = text.toLowerCase();
  const found = SKILL_VOCAB.filter((skill) => lower.includes(skill));
  return { score: cap(24 + found.length * 9), found };
}

function recommendation(priority: Recommendation["priority"], title: string, detail: string, category: string): Recommendation {
  return { priority, title, detail, category };
}

export async function analyzeCv(cvText: string, jobDescription?: string): Promise<AnalysisResult> {
  const structure = scoreStructure(cvText);
  const experience = scoreExperience(cvText);
  const skills = scoreSkills(cvText);
  const hasJobDescription = Boolean(jobDescription?.trim());
  const keywordMatch = hasJobDescription ? matchKeywords(cvText, jobDescription!.trim()) : undefined;
  const keywordScore = keywordMatch && keywordMatch.totalConsidered > 0
    ? cap((keywordMatch.matched.length / keywordMatch.totalConsidered) * 100)
    : 50;
  const categoryScores = [
    {
      id: "structure" as const,
      label: "Struktur & keterbacaan",
      score: structure.score,
      weight: hasJobDescription ? 25 : 35,
      explanation: `${structure.found.length}/5 bagian CV umum terdeteksi${structure.hasEmail ? "; kontak tersedia" : "; tambahkan kontak"}.`,
    },
    ...(hasJobDescription ? [{
      id: "keywords" as const,
      label: "Kecocokan kata kunci",
      score: keywordScore,
      weight: 30,
      explanation: keywordMatch!.totalConsidered
        ? `${keywordMatch!.matched.length} dari ${keywordMatch!.totalConsidered} kata kunci relevan ditemukan.`
        : "Deskripsi pekerjaan terlalu umum untuk membentuk kata kunci yang andal.",
    }] : []),
    {
      id: "experience" as const,
      label: "Pengalaman & dampak",
      score: experience.score,
      weight: hasJobDescription ? 25 : 35,
      explanation: `${experience.actions.length} kata kerja aksi dan ${experience.metrics.length} metrik terdeteksi.`,
    },
    {
      id: "skills" as const,
      label: "Skills & relevansi",
      score: skills.score,
      weight: hasJobDescription ? 20 : 30,
      explanation: `${skills.found.length} skill yang dapat dikenali terdeteksi dalam CV.`,
    },
  ];

  const strengths: string[] = [];
  const gaps: string[] = [];
  if (structure.score >= 70) strengths.push("Struktur CV memuat sebagian besar bagian yang mudah dipindai ATS.");
  else gaps.push("Lengkapi bagian inti: kontak, ringkasan, keahlian, pengalaman, dan pendidikan.");
  if (experience.metrics.length >= 2) strengths.push("Pencapaian didukung angka atau metrik yang bisa diverifikasi.");
  else gaps.push("Tambahkan hasil terukur, misalnya persentase, skala proyek, atau efisiensi yang benar-benar dicapai.");
  if (experience.actions.length >= 3) strengths.push("Pengalaman menggunakan kata kerja aksi yang menunjukkan kontribusi.");
  else gaps.push("Mulai bullet pengalaman dengan kata kerja aksi yang spesifik, bukan hanya daftar tugas.");
  if (skills.found.length >= 4) strengths.push("CV menyebutkan beberapa skill yang mudah dikenali sistem screening.");
  else gaps.push("Kelompokkan skill teknis dan tools yang memang Anda kuasai agar mudah dipindai.");
  if (keywordMatch?.matched.length) strengths.push(`Terdapat kecocokan dengan: ${keywordMatch.matched.slice(0, 5).join(", ")}.`);
  if (keywordMatch && keywordMatch.missing.length) gaps.push(`Jika akurat, beri konteks pengalaman untuk: ${keywordMatch.missing.slice(0, 5).join(", ")}.`);

  const recommendations: Recommendation[] = [];
  if (experience.metrics.length < 2) recommendations.push(recommendation("high", "Ubah tugas menjadi hasil yang terukur", "Tambahkan dampak nyata pada 2–3 bullet, misalnya waktu yang dihemat, kenaikan kualitas, atau skala pengguna. Jangan membuat angka baru.", "Pengalaman"));
  if (hasJobDescription && keywordMatch && keywordMatch.missing.length) recommendations.push(recommendation("high", "Tutup gap kata kunci yang valid", `Jika memang relevan dengan riwayat Anda, tambahkan konteks penggunaan ${keywordMatch.missing.slice(0, 3).join(", ")} pada pengalaman atau skills.`, "Kata kunci"));
  if (!structure.found.includes("summary")) recommendations.push(recommendation("medium", "Tambahkan ringkasan profesional", "Tulis 2–3 kalimat tentang fokus peran, kekuatan utama, dan jenis dampak yang pernah Anda buat.", "Struktur"));
  if (!structure.found.includes("skills")) recommendations.push(recommendation("medium", "Buat bagian skills yang mudah dipindai", "Pisahkan tools, bahasa pemrograman, atau kompetensi domain yang benar-benar dikuasai.", "Skills"));
  if (!recommendations.length) recommendations.push(recommendation("low", "Pertahankan CV tetap spesifik", "Sesuaikan urutan pengalaman dan kata kunci terhadap peran target tanpa menambahkan klaim yang tidak akurat.", "Relevansi"));

  const provider = getSuggestionProvider();
  const aiStatus = provider?.kind ?? "not-configured";
  if (provider) {
    const ai = await provider.suggest({ strengths, gaps, roleKeywords: keywordMatch?.missing ?? [] });
    for (const item of ai.suggestions) {
      if (recommendations.length >= 6) break;
      if (!recommendations.some((existing) => existing.title === item.title)) {
        recommendations.push(recommendation(item.priority, item.title, item.detail, "Saran AI lokal"));
      }
    }
  }

  const evidence = [
    `${structure.found.length}/5 bagian inti terdeteksi: ${structure.found.join(", ") || "belum cukup"}.`,
    `${experience.actions.length} kata kerja aksi terdeteksi.`,
    `${experience.metrics.length} angka/metrik terdeteksi.`,
    `${skills.found.length} skill dikenal: ${skills.found.slice(0, 6).join(", ") || "belum ada"}.`,
  ];
  const overallScore = normalizedWeightScore(categoryScores.map(({ score, weight }) => ({ score, weight })));

  return analysisResultSchema.parse({
    overallScore,
    mode: hasJobDescription ? "job-match" : "general",
    summary: hasJobDescription
      ? "Estimasi ini menggabungkan kualitas CV dan kecocokan bukti yang tertulis terhadap deskripsi peran."
      : "Mode review umum aktif: skor menilai kualitas CV, bukan kecocokan untuk lowongan tertentu.",
    categoryScores,
    strengths: strengths.slice(0, 5),
    gaps: gaps.slice(0, 6),
    recommendations: recommendations.slice(0, 6),
    evidence,
    keywordMatch,
    aiStatus,
    injectionWarning: hasPromptInjection(cvText),
  });
}

export { normalizedWeightScore };
