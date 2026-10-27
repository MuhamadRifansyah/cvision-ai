import { describe, expect, it } from "vitest";
import { OpenAiSuggestionProvider, ProviderRateLimitError, ProviderResponseError, ProviderTimeoutError } from "@/lib/llm/provider";
import { aiSuggestionsSchema } from "@/lib/schemas";

describe("LLM adapter boundary", () => {
  it("rejects malformed provider output", () => {
    expect(() => aiSuggestionsSchema.parse({ suggestions: [{ title: "", detail: 12, priority: "urgent" }] })).toThrow();
  });

  it("models timeout and rate-limit errors explicitly", () => {
    expect(new ProviderTimeoutError()).toBeInstanceOf(Error);
    expect(new ProviderRateLimitError()).toBeInstanceOf(Error);
  });

  it("accepts structured output from the server-side OpenAI adapter", async () => {
    const request = (async () => new Response(JSON.stringify({
      output_text: JSON.stringify({ suggestions: [{ title: "Clarify impact", detail: "Use a real metric.", priority: "high" }] }),
    }), { status: 200 })) as typeof fetch;
    const provider = new OpenAiSuggestionProvider("test-secret", "gpt-4o-mini", 100, request);

    await expect(provider.suggest({ strengths: [], gaps: ["Add metrics"], roleKeywords: ["react"] }))
      .resolves.toMatchObject({ suggestions: [{ priority: "high" }] });
  });

  it("rejects malformed output and provider rate limits", async () => {
    const malformed = (async () => new Response(JSON.stringify({ output_text: "not-json" }), { status: 200 })) as typeof fetch;
    const limited = (async () => new Response("too many requests", { status: 429 })) as typeof fetch;

    await expect(new OpenAiSuggestionProvider("test-secret", "gpt-4o-mini", 100, malformed).suggest({ strengths: [], gaps: [], roleKeywords: [] }))
      .rejects.toBeInstanceOf(ProviderResponseError);
    await expect(new OpenAiSuggestionProvider("test-secret", "gpt-4o-mini", 100, limited).suggest({ strengths: [], gaps: [], roleKeywords: [] }))
      .rejects.toBeInstanceOf(ProviderRateLimitError);
  });

  it("maps an aborted request to a timeout", async () => {
    const hanging = ((_, options) => new Promise<Response>((_, reject) => {
      options?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
    })) as typeof fetch;
    const provider = new OpenAiSuggestionProvider("test-secret", "gpt-4o-mini", 1, hanging);

    await expect(provider.suggest({ strengths: [], gaps: [], roleKeywords: [] })).rejects.toBeInstanceOf(ProviderTimeoutError);
  });
});
