"use client";

import { useRef, useState, type DragEvent, type FormEvent } from "react";
import {
  ArrowRight,
  BarChart3,
  Check,
  CheckCircle2,
  ChevronRight,
  FileText,
  Info,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
  Target,
  Upload,
} from "lucide-react";
import type { AnalysisResult } from "@/lib/schemas";

type RequestState = "idle" | "loading" | "success" | "error";

const MAX_FILE_SIZE = 5 * 1024 * 1024;

function scoreTone(score: number) {
  if (score >= 75) return "text-emerald-600";
  if (score >= 50) return "text-amber-600";
  return "text-rose-600";
}

function priorityTone(priority: "high" | "medium" | "low") {
  if (priority === "high") return "bg-rose-50 text-rose-700 ring-rose-200";
  if (priority === "medium") return "bg-amber-50 text-amber-700 ring-amber-200";
  return "bg-slate-100 text-slate-600 ring-slate-200";
}

function formatSize(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function CvReviewer() {
  const [file, setFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [state, setState] = useState<RequestState>("idle");
  const [error, setError] = useState("");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function chooseFile(candidate?: File) {
    setError("");
    setResult(null);
    setState("idle");
    if (!candidate) return;
    const extension = candidate.name.toLowerCase().split(".").pop();
    if (candidate.size > MAX_FILE_SIZE) {
      setError("Ukuran file maksimal 5 MB.");
      return;
    }
    if (extension !== "pdf" && extension !== "docx") {
      setError("Format belum didukung. Pilih file PDF atau DOCX.");
      return;
    }
    setFile(candidate);
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    chooseFile(event.dataTransfer.files[0]);
  }

  async function analyze() {
    if (!file) {
      setError("Pilih CV PDF atau DOCX terlebih dahulu.");
      return;
    }
    setState("loading");
    setError("");
    setResult(null);
    try {
      const formData = new FormData();
      formData.append("cv", file);
      formData.append("jobDescription", jobDescription);
      const response = await fetch("/api/analyze", { method: "POST", body: formData });
      const payload: unknown = await response.json();
      if (!response.ok) {
        const message = typeof payload === "object" && payload && "message" in payload && typeof payload.message === "string"
          ? payload.message
          : "Analisis gagal diproses. Coba lagi.";
        throw new Error(message);
      }
      setResult(payload as AnalysisResult);
      setState("success");
      setTimeout(() => document.getElementById("results")?.scrollIntoView({ behavior: "smooth", block: "start" }), 120);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Analisis gagal diproses. Coba lagi.");
      setState("error");
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void analyze();
  }

  function reset() {
    setFile(null);
    setResult(null);
    setError("");
    setState("idle");
    if (inputRef.current) inputRef.current.value = "";
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#f7f8fc] text-slate-900">
      <div className="pointer-events-none absolute inset-x-0 top-0 -z-0 h-[560px] bg-[radial-gradient(ellipse_70%_60%_at_50%_-10%,#dfe8ff_0%,rgba(247,248,252,0)_70%)]" />
      <nav className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-5 py-6 sm:px-8">
        <a href="#top" className="flex items-center gap-2.5 font-bold tracking-tight" aria-label="CVision AI home">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#2357d9] text-white shadow-lg shadow-blue-200">
            <Sparkles size={18} aria-hidden="true" />
          </span>
          <span>CVision <span className="text-[#2357d9]">AI</span></span>
        </a>
        <a href="#review" className="hidden items-center gap-1 text-sm font-semibold text-slate-600 transition hover:text-[#2357d9] sm:flex">
          Mulai review <ArrowRight size={15} aria-hidden="true" />
        </a>
      </nav>

      <section id="top" className="relative z-10 mx-auto max-w-4xl px-5 pb-12 pt-10 text-center sm:px-8 sm:pb-16 sm:pt-16">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-blue-100 bg-white/75 px-3 py-1.5 text-xs font-semibold text-[#2357d9] shadow-sm backdrop-blur">
          <ShieldCheck size={14} aria-hidden="true" /> Privacy-first CV review
        </div>
        <h1 className="mx-auto max-w-3xl text-4xl font-bold tracking-[-0.045em] text-slate-950 sm:text-6xl sm:leading-[1.07]">
          Buat CV yang lebih siap <span className="text-[#2357d9]">untuk ATS.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
          Upload CV, tambahkan lowongan target bila ada, dan dapatkan evaluasi yang transparan serta langkah perbaikan yang bisa langsung dikerjakan.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-x-5 gap-y-2 text-sm text-slate-500">
          <span className="flex items-center gap-1.5"><CheckCircle2 size={15} className="text-emerald-500" aria-hidden="true" /> Tanpa simpan dokumen</span>
          <span className="flex items-center gap-1.5"><CheckCircle2 size={15} className="text-emerald-500" aria-hidden="true" /> Skor yang dapat dijelaskan</span>
          <span className="flex items-center gap-1.5"><CheckCircle2 size={15} className="text-emerald-500" aria-hidden="true" /> PDF & DOCX</span>
        </div>
      </section>

      <section id="review" className="relative z-10 mx-auto max-w-5xl px-5 pb-20 sm:px-8">
        <form onSubmit={submit} className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-[0_20px_60px_-28px_rgba(40,63,115,0.24)]">
          <div className="grid gap-0 lg:grid-cols-[1.05fr_.95fr]">
            <div className="border-b border-slate-100 p-6 sm:p-8 lg:border-b-0 lg:border-r">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-900">1. Upload CV kamu</p>
                  <p className="mt-1 text-xs text-slate-500">Satu file, maksimal 5 MB</p>
                </div>
                <span className="rounded-lg bg-blue-50 p-2 text-[#2357d9]"><FileText size={18} aria-hidden="true" /></span>
              </div>
              <label
                htmlFor="cv-upload"
                onDragOver={(event) => event.preventDefault()}
                onDrop={handleDrop}
                className="group flex min-h-56 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/80 px-6 text-center transition hover:border-[#7d9bef] hover:bg-blue-50/40 focus-within:border-[#2357d9] focus-within:ring-4 focus-within:ring-blue-100"
              >
                <input
                  id="cv-upload"
                  ref={inputRef}
                  className="sr-only"
                  type="file"
                  accept="application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document,.pdf,.docx"
                  onChange={(event) => chooseFile(event.target.files?.[0])}
                />
                {file ? (
                  <>
                    <span className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-100 text-emerald-600"><Check size={23} aria-hidden="true" /></span>
                    <span className="mt-3 max-w-full truncate text-sm font-bold text-slate-800">{file.name}</span>
                    <span className="mt-1 text-xs text-slate-500">{formatSize(file.size)} · siap dianalisis</span>
                    <button type="button" onClick={(event) => { event.preventDefault(); reset(); }} className="mt-4 text-xs font-semibold text-rose-600 underline underline-offset-2 hover:text-rose-700">Ganti file</button>
                  </>
                ) : (
                  <>
                    <span className="grid h-12 w-12 place-items-center rounded-2xl bg-blue-100 text-[#2357d9] transition group-hover:scale-105"><Upload size={22} aria-hidden="true" /></span>
                    <span className="mt-3 text-sm font-bold text-slate-800">Tarik file ke sini atau klik untuk memilih</span>
                    <span className="mt-1 text-xs text-slate-500">Mendukung PDF dan DOCX</span>
                  </>
                )}
              </label>
            </div>

            <div className="p-6 sm:p-8">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-slate-900">2. Target lowongan <span className="font-medium text-slate-400">(opsional)</span></p>
                  <p className="mt-1 text-xs text-slate-500">Agar kami cek relevansi kata kunci</p>
                </div>
                <span className="rounded-lg bg-violet-50 p-2 text-violet-600"><Target size={18} aria-hidden="true" /></span>
              </div>
              <label htmlFor="job-description" className="sr-only">Deskripsi pekerjaan target</label>
              <textarea
                id="job-description"
                value={jobDescription}
                onChange={(event) => setJobDescription(event.target.value.slice(0, 12_000))}
                placeholder="Tempel deskripsi pekerjaan di sini untuk melihat kata kunci yang sudah dan belum muncul di CV..."
                className="h-56 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-sm leading-6 text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-[#2357d9] focus:bg-white focus:ring-4 focus:ring-blue-100"
              />
              <p className="mt-2 text-right text-xs text-slate-400">{jobDescription.length.toLocaleString("id-ID")} / 12.000</p>
            </div>
          </div>
          <div className="flex flex-col items-start gap-4 border-t border-slate-100 bg-slate-50/70 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <p className="flex max-w-xl items-start gap-2 text-xs leading-5 text-slate-500"><LockKeyhole size={15} className="mt-0.5 shrink-0 text-slate-400" aria-hidden="true" /> Dokumen diproses di memori untuk analisis ini dan tidak disimpan. Skor adalah estimasi, bukan hasil resmi ATS.</p>
            <button onClick={() => void analyze()} disabled={state === "loading"} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#2357d9] px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-200 transition hover:bg-[#1d48b8] disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto" type="button">
              {state === "loading" ? <><LoaderCircle size={17} className="animate-spin" aria-hidden="true" /> Menganalisis CV...</> : <><Sparkles size={17} aria-hidden="true" /> Analisis CV saya</>}
            </button>
          </div>
        </form>

        {state === "loading" && <div className="mt-5 flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800"><LoaderCircle size={17} className="animate-spin" aria-hidden="true" /> Mengekstrak teks, mengecek struktur, dan menyusun rekomendasi...</div>}
        {error && <div role="alert" className="mt-5 flex items-start justify-between gap-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"><span>{error}</span><button type="button" onClick={() => { setState("idle"); setError(""); }} className="shrink-0 font-bold underline underline-offset-2">Tutup</button></div>}
      </section>

      {result && <Results result={result} onReset={reset} />}

      <footer className="border-t border-slate-200 bg-white px-5 py-8 text-center text-xs text-slate-500">
        CVision AI memberikan review berbasis teks, bukan keputusan rekrutmen dan tidak menilai atribut sensitif atau foto.
      </footer>
    </main>
  );
}

function Results({ result, onReset }: { result: AnalysisResult; onReset: () => void }) {
  return (
    <section id="results" className="relative z-10 mx-auto max-w-5xl px-5 pb-20 sm:px-8" aria-live="polite">
      <div className="mb-6 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-bold text-[#2357d9]">HASIL REVIEW</p>
          <h2 className="mt-1 text-3xl font-bold tracking-tight text-slate-950">CV readiness report</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{result.summary}</p>
        </div>
        <button type="button" onClick={onReset} className="inline-flex items-center gap-1 text-sm font-bold text-[#2357d9] hover:text-[#1d48b8]">Review CV lain <ChevronRight size={16} aria-hidden="true" /></button>
      </div>

      <div className="grid gap-5 lg:grid-cols-[.85fr_1.15fr]">
        <article className="rounded-[1.5rem] bg-slate-950 p-7 text-white shadow-xl shadow-slate-300 sm:p-8">
          <p className="text-xs font-bold tracking-[0.16em] text-blue-200">ESTIMASI ATS READINESS</p>
          <div className="mt-6 flex items-center gap-6">
            <div className="grid h-32 w-32 shrink-0 place-items-center rounded-full" style={{ background: `conic-gradient(#7fa2ff ${result.overallScore}%, #334155 ${result.overallScore}% 100%)` }}>
              <div className="grid h-[104px] w-[104px] place-items-center rounded-full bg-slate-950"><span className="text-4xl font-bold tracking-tight">{result.overallScore}</span><span className="-mt-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">dari 100</span></div>
            </div>
            <div>
              <p className="text-lg font-bold">{result.overallScore >= 75 ? "Kuat untuk ditingkatkan" : result.overallScore >= 50 ? "Fondasi sudah ada" : "Mulai dari perbaikan inti"}</p>
              <p className="mt-2 text-sm leading-5 text-slate-300">{result.mode === "job-match" ? "Mode job-match aktif" : "Mode review umum aktif"}</p>
            </div>
          </div>
          <div className="mt-7 rounded-xl border border-white/10 bg-white/5 p-3 text-xs leading-5 text-slate-300"><Info size={14} className="mr-1 inline text-blue-200" aria-hidden="true" /> Ini bukan skor dari sistem ATS perusahaan mana pun. Gunakan sebagai titik awal untuk perbaikan.</div>
        </article>

        <article className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <div className="mb-5 flex items-center gap-2"><BarChart3 size={18} className="text-[#2357d9]" aria-hidden="true" /><h3 className="font-bold">Breakdown skor</h3></div>
          <div className="space-y-5">
            {result.categoryScores.map((category) => <div key={category.id}>
              <div className="mb-2 flex items-baseline justify-between gap-4"><div><span className="text-sm font-bold text-slate-800">{category.label}</span><span className="ml-2 text-xs text-slate-400">bobot {category.weight}%</span></div><span className={`text-sm font-bold ${scoreTone(category.score)}`}>{category.score}</span></div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-[#2357d9]" style={{ width: `${category.score}%` }} /></div>
              <p className="mt-1.5 text-xs leading-5 text-slate-500">{category.explanation}</p>
            </div>)}
          </div>
        </article>
      </div>

      {result.keywordMatch && <article className="mt-5 rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-7"><div className="flex items-center gap-2"><Target size={18} className="text-violet-600" aria-hidden="true" /><h3 className="font-bold">Kecocokan kata kunci</h3></div><p className="mt-2 text-sm text-slate-500">Kata kunci diambil dari deskripsi pekerjaan; masukkan hanya bila sesuai fakta di pengalamanmu.</p><div className="mt-5 grid gap-5 sm:grid-cols-2"><KeywordGroup label="Sudah terdeteksi" values={result.keywordMatch.matched} tone="matched" /><KeywordGroup label="Belum terlihat" values={result.keywordMatch.missing} tone="missing" /></div></article>}

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <InsightCard title="Kekuatan yang terlihat" items={result.strengths} empty="Belum ada kekuatan dominan yang terdeteksi; selesaikan rekomendasi prioritas di samping." tone="strength" />
        <InsightCard title="Gap yang perlu diperbaiki" items={result.gaps} empty="Tidak ada gap besar yang terdeteksi dari teks CV." tone="gap" />
      </div>

      <article className="mt-5 rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
        <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center"><div><h3 className="font-bold">Rekomendasi terprioritas</h3><p className="mt-1 text-sm text-slate-500">Mulai dari prioritas tinggi agar dampaknya paling terasa.</p></div><span className="text-xs font-semibold text-slate-400">{result.aiStatus === "openai" ? "AI reviewer aktif" : result.aiStatus === "local-mock" ? "Local AI adapter aktif" : "Rekomendasi berbasis aturan"}</span></div>
        <ol className="mt-5 divide-y divide-slate-100">
          {result.recommendations.map((item, index) => <li key={`${item.title}-${index}`} className="flex gap-4 py-4 first:pt-0 last:pb-0"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-blue-50 text-xs font-bold text-[#2357d9]">{index + 1}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h4 className="text-sm font-bold text-slate-800">{item.title}</h4><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ring-1 ${priorityTone(item.priority)}`}>{item.priority}</span></div><p className="mt-1.5 text-sm leading-6 text-slate-600">{item.detail}</p></div></li>)}
        </ol>
      </article>

      <details className="mt-5 rounded-xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-600"><summary className="cursor-pointer font-bold text-slate-800">Bukti yang digunakan untuk menghitung skor</summary><ul className="mt-3 space-y-2 border-t border-slate-100 pt-3 text-xs leading-5">{result.evidence.map((item) => <li key={item} className="flex gap-2"><CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-500" aria-hidden="true" />{item}</li>)}</ul>{result.injectionWarning && <p className="mt-3 rounded-lg bg-amber-50 p-3 text-xs text-amber-800">Teks dengan pola instruksi terdeteksi dan diperlakukan hanya sebagai konten CV, bukan sebagai instruksi aplikasi.</p>}</details>
    </section>
  );
}

function KeywordGroup({ label, values, tone }: { label: string; values: string[]; tone: "matched" | "missing" }) {
  const styles = tone === "matched" ? "bg-emerald-50 text-emerald-700 ring-emerald-100" : "bg-amber-50 text-amber-700 ring-amber-100";
  return <div><p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p><div className="flex min-h-8 flex-wrap gap-2">{values.length ? values.map((value) => <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${styles}`} key={value}>{value}</span>) : <span className="text-sm text-slate-400">Tidak ada</span>}</div></div>;
}

function InsightCard({ title, items, empty, tone }: { title: string; items: string[]; empty: string; tone: "strength" | "gap" }) {
  const isStrength = tone === "strength";
  return <article className="rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-sm sm:p-7"><div className="flex items-center gap-2"><span className={`grid h-8 w-8 place-items-center rounded-lg ${isStrength ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"}`}>{isStrength ? <CheckCircle2 size={17} aria-hidden="true" /> : <Info size={17} aria-hidden="true" />}</span><h3 className="font-bold">{title}</h3></div><ul className="mt-4 space-y-3">{items.length ? items.map((item) => <li className="flex gap-2 text-sm leading-6 text-slate-600" key={item}><span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${isStrength ? "bg-emerald-500" : "bg-amber-500"}`} />{item}</li>) : <li className="text-sm leading-6 text-slate-500">{empty}</li>}</ul></article>;
}
