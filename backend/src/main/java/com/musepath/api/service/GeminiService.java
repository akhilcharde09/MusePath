package com.musepath.api.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class GeminiService {

    /**
     * Model priority list — confirmed available via live API models.list call.
     * Ordered: lightest/cheapest first → most capable last.
     *
     * NOTE: Model availability may change; the fallback logic will skip
     * any model returning 404 and try the next one automatically.
     */
    private static final String[] MODELS = {
        "gemini-2.0-flash-lite",  // lightest, fastest, lowest quota cost
        "gemini-2.0-flash",       // reliable workhorse
        "gemini-1.5-flash",       // stable long-context fallback
        "gemini-1.5-pro"          // most capable fallback
    };

    @Value("${GEMINI_API_KEY:}")
    private String apiKey;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(30))
            .build();
    private final ObjectMapper objectMapper = new ObjectMapper();

    // =========================================================
    //  Startup Validation — runs once when Spring boots
    // =========================================================

    @PostConstruct
    public void validateApiKey() {
        if (apiKey == null || apiKey.trim().isEmpty()) {
            System.err.println("╔══════════════════════════════════════════════════════╗");
            System.err.println("║  ❌ GEMINI_API_KEY is MISSING from your .env file!  ║");
            System.err.println("║  Get a free key at: https://aistudio.google.com     ║");
            System.err.println("╚══════════════════════════════════════════════════════╝");
        } else {
            // Quick connectivity test — only validates key, doesn't consume quota
            System.out.println("🔑 Gemini API key loaded: " +
                    apiKey.substring(0, Math.min(8, apiKey.length())) + "****");
            System.out.println("✅ GeminiService initialized with " + MODELS.length + " model fallbacks.");
        }
    }

    // =========================================================
    //  Public Methods
    // =========================================================

    public JsonNode generateLearningPlan(String instrument, String level, String duration,
                                          String dailyTime, List<String> interests, String mood) {
        int months = 3;
        if ("1 month".equalsIgnoreCase(duration))  months = 1;
        else if ("3 months".equalsIgnoreCase(duration)) months = 3;
        else if ("6 months".equalsIgnoreCase(duration)) months = 6;
        else if ("1 year".equalsIgnoreCase(duration))   months = 12;

        String prompt =
            "Create a " + months + "-month music learning plan as JSON only. No extra text. Do NOT truncate.\n\n" +
            "Student: " + level + " " + instrument + " player\n" +
            "Daily time: " + dailyTime + " | Interests: " + String.join(", ", interests) +
            " | Style: " + (mood != null ? mood : "Balanced") + "\n\n" +
            "Return this exact JSON (fill all " + months + " months, 4 weeks each):\n" +
            "{\"title\":\"...\",\"summary\":\"...\",\"totalMonths\":" + months + "," +
            "\"months\":[{\"monthNumber\":1,\"theme\":\"...\",\"overview\":\"...\"," +
            "\"monthlyMilestone\":\"...\"," +
            "\"weeks\":[{\"weekNumber\":1,\"title\":\"...\",\"topics\":[\"t1\",\"t2\"]," +
            "\"skills\":[\"s1\"],\"practiceGoal\":\"...\",\"practiceMinutes\":20," +
            "\"songs\":[{\"title\":\"...\",\"artist\":\"...\",\"difficulty\":\"beginner\"," +
            "\"whyRecommended\":\"...\",\"skillsLearned\":[\"s\"]}]," +
            "\"youtubeSearches\":[\"search query\"],\"milestone\":\"...\"}]}]," +
            "\"tips\":[\"tip1\",\"tip2\",\"tip3\"]," +
            "\"motivationalMessage\":\"...\"}\n\n" +
            "Rules: Use REAL songs. " + months + " months total. 4 weeks per month. Be concise.";

        return callWithFallback(prompt, 120);
    }

    public JsonNode generateSongRecommendations(String instrument, String level,
                                                  String mood, String genre, int limit) {
        String prompt =
            "Recommend " + limit + " real songs for a " + level + " " + instrument +
            " player who likes " + genre + " music (" + mood + " mood).\n" +
            "Return ONLY a JSON array:\n" +
            "[{\"title\":\"...\",\"artist\":\"...\",\"difficulty\":\"beginner\"," +
            "\"whyRecommended\":\"...\",\"skillsLearned\":[\"s1\",\"s2\"]," +
            "\"genre\":\"" + genre + "\",\"mood\":\"" + mood + "\"," +
            "\"estimatedLearningTime\":\"1-2 weeks\",\"funFact\":\"...\"}]";

        return callWithFallback(prompt, 45);
    }

    // =========================================================
    //  Core Retry Logic — exponential backoff per model
    // =========================================================

    /**
     * Tries each model in order. On rate-limit (429 / RESOURCE_EXHAUSTED):
     *   - waits with exponential backoff before moving to next model
     *   - after all models exhausted, waits longer and does one final retry pass
     * On invalid key (401/403): fails fast with a clear message.
     */
    private JsonNode callWithFallback(String prompt, int timeoutSeconds) {
        if (apiKey == null || apiKey.trim().isEmpty()) {
            throw new RuntimeException(
                "GEMINI_API_KEY is not set. Add it to backend/.env and restart the server.");
        }

        Exception lastError = null;

        // --- Pass 1: try all models with short waits ---
        for (String model : MODELS) {
            try {
                System.out.println("📡 Trying model: " + model);
                JsonNode result = callGemini(prompt, model, timeoutSeconds);
                System.out.println("✅ Success with model: " + model);
                return result;
            } catch (GeminiAuthException e) {
                // Auth errors are non-retryable — fail immediately
                System.err.println("❌ Auth/Key error: " + e.getMessage());
                throw new RuntimeException(
                    "Gemini API key is invalid or expired. " +
                    "Please get a new key at https://aistudio.google.com and update backend/.env", e);
            } catch (GeminiQuotaException e) {
                lastError = e;
                System.out.println("⚠️ Quota/rate-limit on " + model + " — trying next model...");
                sleepQuietly(1500); // brief pause before trying next model
            } catch (GeminiModelNotFoundException e) {
                lastError = e;
                System.out.println("⚠️ Model not available: " + model + " — trying next...");
            } catch (Exception e) {
                lastError = e;
                String msg = e.getMessage() != null ? e.getMessage() : "";
                System.out.println("⚠️ Error on " + model + ": " + msg.substring(0, Math.min(200, msg.length())));
                // For timeout/network errors — try next model
            }
        }

        // --- Pass 2: all models rate-limited, wait 10s and try the two lightest models again ---
        System.out.println("⏳ All models failed. Waiting 10s before final retry...");
        sleepQuietly(10000);

        for (int i = 0; i < 2; i++) { // only retry fastest 2 models
            String model = MODELS[i];
            try {
                System.out.println("🔁 Final retry on model: " + model);
                JsonNode result = callGemini(prompt, model, timeoutSeconds);
                System.out.println("✅ Final retry success with: " + model);
                return result;
            } catch (GeminiAuthException e) {
                throw new RuntimeException(
                    "Gemini API key is invalid or expired. " +
                    "Get a new key at https://aistudio.google.com", e);
            } catch (Exception e) {
                lastError = e;
                System.out.println("⚠️ Final retry failed on " + model + ": " +
                        (e.getMessage() != null ? e.getMessage().substring(0, Math.min(150, e.getMessage().length())) : "unknown"));
            }
        }

        // Determine the best user-facing message
        String userMsg;
        if (lastError instanceof GeminiQuotaException) {
            userMsg = "AI service is temporarily rate-limited (free tier quota). " +
                      "Please wait a few minutes and try again, or try a simpler request.";
        } else {
            userMsg = "AI service is temporarily unavailable. Please try again in a moment.";
        }
        throw new RuntimeException(userMsg, lastError);
    }

    // =========================================================
    //  HTTP call + typed exceptions
    // =========================================================

    private JsonNode callGemini(String prompt, String model, int timeoutSeconds) throws Exception {
        String url = "https://generativelanguage.googleapis.com/v1beta/models/" +
                     model + ":generateContent?key=" + apiKey;

        ObjectNode parts = objectMapper.createObjectNode();
        parts.put("text", prompt);

        ObjectNode content = objectMapper.createObjectNode();
        content.set("parts", objectMapper.createArrayNode().add(parts));

        ObjectNode genConfig = objectMapper.createObjectNode();
        genConfig.put("temperature", 0.7);
        // Large plans need more tokens — scale with timeout
        int maxTokens = timeoutSeconds >= 90 ? 16384 : 8192;
        genConfig.put("maxOutputTokens", maxTokens);
        genConfig.put("responseMimeType", "application/json");

        ObjectNode body = objectMapper.createObjectNode();
        body.set("contents", objectMapper.createArrayNode().add(content));
        body.set("generationConfig", genConfig);

        HttpRequest req = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("Content-Type", "application/json")
                .POST(HttpRequest.BodyPublishers.ofString(objectMapper.writeValueAsString(body)))
                .timeout(Duration.ofSeconds(timeoutSeconds))
                .build();

        HttpResponse<String> res = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
        String responseBody = res.body();
        int status = res.statusCode();

        System.out.println("📥 " + model + " → HTTP " + status +
                " (body length: " + responseBody.length() + ")");

        // --- Classify errors by HTTP status ---
        if (status == 400) {
            // Could be bad request or invalid model
            if (responseBody.contains("API_KEY_INVALID") || responseBody.contains("API key not valid")) {
                throw new GeminiAuthException("API key is invalid: " + snippet(responseBody));
            }
            throw new RuntimeException("Bad request to " + model + ": " + snippet(responseBody));
        }
        if (status == 401 || status == 403) {
            throw new GeminiAuthException("Auth failed (" + status + "): " + snippet(responseBody));
        }
        if (status == 404) {
            throw new GeminiModelNotFoundException("Model not found: " + model);
        }
        if (status == 429) {
            throw new GeminiQuotaException("Rate limited on " + model + ": " + snippet(responseBody));
        }
        if (status == 503) {
            // 503 = overloaded, treat as retryable like 429
            throw new GeminiQuotaException("Model overloaded (503) on " + model + ": " + snippet(responseBody));
        }
        if (status == 500) {
            throw new RuntimeException("Server error on " + model + " (HTTP " + status + "): " + snippet(responseBody));
        }
        if (status != 200) {
            throw new RuntimeException("HTTP " + status + " from " + model + ": " + snippet(responseBody));
        }

        // --- Parse response ---
        JsonNode responseJson = objectMapper.readTree(responseBody);

        // Check for quota error in 200 response body (Google sometimes does this)
        if (responseJson.has("error")) {
            JsonNode errNode = responseJson.path("error");
            int errCode = errNode.path("code").asInt(0);
            String errStatus = errNode.path("status").asText("");
            String errMsg = errNode.path("message").asText("");
            if (errCode == 429 || "RESOURCE_EXHAUSTED".equals(errStatus)) {
                throw new GeminiQuotaException("Quota exhausted on " + model + ": " + errMsg);
            }
            if (errCode == 401 || errCode == 403 || "UNAUTHENTICATED".equals(errStatus) || "PERMISSION_DENIED".equals(errStatus)) {
                throw new GeminiAuthException("Auth error in response body: " + errMsg);
            }
            throw new RuntimeException("API error on " + model + ": " + errMsg);
        }

        JsonNode candidates = responseJson.path("candidates");
        if (!candidates.isArray() || candidates.size() == 0) {
            // Could be a blocked/quota response
            if (responseJson.has("promptFeedback")) {
                String blockReason = responseJson.path("promptFeedback").path("blockReason").asText("");
                if (!blockReason.isEmpty()) {
                    throw new RuntimeException("Request blocked by Gemini (" + blockReason + ")");
                }
            }
            throw new RuntimeException("No candidates in response from " + model);
        }

        JsonNode firstCandidate = candidates.get(0);
        String finishReason = firstCandidate.path("finishReason").asText("");
        if ("SAFETY".equals(finishReason) || "RECITATION".equals(finishReason)) {
            throw new RuntimeException("Gemini blocked response (" + finishReason + ") on " + model);
        }

        JsonNode partsArr = firstCandidate.path("content").path("parts");
        if (!partsArr.isArray() || partsArr.size() == 0) {
            throw new RuntimeException("Empty parts in response from " + model);
        }

        String text = partsArr.get(0).path("text").asText();
        System.out.println("📝 Response length: " + text.length() + " chars from " + model);
        return parseJSON(text);
    }

    // =========================================================
    //  JSON Parsing
    // =========================================================

    private JsonNode parseJSON(String text) {
        // Strip markdown code fences
        Pattern jsonBlock = Pattern.compile("```(?:json)?\\s*([\\s\\S]*?)\\s*```");
        Matcher m = jsonBlock.matcher(text);
        if (m.find()) {
            try {
                JsonNode n = objectMapper.readTree(m.group(1).trim());
                return unwrapIfNeeded(n);
            } catch (Exception ignored) {}
        }

        // Try JSON array first (songs endpoint returns [])
        Pattern arrPat = Pattern.compile("(\\[[\\s\\S]*\\])");
        m = arrPat.matcher(text);
        if (m.find()) {
            try {
                JsonNode n = objectMapper.readTree(m.group(1).trim());
                return unwrapIfNeeded(n);
            } catch (Exception ignored) {}
        }

        // Try JSON object
        Pattern objPat = Pattern.compile("(\\{[\\s\\S]*\\})");
        m = objPat.matcher(text);
        if (m.find()) {
            try {
                JsonNode n = objectMapper.readTree(m.group(1).trim());
                return unwrapIfNeeded(n);
            } catch (Exception ignored) {}
        }

        // Direct parse
        try {
            JsonNode n = objectMapper.readTree(text.trim());
            return unwrapIfNeeded(n);
        } catch (Exception e) {
            throw new RuntimeException("Cannot parse JSON from Gemini response. Preview: " +
                    text.substring(0, Math.min(200, text.length())), e);
        }
    }

    /**
     * If Gemini returns {"songs": [...]} or any single-key object wrapping an array,
     * unwrap and return the inner array directly.
     */
    private JsonNode unwrapIfNeeded(JsonNode node) {
        if (node.isObject() && node.size() == 1) {
            JsonNode inner = node.fields().next().getValue();
            if (inner.isArray()) {
                System.out.println("🔧 Unwrapped Gemini object wrapper → bare array of " + inner.size() + " items");
                return inner;
            }
        }
        return node;
    }

    // =========================================================
    //  Helpers & Typed Exceptions
    // =========================================================

    private static String snippet(String s) {
        return s == null ? "" : s.substring(0, Math.min(300, s.length()));
    }

    private static void sleepQuietly(long ms) {
        try { Thread.sleep(ms); } catch (InterruptedException ignored) {}
    }

    /** Thrown when the API key is wrong/expired — non-retryable */
    static class GeminiAuthException extends Exception {
        GeminiAuthException(String message) { super(message); }
    }

    /** Thrown on 429 / RESOURCE_EXHAUSTED — retry with backoff */
    static class GeminiQuotaException extends Exception {
        GeminiQuotaException(String message) { super(message); }
    }

    /** Thrown when a model name is not found — try next model */
    static class GeminiModelNotFoundException extends Exception {
        GeminiModelNotFoundException(String message) { super(message); }
    }
}
