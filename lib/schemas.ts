import { z } from "zod";

export const categoryScoreSchema = z.object({
  id: z.enum(["structure", "keywords", "experience", "skills"]),
  label: z.string(),
  score: z.number().int().min(0).max(100),
  weight: z.number().min(0).max(100),
  explanation: z.string().min(1).max(500),
});

export const recommendationSchema = z.object({
  priority: z.enum(["high", "medium", "low"]),
  title: z.string().min(1).max(140),
  detail: z.string().min(1).max(500),
  category: z.string().min(1).max(60),
});

export const analysisResultSchema = z.object({
  overallScore: z.number().int().min(0).max(100),
  mode: z.enum(["job-match", "general"]),
  summary: z.string().min(1).max(700),
  categoryScores: z.array(categoryScoreSchema).min(3).max(4),
  strengths: z.array(z.string().min(1).max(280)).max(5),
  gaps: z.array(z.string().min(1).max(280)).max(6),
  recommendations: z.array(recommendationSchema).min(1).max(6),
  evidence: z.array(z.string().min(1).max(280)).max(8),
  keywordMatch: z.object({
    matched: z.array(z.string()).max(20),
    missing: z.array(z.string()).max(20),
    totalConsidered: z.number().int().min(0),
  }).optional(),
  aiStatus: z.enum(["local-mock", "openai", "not-configured"]),
  injectionWarning: z.boolean(),
});

export type AnalysisResult = z.infer<typeof analysisResultSchema>;
export type Recommendation = z.infer<typeof recommendationSchema>;

export const aiSuggestionsSchema = z.object({
  suggestions: z.array(
    z.object({
      title: z.string().min(1).max(140),
      detail: z.string().min(1).max(500),
      priority: z.enum(["high", "medium", "low"]),
    }),
  ).min(1).max(3),
});

export type AiSuggestions = z.infer<typeof aiSuggestionsSchema>;
