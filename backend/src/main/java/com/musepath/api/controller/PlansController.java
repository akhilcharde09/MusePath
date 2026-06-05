package com.musepath.api.controller;

import com.musepath.api.service.SupabaseService;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/plans")
public class PlansController {

    @Autowired
    private SupabaseService supabase;

    @GetMapping
    public ResponseEntity<?> getPlans(@RequestParam("userId") String userId) {
        try {
            if (userId == null || userId.trim().isEmpty()) {
                return ResponseEntity.badRequest().body(Map.of("error", "userId required"));
            }
            JsonNode plans = supabase.select("learning_plans",
                    "user_id=eq." + userId + "&order=created_at.desc&select=*");
            return ResponseEntity.ok(plans);
        } catch (Exception e) {
            System.err.println("Failed to get plans: " + e.getMessage());
            return ResponseEntity.internalServerError().body(Map.of(
                    "error", "Failed to retrieve plans",
                    "message", e.getMessage() != null ? e.getMessage() : "unknown"
            ));
        }
    }

    public static class SetActiveRequest {
        public String userId;
        public String planId;
    }

    @PostMapping("/active")
    public ResponseEntity<?> setActivePlan(@RequestBody SetActiveRequest body) {
        try {
            if (body.userId == null || body.planId == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "userId and planId required"));
            }

            // Verify plan belongs to user
            JsonNode plan = supabase.selectSingle("learning_plans",
                    "id=eq." + body.planId + "&user_id=eq." + body.userId + "&select=*");
            if (plan == null || plan.isNull()) {
                return ResponseEntity.status(404).body(Map.of("error", "Plan not found or does not belong to user"));
            }

            String now = java.time.OffsetDateTime.now().toString();

            // Deactivate ALL plans for this user
            supabase.update("learning_plans",
                    "user_id=eq." + body.userId,
                    Map.of("is_active", false, "updated_at", now));

            // Activate the chosen plan
            JsonNode updated = supabase.update("learning_plans",
                    "id=eq." + body.planId,
                    Map.of("is_active", true, "updated_at", now));

            // Sync user profile fields from this plan
            java.util.Map<String, Object> userUpdates = new java.util.HashMap<>();
            userUpdates.put("instrument", plan.path("instrument").asText(null));
            userUpdates.put("skill_level", plan.path("skill_level").asText(null));
            userUpdates.put("goal_duration", plan.path("goal_duration").asText(null));
            userUpdates.put("daily_time", plan.path("daily_time").asText(null));
            userUpdates.put("learning_mood", plan.path("learning_mood").asText(null));
            userUpdates.put("updated_at", now);
            supabase.update("users", "id=eq." + body.userId, userUpdates);

            return ResponseEntity.ok(Map.of("success", true, "plan", updated != null ? updated : plan));
        } catch (Exception e) {
            System.err.println("Failed to set active plan: " + e.getMessage());
            return ResponseEntity.internalServerError().body(Map.of(
                    "error", "Failed to update active plan",
                    "message", e.getMessage() != null ? e.getMessage() : "unknown"
            ));
        }
    }
}
