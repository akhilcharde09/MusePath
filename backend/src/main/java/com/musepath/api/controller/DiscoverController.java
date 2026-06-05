package com.musepath.api.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.musepath.api.service.GeminiService;
import com.musepath.api.service.SpotifyService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

@RestController
public class DiscoverController {

    @Autowired
    private GeminiService geminiService;

    @Autowired
    private SpotifyService spotifyService;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @GetMapping("/discover")
    public ResponseEntity<?> getDiscover(
            @RequestParam(value = "instrument", defaultValue = "guitar") String instrument,
            @RequestParam(value = "level", defaultValue = "beginner") String level,
            @RequestParam(value = "mood", defaultValue = "chill") String mood,
            @RequestParam(value = "genre", defaultValue = "pop") String genre,
            @RequestParam(value = "limit", defaultValue = "10") String limitStr) {

        int limit = 10;
        try {
            limit = Math.min(Integer.parseInt(limitStr), 10);
        } catch (NumberFormatException e) {
            // keep 10
        }

        try {
            System.out.println("🔍 Getting recommendations for " + instrument + " (" + level + ", " + genre + ", " + mood + ")");
            List<Map<String, Object>> songsList = new ArrayList<>();

            try {
                // Call Gemini for recommendation JSON array
                JsonNode geminiRecs = geminiService.generateSongRecommendations(instrument, level, mood, genre, limit);
                System.out.println("🤖 Gemini successfully recommended songs. Enriching with Spotify details...");

                if (geminiRecs.isArray()) {
                    List<CompletableFuture<Map<String, Object>>> enrichmentFutures = new ArrayList<>();

                    for (JsonNode songNode : geminiRecs) {
                        String title = songNode.path("title").asText("");
                        String artist = songNode.path("artist").asText("");
                        
                        CompletableFuture<Map<String, Object>> future = CompletableFuture.supplyAsync(() -> {
                            Map<String, Object> songMap = new HashMap<>();
                            songMap.put("title", title);
                            songMap.put("artist", artist);
                            songMap.put("difficulty", songNode.path("difficulty").asText(level));
                            songMap.put("whyRecommended", songNode.path("whyRecommended").asText(""));
                            
                            List<String> skillsList = new ArrayList<>();
                            JsonNode skills = songNode.path("skillsLearned");
                            if (skills.isArray()) {
                                for (JsonNode s : skills) skillsList.add(s.asText());
                            }
                            songMap.put("skillsLearned", skillsList);
                            songMap.put("genre", songNode.path("genre").asText(genre));
                            songMap.put("mood", songNode.path("mood").asText(mood));
                            songMap.put("estimatedLearningTime", songNode.path("estimatedLearningTime").asText("1-2 weeks"));
                            songMap.put("funFact", songNode.path("funFact").asText(""));

                            // Enrich with Spotify
                            if (!title.isEmpty() && !artist.isEmpty()) {
                                Map<String, Object> spotifyDetails = spotifyService.searchSpotifyTrack(title, artist);
                                if (spotifyDetails != null) {
                                    Map<String, Object> editableMap = new HashMap<>(songMap);
                                    editableMap.putAll(spotifyDetails);
                                    return editableMap;
                                }
                            }
                            return songMap;
                        });

                        enrichmentFutures.add(future);
                    }

                    // Wait for all to complete
                    CompletableFuture.allOf(enrichmentFutures.toArray(new CompletableFuture[0])).join();

                    for (CompletableFuture<Map<String, Object>> f : enrichmentFutures) {
                        try {
                            songsList.add(f.get());
                        } catch (Exception e) {
                            // ignore individual fail
                        }
                    }
                }
            } catch (Exception geminiErr) {
                System.out.println("⚠️ Gemini recommendations failed. Falling back to Spotify API: " + geminiErr.getMessage());

                // Fallback: Query Spotify directly
                List<Map<String, Object>> spotifyRecs = spotifyService.getSpotifyRecommendations(instrument, genre, mood, limit);
                if (spotifyRecs.isEmpty()) {
                    throw new RuntimeException("Both Gemini and Spotify APIs failed to return recommendations");
                }

                for (Map<String, Object> track : spotifyRecs) {
                    Map<String, Object> songMap = new HashMap<>();
                    songMap.put("title", track.get("title"));
                    songMap.put("artist", track.get("artist"));
                    songMap.put("difficulty", level);
                    songMap.put("whyRecommended", "Recommended directly from Spotify! Great for practicing rhythm, melody, and pacing on the " + instrument + ".");
                    songMap.put("skillsLearned", List.of("Rhythm Control", "Melodic Flow", "Hand Coordination"));
                    songMap.put("genre", genre);
                    songMap.put("mood", mood);
                    songMap.put("estimatedLearningTime", "1-2 weeks");
                    songMap.put("funFact", "This track is trending in the " + genre + " genre and fits a " + mood + " vibe perfectly.");
                    songMap.put("spotify_url", track.get("spotify_url"));
                    songMap.put("preview_url", track.get("preview_url"));
                    songMap.put("album_art", track.get("album_art"));
                    songMap.put("spotify_id", track.get("spotify_id"));

                    songsList.add(songMap);
                }
            }

            Map<String, Object> response = new HashMap<>();
            response.put("songs", songsList);
            response.put("mood", mood);
            response.put("genre", genre);
            response.put("instrument", instrument);
            response.put("level", level);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            System.err.println("Discover page critical failure: " + e.getMessage());
            return ResponseEntity.internalServerError().body(Map.of(
                    "error", "Failed to get recommendations",
                    "message", e.getMessage()
            ));
        }
    }
}
