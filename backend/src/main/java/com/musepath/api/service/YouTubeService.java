package com.musepath.api.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Service
public class YouTubeService {

    @Value("${YOUTUBE_API_KEY:}")
    private String apiKey;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();
    private final ObjectMapper objectMapper = new ObjectMapper();

    public List<Map<String, Object>> searchYouTubeVideos(String query, int maxResults) {
        if (apiKey == null || apiKey.trim().isEmpty()) {
            System.err.println("YouTube API key not configured");
            return List.of();
        }

        try {
            String encodedQuery = URLEncoder.encode(query, StandardCharsets.UTF_8.toString());
            String searchUrl = "https://www.googleapis.com/youtube/v3/search" +
                    "?part=snippet" +
                    "&q=" + encodedQuery +
                    "&type=video" +
                    "&maxResults=" + maxResults +
                    "&key=" + apiKey +
                    "&relevanceLanguage=en" +
                    "&safeSearch=strict";

            HttpRequest searchRequest = HttpRequest.newBuilder()
                    .uri(URI.create(searchUrl))
                    .GET()
                    .build();

            HttpResponse<String> searchResponse = httpClient.send(searchRequest, HttpResponse.BodyHandlers.ofString());

            if (searchResponse.statusCode() != 200) {
                System.err.println("YouTube search request failed: status " + searchResponse.statusCode() + ", body: " + searchResponse.body());
                return List.of();
            }

            JsonNode searchRoot = objectMapper.readTree(searchResponse.body());
            JsonNode items = searchRoot.path("items");
            List<String> videoIdsList = new ArrayList<>();

            if (items.isArray()) {
                for (JsonNode item : items) {
                    String videoId = item.path("id").path("videoId").asText("");
                    if (!videoId.isEmpty()) {
                        videoIdsList.add(videoId);
                    }
                }
            }

            if (videoIdsList.isEmpty()) {
                return List.of();
            }

            String videoIds = String.join(",", videoIdsList);

            // Fetch video details
            String detailsUrl = "https://www.googleapis.com/youtube/v3/videos" +
                    "?part=snippet,contentDetails,statistics" +
                    "&id=" + videoIds +
                    "&key=" + apiKey;

            HttpRequest detailsRequest = HttpRequest.newBuilder()
                    .uri(URI.create(detailsUrl))
                    .GET()
                    .build();

            HttpResponse<String> detailsResponse = httpClient.send(detailsRequest, HttpResponse.BodyHandlers.ofString());

            if (detailsResponse.statusCode() != 200) {
                System.err.println("YouTube details request failed: status " + detailsResponse.statusCode());
                return List.of();
            }

            JsonNode detailsRoot = objectMapper.readTree(detailsResponse.body());
            JsonNode detailItems = detailsRoot.path("items");
            List<Map<String, Object>> resultList = new ArrayList<>();

            if (detailItems.isArray()) {
                for (JsonNode video : detailItems) {
                    String videoId = video.path("id").asText();
                    String title = video.path("snippet").path("title").asText("");
                    String channel = video.path("snippet").path("channelTitle").asText("");
                    
                    JsonNode thumbnails = video.path("snippet").path("thumbnails");
                    String thumbnail = thumbnails.path("medium").path("url").asText("");
                    if (thumbnail.isEmpty()) {
                        thumbnail = thumbnails.path("default").path("url").asText("");
                    }
                    
                    String isoDuration = video.path("contentDetails").path("duration").asText("");
                    String duration = buildDuration(isoDuration);
                    
                    long viewCount = video.path("statistics").path("viewCount").asLong(0);
                    String description = video.path("snippet").path("description").asText("");
                    if (description.length() > 200) {
                        description = description.substring(0, 200);
                    }

                    resultList.add(Map.of(
                            "youtube_id", videoId,
                            "title", title,
                            "channel", channel,
                            "thumbnail", thumbnail,
                            "duration", duration,
                            "view_count", viewCount,
                            "watch_url", "https://www.youtube.com/watch?v=" + videoId,
                            "description", description
                    ));
                }
            }
            return resultList;
        } catch (Exception e) {
            System.err.println("YouTube search execution error: " + e.getMessage());
            return List.of();
        }
    }

    public String buildVideoQuery(String instrument, String topic, String level) {
        String levelModifier = "tutorial";
        if ("beginner".equalsIgnoreCase(level)) {
            levelModifier = "for beginners";
        } else if ("intermediate".equalsIgnoreCase(level)) {
            levelModifier = "tutorial";
        } else if ("advanced".equalsIgnoreCase(level)) {
            levelModifier = "advanced lesson";
        }
        return instrument + " " + topic + " " + levelModifier + " lesson";
    }

    private String buildDuration(String isoDuration) {
        if (isoDuration == null || isoDuration.trim().isEmpty()) return "";
        try {
            // Standard parse since Java 9 support is solid
            Duration d = Duration.parse(isoDuration);
            long hours = d.toHours();
            int minutes = d.toMinutesPart();
            int seconds = d.toSecondsPart();
            if (hours > 0) {
                return String.format("%d:%02d:%02d", hours, minutes, seconds);
            } else {
                return String.format("%d:%02d", minutes, seconds);
            }
        } catch (Exception e) {
            // Regex fallback
            try {
                Pattern pattern = Pattern.compile("PT(?:(\\d+)H)?(?:(\\d+)M)?(?:(\\d+)S)?");
                Matcher matcher = pattern.matcher(isoDuration);
                if (matcher.matches()) {
                    String h = matcher.group(1);
                    String m = matcher.group(2);
                    String s = matcher.group(3);
                    int hours = h != null ? Integer.parseInt(h) : 0;
                    int minutes = m != null ? Integer.parseInt(m) : 0;
                    int seconds = s != null ? Integer.parseInt(s) : 0;
                    if (hours > 0) {
                        return String.format("%d:%02d:%02d", hours, minutes, seconds);
                    } else {
                        return String.format("%d:%02d", minutes, seconds);
                    }
                }
            } catch (Exception ex) {
                // fall through
            }
        }
        return "";
    }
}
