package com.musepath.api.controller;

import com.musepath.api.service.SupabaseService;
import com.fasterxml.jackson.databind.JsonNode;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.time.OffsetDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/save-song")
public class SaveSongController {

    @Autowired
    private SupabaseService supabase;

    public static class SongDTO {
        public String title;
        public String artist;
        public String difficulty;
        public String genre;
        public String whyRecommended;
        public List<String> skillsLearned;
    }

    public static class SaveSongRequest {
        public String userId;
        public SongDTO song;
        public String action = "save";
    }

    @PostMapping
    public ResponseEntity<?> saveSong(@RequestBody SaveSongRequest body) {
        try {
            if (body.userId == null || body.song == null || body.song.title == null || body.song.artist == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "userId and song (title, artist) required"));
            }

            String title = body.song.title.trim();
            String artist = body.song.artist.trim();
            String action = body.action != null ? body.action : "save";
            String now = OffsetDateTime.now().toString();

            // Check if already saved
            JsonNode existing = supabase.selectSingle("saved_songs",
                    "user_id=eq." + body.userId
                    + "&song_title=eq." + supabase.encode(title)
                    + "&song_artist=eq." + supabase.encode(artist)
                    + "&select=id");

            Map<String, Object> songData = new HashMap<>();
            songData.put("user_id", body.userId);
            songData.put("song_title", title);
            songData.put("song_artist", artist);
            songData.put("difficulty", body.song.difficulty);
            songData.put("genre", body.song.genre);
            songData.put("why_recommended", body.song.whyRecommended);
            songData.put("skills_learned",
                    body.song.skillsLearned != null ? body.song.skillsLearned.toArray() : new Object[0]);

            JsonNode savedSong;
            if (existing != null && !existing.isNull()) {
                // Update
                savedSong = supabase.update("saved_songs",
                        "id=eq." + existing.path("id").asText(), songData);
            } else {
                // Insert
                songData.put("created_at", now);
                savedSong = supabase.insert("saved_songs", songData);

                // Award first song achievement
                JsonNode achExisting = supabase.selectSingle("achievements",
                        "user_id=eq." + body.userId + "&achievement_key=eq.first_song_saved&select=id");
                if (achExisting == null || achExisting.isNull()) {
                    Map<String, Object> ach = new HashMap<>();
                    ach.put("user_id", body.userId);
                    ach.put("achievement_key", "first_song_saved");
                    ach.put("title", "Song Collector!");
                    ach.put("description", "Saved your first song to learn");
                    ach.put("icon", "🎵");
                    ach.put("xp_reward", 50);
                    ach.put("earned_at", now);
                    supabase.insert("achievements", ach);
                }
            }

            return ResponseEntity.ok(Map.of("success", true, "savedSong", savedSong != null ? savedSong : Map.of()));
        } catch (Exception e) {
            System.err.println("Save song error: " + e.getMessage());
            return ResponseEntity.internalServerError().body(Map.of(
                    "error", "Failed to save song",
                    "message", e.getMessage() != null ? e.getMessage() : "unknown"
            ));
        }
    }

    public static class DeleteSongRequest {
        public String userId;
        public String songTitle;
        public String songArtist;
    }

    @DeleteMapping
    public ResponseEntity<?> deleteSong(@RequestBody DeleteSongRequest body) {
        try {
            if (body.userId == null || body.songTitle == null || body.songArtist == null) {
                return ResponseEntity.badRequest().body(Map.of("error", "userId, songTitle, and songArtist required"));
            }

            supabase.delete("saved_songs",
                    "user_id=eq." + body.userId
                    + "&song_title=eq." + supabase.encode(body.songTitle.trim())
                    + "&song_artist=eq." + supabase.encode(body.songArtist.trim()));

            return ResponseEntity.ok(Map.of("success", true));
        } catch (Exception e) {
            System.err.println("Delete song error: " + e.getMessage());
            return ResponseEntity.internalServerError().body(Map.of(
                    "error", "Failed to delete song",
                    "message", e.getMessage() != null ? e.getMessage() : "unknown"
            ));
        }
    }
}
