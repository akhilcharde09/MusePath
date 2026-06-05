package com.musepath.api.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.musepath.api.service.GeminiService;
import com.musepath.api.service.SpotifyService;
import com.musepath.api.service.SupabaseService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.time.OffsetDateTime;
import java.util.*;
import java.util.concurrent.CompletableFuture;

@RestController
public class GeneratePlanController {

    @Autowired
    private GeminiService geminiService;

    @Autowired
    private SpotifyService spotifyService;

    @Autowired
    private SupabaseService supabase;

    private final ObjectMapper objectMapper = new ObjectMapper();

    public static class GeneratePlanRequest {
        public String userId;
        public String instrument;
        public String level;
        public String duration;
        public String dailyTime;
        public List<String> interests;
        public String mood;
    }

    @PostMapping("/generate-plan")
    public ResponseEntity<?> generatePlan(@RequestBody GeneratePlanRequest body) {
        try {
            if (body.userId == null || body.instrument == null || body.level == null ||
                    body.duration == null || body.dailyTime == null || body.interests == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "Missing required fields"));
            }

            String now = OffsetDateTime.now().toString();

            // 1. Ensure user row exists
            JsonNode existingUser = supabase.selectSingle("users", "id=eq." + body.userId + "&select=id");
            if (existingUser == null || existingUser.isNull()) {
                Map<String, Object> newUser = new HashMap<>();
                newUser.put("id", body.userId);
                newUser.put("email", "");
                newUser.put("updated_at", now);
                supabase.upsert("users", newUser);
            }

            // 2. Generate plan via Gemini
            System.out.println("🤖 Generating plan for " + body.instrument + " (" + body.level + ") - " + body.duration);
            JsonNode planData = geminiService.generateLearningPlan(
                    body.instrument, body.level, body.duration, body.dailyTime, body.interests, body.mood);

            String title = planData.path("title").asText("My Learning Plan");
            String summary = planData.path("summary").asText("");
            int totalMonths = planData.path("totalMonths").asInt(3);

            List<String> tipsList = new ArrayList<>();
            JsonNode tipsNode = planData.path("tips");
            if (tipsNode.isArray()) for (JsonNode tip : tipsNode) tipsList.add(tip.asText());

            String motivationalMessage = planData.path("motivationalMessage").asText("");
            String interests = String.join(",", body.interests);

            // 3. Save plan to learning_plans
            Map<String, Object> planRecord = new HashMap<>();
            planRecord.put("user_id", body.userId);
            planRecord.put("title", title);
            planRecord.put("summary", summary);
            planRecord.put("instrument", body.instrument);
            planRecord.put("skill_level", body.level);
            planRecord.put("goal_duration", body.duration);
            planRecord.put("daily_time", body.dailyTime);
            planRecord.put("music_interests", body.interests.toArray());
            planRecord.put("learning_mood", body.mood);
            planRecord.put("total_months", totalMonths);
            planRecord.put("plan_data", planData.toString()); // store as text JSONB
            planRecord.put("tips", tipsList.toArray());
            planRecord.put("motivational_message", motivationalMessage);
            planRecord.put("is_active", true);
            planRecord.put("updated_at", now);

            JsonNode savedPlan = supabase.insert("learning_plans", planRecord);
            String planId = savedPlan.path("id").asText();

            // 4. Deactivate other plans
            supabase.update("learning_plans",
                    "user_id=eq." + body.userId + "&id=neq." + planId,
                    Map.of("is_active", false, "updated_at", now));

            // 5. Save weeks to learning_weeks
            List<Map<String, Object>> weeksToInsert = new ArrayList<>();
            JsonNode months = planData.path("months");
            if (months.isArray()) {
                for (JsonNode month : months) {
                    int monthNumber = month.path("monthNumber").asInt();
                    JsonNode weeks = month.path("weeks");
                    if (weeks.isArray()) {
                        for (JsonNode week : weeks) {
                            List<String> topicsList = new ArrayList<>();
                            JsonNode topicsNode = week.path("topics");
                            if (topicsNode.isArray()) for (JsonNode t : topicsNode) topicsList.add(t.asText());

                            List<String> skillsList = new ArrayList<>();
                            JsonNode skillsNode = week.path("skills");
                            if (skillsNode.isArray()) for (JsonNode s : skillsNode) skillsList.add(s.asText());

                            List<String> ytList = new ArrayList<>();
                            JsonNode ytNode = week.path("youtubeSearches");
                            if (ytNode.isArray()) for (JsonNode y : ytNode) ytList.add(y.asText());

                            Map<String, Object> weekRecord = new HashMap<>();
                            weekRecord.put("plan_id", planId);
                            weekRecord.put("user_id", body.userId);
                            weekRecord.put("month_number", monthNumber);
                            weekRecord.put("week_number", week.path("weekNumber").asInt());
                            weekRecord.put("title", week.path("title").asText(""));
                            weekRecord.put("topics", topicsList.toArray());
                            weekRecord.put("skills", skillsList.toArray());
                            weekRecord.put("practice_goal", week.path("practiceGoal").asText(""));
                            weekRecord.put("practice_minutes", week.path("practiceMinutes").asInt(20));
                            weekRecord.put("milestone", week.path("milestone").asText(""));
                            weekRecord.put("youtube_searches", ytList.toArray());
                            weekRecord.put("is_completed", false);
                            weeksToInsert.add(weekRecord);
                        }
                    }
                }
            }
            if (!weeksToInsert.isEmpty()) {
                supabase.insertMany("learning_weeks", weeksToInsert);
            }

