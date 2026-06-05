package com.musepath.api.controller;

import com.musepath.api.service.SupabaseService;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.HashMap;
import java.util.Map;

@RestController
public class DashboardController {

    @Autowired
    private SupabaseService supabase;

    @GetMapping("/dashboard")
    public ResponseEntity<?> getDashboard(@RequestParam("userId") String userId) {
        try {
            if (userId == null || userId.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "userId required"));
            }

            // Fetch user profile
            JsonNode user = supabase.selectSingle("users", "id=eq." + userId + "&select=*");
            if (user == null || user.isNull()) {
                String now = java.time.OffsetDateTime.now().toString();
                Map<String, Object> newUser = new HashMap<>();
                newUser.put("id", userId);
                newUser.put("email", "");
                newUser.put("updated_at", now);
                user = supabase.insert("users", newUser);
            }

            // Fetch active plan
            JsonNode planArr = supabase.select("learning_plans",
                    "user_id=eq." + userId + "&is_active=eq.true&select=*&limit=1");
            JsonNode plan = (planArr != null && planArr.isArray() && planArr.size() > 0) ? planArr.get(0) : null;

            // Fetch progress for active plan
            JsonNode progress = null;
            JsonNode currentWeek = null;
            JsonNode weeks = null;
            if (plan != null) {
                String planId = plan.path("id").asText();
                progress = supabase.selectSingle("progress",
                        "user_id=eq." + userId + "&plan_id=eq." + planId + "&select=*");
                // Get first incomplete week
                JsonNode weekArr = supabase.select("learning_weeks",
                        "user_id=eq." + userId + "&plan_id=eq." + planId +
                        "&is_completed=eq.false&order=month_number.asc,week_number.asc&limit=1&select=*");
                currentWeek = (weekArr != null && weekArr.isArray() && weekArr.size() > 0) ? weekArr.get(0) : null;
                // Get all weeks for active plan to track completion state
                weeks = supabase.select("learning_weeks",
                        "plan_id=eq." + planId + "&order=month_number.asc,week_number.asc&select=*");
            }

            // Recent practice logs (last 7)
            JsonNode recentLogs = supabase.select("practice_logs",
                    "user_id=eq." + userId + "&order=practiced_at.desc&limit=7&select=*");

            // Saved songs (last 4)
            JsonNode savedSongs = supabase.select("saved_songs",
                    "user_id=eq." + userId + "&order=created_at.desc&limit=4&select=*");

            // Achievements
            JsonNode achievements = supabase.select("achievements",
                    "user_id=eq." + userId + "&order=earned_at.desc&select=*");

            // Compute metrics from user
            int streak = user != null ? user.path("streak_days").asInt(0) : 0;
            int totalMinutes = user != null ? user.path("total_practice_minutes").asInt(0) : 0;
            int xp = user != null ? user.path("xp").asInt(0) : 0;

            Map<String, Object> response = new HashMap<>();
            response.put("user", user);
            response.put("plan", plan);
            response.put("progress", progress);
            response.put("currentWeek", currentWeek);
            response.put("weeks", weeks);
            response.put("recentLogs", recentLogs);
            response.put("savedSongs", savedSongs);
            response.put("achievements", achievements);
            response.put("streak", streak);
            response.put("totalMinutes", totalMinutes);
            response.put("xp", xp);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            System.err.println("Dashboard load error: " + e.getMessage());
            return ResponseEntity.internalServerError().body(Map.of(
                    "error", "Failed to load dashboard",
                    "message", e.getMessage() != null ? e.getMessage() : "unknown"
            ));
        }
    }
}
