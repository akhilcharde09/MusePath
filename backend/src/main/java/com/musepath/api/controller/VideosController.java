package com.musepath.api.controller;

import com.musepath.api.service.YouTubeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import java.util.List;
import java.util.Map;

@RestController
public class VideosController {

    @Autowired
    private YouTubeService youtubeService;

    @GetMapping("/videos")
    public ResponseEntity<?> getVideos(
            @RequestParam(value = "instrument", defaultValue = "guitar") String instrument,
            @RequestParam(value = "topic", defaultValue = "basics") String topic,
            @RequestParam(value = "level", defaultValue = "beginner") String level,
            @RequestParam(value = "query", required = false) String query) {

        try {
            String searchQuery = query;
            if (searchQuery == null || searchQuery.trim().isEmpty()) {
                searchQuery = youtubeService.buildVideoQuery(instrument, topic, level);
            }

            List<Map<String, Object>> videos = youtubeService.searchYouTubeVideos(searchQuery, 8);

            return ResponseEntity.ok(Map.of(
                    "videos", videos,
                    "searchQuery", searchQuery,
                    "instrument", instrument,
                    "topic", topic,
                    "level", level
            ));
        } catch (Exception e) {
            System.err.println("Videos error: " + e.getMessage());
            return ResponseEntity.internalServerError().body(Map.of(
                    "error", "Failed to get videos",
                    "message", e.getMessage()
            ));
        }
    }
}
