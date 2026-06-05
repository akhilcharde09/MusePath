package com.musepath.api.controller;

import com.musepath.api.service.SupabaseService;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/progress")
public class ProgressController {

    @Autowired
    private SupabaseService supabase;

    public static class LogProgressRequest {
        public String userId;
        public String weekId;
        public String planId;
        public Integer durationMinutes;
        public String notes;
        public String mood;
    }

    @PostMapping
    public ResponseEntity<?> logProgress(@RequestBody LogProgressRequest body) {
        try {
            if (body.userId == null || body.durationMinutes == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "userId and durationMinutes required"));
            }

            String now = OffsetDateTime.now().toString();
            int xpEarned = (body.durationMinutes / 5) * 10; // 10 XP per 5 min

            // 1. Insert practice log
            Map<String, Object> logData = new HashMap<>();
            logData.put("user_id", body.userId);
            if (body.planId != null) logData.put("plan_id", body.planId);
            if (body.weekId != null) logData.put("week_id", body.weekId);
            logData.put("duration_minutes", body.durationMinutes);
            logData.put("notes", body.notes);
            logData.put("mood", body.mood);
            logData.put("practiced_at", now);
            JsonNode log = supabase.insert("practice_logs", logData);

            // 2. Fetch user
            JsonNode user = supabase.selectSingle("users", "id=eq." + body.userId + "&select=*");
            if (user == null) {
                return ResponseEntity.status(404).body(Map.of("error", "User not found"));
            }

            // Streak calculation
            int currentStreak = user.path("streak_days").asInt(0);
            int currentXp = user.path("xp").asInt(0);
            int totalMinutes = user.path("total_practice_minutes").asInt(0);
            String lastPracticeStr = user.path("last_practice_date").asText(null);
            LocalDate today = LocalDate.now();

            if (lastPracticeStr == null || lastPracticeStr.equals("null")) {
                currentStreak = 1;
            } else {
                LocalDate lastPractice = LocalDate.parse(lastPracticeStr.substring(0, 10));
                if (lastPractice.equals(today.minusDays(1))) {
                    currentStreak++;
                } else if (lastPractice.isBefore(today.minusDays(1))) {
                    currentStreak = 1;
                }
                // if already practiced today, keep current streak
            }

            // Update user stats
            Map<String, Object> userUpdates = new HashMap<>();
            userUpdates.put("total_practice_minutes", totalMinutes + body.durationMinutes);
            userUpdates.put("xp", currentXp + xpEarned);
            userUpdates.put("streak_days", currentStreak);
            userUpdates.put("last_practice_date", today.toString());
            userUpdates.put("updated_at", now);
            JsonNode updatedUser = supabase.update("users", "id=eq." + body.userId, userUpdates);

            // 3. Complete week if weekId provided
            if (body.weekId != null && body.planId != null) {
                JsonNode week = supabase.selectSingle("learning_weeks",
                        "id=eq." + body.weekId + "&select=*");
                if (week != null && !week.path("is_completed").asBoolean(false)) {
                    supabase.update("learning_weeks",
                            "id=eq." + body.weekId,
                            Map.of("is_completed", true, "completed_at", now));

                    // Recalculate progress
                    JsonNode allWeeks = supabase.select("learning_weeks",
                            "user_id=eq." + body.userId + "&plan_id=eq." + body.planId + "&select=id,is_completed");
                    int total = allWeeks != null && allWeeks.isArray() ? allWeeks.size() : 0;
                    int completed = 0;
                    if (allWeeks != null && allWeeks.isArray()) {
                        for (JsonNode w : allWeeks) {
                            if (w.path("is_completed").asBoolean(false)) completed++;
                        }
                    }
                    double pct = total > 0 ? Math.round((completed * 100.0 / total) * 100.0) / 100.0 : 0;

                    // Upsert progress record
                    Map<String, Object> progressData = new HashMap<>();
                    progressData.put("user_id", body.userId);
                    progressData.put("plan_id", body.planId);
                    progressData.put("month_number", week != null ? week.path("month_number").asInt(1) : 1);
                    progressData.put("total_weeks", total);
                    progressData.put("completed_weeks", completed);
                    progressData.put("completion_percentage", pct);
                    progressData.put("xp_earned", currentXp + xpEarned);
                    progressData.put("updated_at", now);
                    supabase.upsert("progress", progressData);

                    // Achievements
                    if (completed == 1) grantAchievement(body.userId, "first_week",
                            "First Week Done!", "Completed your first week of practice", "🎯", 150, now);
                    if (completed == 4) grantAchievement(body.userId, "first_month",
                            "Month Mastery", "Completed your first full month", "🏅", 500, now);
                }
            }

            // 4. Streak achievement
            if (currentStreak >= 7) {
                grantAchievement(body.userId, "7_day_streak",
                        "7 Day Streak 🔥", "Practiced 7 days in a row!", "🔥", 200, now);
            }

            // Fresh user
            JsonNode freshUser = supabase.selectSingle("users", "id=eq." + body.userId + "&select=*");

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("log", log);
            response.put("xpEarned", xpEarned);
            response.put("user", freshUser != null ? freshUser : updatedUser);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            System.err.println("Progress log error: " + e.getMessage());
            return ResponseEntity.internalServerError().body(Map.of(
                    "error", "Failed to log progress",
                    "message", e.getMessage() != null ? e.getMessage() : "unknown"
            ));
        }
    }

    @GetMapping
    public ResponseEntity<?> getProgress(@RequestParam("userId") String userId) {
        try {
            if (userId == null || userId.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "userId required"));
            }

            JsonNode logs = supabase.select("practice_logs",
                    "user_id=eq." + userId + "&order=practiced_at.desc&limit=100&select=*");
            JsonNode user = supabase.selectSingle("users", "id=eq." + userId + "&select=*");
            JsonNode achievements = supabase.select("achievements",
                    "user_id=eq." + userId + "&order=earned_at.desc&select=*");

            Map<String, Object> response = new HashMap<>();
            response.put("logs", logs);
            response.put("user", user);
            response.put("achievements", achievements);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            System.err.println("Progress GET error: " + e.getMessage());
            return ResponseEntity.internalServerError().body(Map.of(
                    "error", "Failed to get progress",
                    "message", e.getMessage() != null ? e.getMessage() : "unknown"
            ));
        }
    }

    private void grantAchievement(String userId, String key, String title,
                                   String description, String icon, int xpReward, String now) {
        try {
            // Check if already exists
            JsonNode existing = supabase.selectSingle("achievements",
                    "user_id=eq." + userId + "&achievement_key=eq." + key + "&select=id");
            if (existing == null || existing.isNull()) {
                Map<String, Object> ach = new HashMap<>();
                ach.put("user_id", userId);
                ach.put("achievement_key", key);
                ach.put("title", title);
                ach.put("description", description);
                ach.put("icon", icon);
                ach.put("xp_reward", xpReward);
                ach.put("earned_at", now);
                supabase.insert("achievements", ach);
            }
        } catch (Exception e) {
            System.err.println("Achievement grant error [" + key + "]: " + e.getMessage());
        }
    }
}