            // 6. Update user profile
            Map<String, Object> userUpdates = new HashMap<>();
            userUpdates.put("instrument", body.instrument);
            userUpdates.put("skill_level", body.level);
            userUpdates.put("goal_duration", body.duration);
            userUpdates.put("daily_time", body.dailyTime);
            userUpdates.put("music_interests", body.interests.toArray());
            userUpdates.put("learning_mood", body.mood);
            userUpdates.put("updated_at", now);
            supabase.update("users", "id=eq." + body.userId, userUpdates);

            // 7. Initialize progress record
            Map<String, Object> progressData = new HashMap<>();
            progressData.put("user_id", body.userId);
            progressData.put("plan_id", planId);
            progressData.put("month_number", 1);
            progressData.put("total_weeks", weeksToInsert.size());
            progressData.put("completed_weeks", 0);
            progressData.put("completion_percentage", 0);
            progressData.put("xp_earned", 0);
            progressData.put("updated_at", now);
            supabase.upsert("progress", progressData);

            // 8. Award "Journey Begins!" achievement
            JsonNode achExisting = supabase.selectSingle("achievements",
                    "user_id=eq." + body.userId + "&achievement_key=eq.first_plan&select=id");
            if (achExisting == null || achExisting.isNull()) {
                Map<String, Object> ach = new HashMap<>();
                ach.put("user_id", body.userId);
                ach.put("achievement_key", "first_plan");
                ach.put("title", "Journey Begins!");
                ach.put("description", "Created your first learning plan");
                ach.put("icon", "🗺️");
                ach.put("xp_reward", 100);
                ach.put("earned_at", now);
                supabase.insert("achievements", ach);
            }

            // 9. Asynchronously enrich plan songs with Spotify (fire-and-forget)
            final String finalPlanId = planId;
            final JsonNode finalPlanData = planData;
            CompletableFuture.runAsync(() -> enrichPlanSongsWithSpotify(finalPlanId, finalPlanData));

            return ResponseEntity.ok(Map.of(
                    "success", true,
                    "plan", savedPlan,
                    "planData", planData
            ));
        } catch (Exception e) {
            System.err.println("Generate plan error: " + e.getMessage());
            String msg = e.getMessage() != null ? e.getMessage() : "";
            boolean isRateLimit = msg.contains("429") || msg.contains("quota");
            String errText = isRateLimit
                    ? "AI engine rate limit hit. Please wait 30 seconds and try again."
                    : "Failed to generate plan";
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(
                    "error", errText,
                    "message", msg
            ));
        }
    }

    private void enrichPlanSongsWithSpotify(String planId, JsonNode planData) {
        try {
            JsonNode months = planData.path("months");
            if (!months.isArray()) return;

            for (JsonNode month : months) {
                JsonNode weeks = month.path("weeks");
                if (!weeks.isArray()) continue;
                for (JsonNode week : weeks) {
                    JsonNode songs = week.path("songs");
                    if (!songs.isArray()) continue;
                    for (JsonNode song : songs) {
                        String title = song.path("title").asText();
                        String artist = song.path("artist").asText();
                        if (title.isEmpty() || artist.isEmpty()) continue;

                        Map<String, Object> spotifyData = spotifyService.searchSpotifyTrack(title, artist);
                        if (spotifyData != null) {
                            // Save to songs table
                            Map<String, Object> songRecord = new HashMap<>();
                            songRecord.put("plan_id", planId);
                            songRecord.put("title", title);
                            songRecord.put("artist", artist);
                            songRecord.put("difficulty", song.path("difficulty").asText("beginner"));
                            songRecord.put("why_recommended", song.path("whyRecommended").asText(""));
                            songRecord.put("spotify_id", spotifyData.get("spotify_id"));
                            songRecord.put("spotify_url", spotifyData.get("spotify_url"));
                            songRecord.put("preview_url", spotifyData.get("preview_url"));
                            songRecord.put("album_art", spotifyData.get("album_art"));

                            List<String> skillsList = new ArrayList<>();
                            JsonNode skillsNode = song.path("skillsLearned");
                            if (skillsNode.isArray()) for (JsonNode s : skillsNode) skillsList.add(s.asText());
                            songRecord.put("skills_learned", skillsList.toArray());

                            try {
                                supabase.insert("songs", songRecord);
                            } catch (Exception ex) {
                                System.err.println("Song insert error [" + title + "]: " + ex.getMessage());
                            }
                        }
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("Spotify enrichment error: " + e.getMessage());
        }
    }
}
