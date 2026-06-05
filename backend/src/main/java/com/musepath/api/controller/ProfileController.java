package com.musepath.api.controller;

import com.musepath.api.service.SupabaseService;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/profile")
public class ProfileController {

    @Autowired
    private SupabaseService supabase;

    @GetMapping
    public ResponseEntity<?> getProfile(@RequestParam("userId") String userId) {
        try {
            if (userId == null || userId.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "userId required"));
            }

            // Fetch all profile data
            JsonNode user = supabase.selectSingle("users", "id=eq." + userId + "&select=*");
            if (user == null || user.isNull()) {
                String now = java.time.OffsetDateTime.now().toString();
                Map<String, Object> newUser = new HashMap<>();
                newUser.put("id", userId);
                newUser.put("email", "");
                newUser.put("updated_at", now);
                user = supabase.insert("users", newUser);
            }
            JsonNode plans = supabase.select("learning_plans",
                    "user_id=eq." + userId + "&order=created_at.desc&select=*");
            JsonNode savedSongs = supabase.select("saved_songs",
                    "user_id=eq." + userId + "&order=created_at.desc&select=*");
            JsonNode achievements = supabase.select("achievements",
                    "user_id=eq." + userId + "&order=earned_at.desc&select=*");
            JsonNode logs = supabase.select("practice_logs",
                    "user_id=eq." + userId + "&order=practiced_at.desc&limit=100&select=*");

            // Compute stats
            int totalSessions = logs != null && logs.isArray() ? logs.size() : 0;
            int totalMinutes = 0;
            if (logs != null && logs.isArray()) {
                for (JsonNode log : logs) {
                    totalMinutes += log.path("duration_minutes").asInt(0);
                }
            }
            double totalHours = Math.round((totalMinutes / 60.0) * 10.0) / 10.0;
            int savedCount = savedSongs != null && savedSongs.isArray() ? savedSongs.size() : 0;
            int plansCount = plans != null && plans.isArray() ? plans.size() : 0;
            int achCount = achievements != null && achievements.isArray() ? achievements.size() : 0;

            Map<String, Object> stats = Map.of(
                    "totalSessions", totalSessions,
                    "totalMinutes", totalMinutes,
                    "totalHours", totalHours,
                    "savedSongsCount", savedCount,
                    "plansCount", plansCount,
                    "achievementsCount", achCount
            );

            Map<String, Object> response = new HashMap<>();
            response.put("user", user);
            response.put("plans", plans);
            response.put("savedSongs", savedSongs);
            response.put("achievements", achievements);
            response.put("stats", stats);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            System.err.println("Profile loading error: " + e.getMessage());
            return ResponseEntity.internalServerError().body(Map.of(
                    "error", "Failed to load profile",
                    "message", e.getMessage() != null ? e.getMessage() : "unknown"
            ));
        }
    }

    public static class UpdateProfileRequest {
        public String userId;
        public String username;
        public String avatar_url;
    }

    @PatchMapping
    public ResponseEntity<?> updateProfile(@RequestBody UpdateProfileRequest body) {
        try {
            if (body.userId == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "userId required"));
            }

            Map<String, Object> updates = new HashMap<>();
            if (body.username != null) updates.put("username", body.username);
            if (body.avatar_url != null) updates.put("avatar_url", body.avatar_url);
            updates.put("updated_at", java.time.OffsetDateTime.now().toString());

            JsonNode updated = supabase.update("users", "id=eq." + body.userId, updates);

            return ResponseEntity.ok(Map.of("user", updated != null ? updated : Map.of()));
        } catch (Exception e) {
            System.err.println("Profile update error: " + e.getMessage());
            return ResponseEntity.internalServerError().body(Map.of(
                    "error", "Failed to update profile",
                    "message", e.getMessage() != null ? e.getMessage() : "unknown"
            ));
        }
    }
}
