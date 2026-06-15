package com.musepath.api.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.concurrent.CompletableFuture;

/**
 * AsyncService - Handles background tasks like enriching plan songs with Spotify.
 * Now uses SupabaseService REST API instead of JPA repositories.
 */
@Service
public class AsyncService {

    @Autowired
    private SpotifyService spotifyService;

    @Autowired
    private SupabaseService supabase;

    public void enrichPlanSongsWithSpotifyAsync(String planId, JsonNode planData) {
        CompletableFuture.runAsync(() -> {
            try {
                System.out.println("🎵 [Background] Enriching plan songs with Spotify details...");

                JsonNode months = planData.path("months");
                if (!months.isArray()) return;

                for (JsonNode month : months) {
                    JsonNode weeks = month.path("weeks");
                    if (!weeks.isArray()) continue;
                    for (JsonNode week : weeks) {
                        JsonNode songs = week.path("songs");
                        if (!songs.isArray()) continue;
                        for (JsonNode song : songs) {
                            String title = song.path("title").asText("");
                            String artist = song.path("artist").asText("");
                            if (title.isEmpty() || artist.isEmpty()) continue;

                            try {
                                Map<String, Object> spotifyData = spotifyService.searchSpotifyTrack(title, artist);
                                if (spotifyData != null) {
                                    ((ObjectNode) song).put("spotify_id", (String) spotifyData.get("spotify_id"));
                                    ((ObjectNode) song).put("spotify_url", (String) spotifyData.get("spotify_url"));
                                    ((ObjectNode) song).put("preview_url", (String) spotifyData.get("preview_url"));
                                    ((ObjectNode) song).put("album_art", (String) spotifyData.get("album_art"));
                                }
                            } catch (Exception e) {
                                System.err.println("Spotify enrichment failed for [" + title + "]: " + e.getMessage());
                            }
                        }
                    }
                }

                System.out.println("✓ [Background] Spotify enrichment complete.");
            } catch (Exception e) {
                System.err.println("Error in background Spotify enrichment: " + e.getMessage());
            }
        });
    }
}
