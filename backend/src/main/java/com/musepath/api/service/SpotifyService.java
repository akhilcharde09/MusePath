package com.musepath.api.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import javax.net.ssl.SSLContext;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Map;

@Service
public class SpotifyService {

    @Value("${SPOTIFY_CLIENT_ID:}")
    private String clientId;

    @Value("${SPOTIFY_CLIENT_SECRET:}")
    private String clientSecret;

    private String spotifyToken = null;
    private long tokenExpiry = 0;

    private final HttpClient httpClient = buildHttpClient();

    private static HttpClient buildHttpClient() {
        try {
            SSLContext sslContext = SSLContext.getInstance("TLSv1.2");
            sslContext.init(null, null, null);
            return HttpClient.newBuilder()
                    .connectTimeout(Duration.ofSeconds(15))
                    .sslContext(sslContext)
                    .build();
        } catch (Exception e) {
            // Fallback to default if SSLContext init fails
            return HttpClient.newBuilder()
                    .connectTimeout(Duration.ofSeconds(15))
                    .build();
        }
    }
    private final ObjectMapper objectMapper = new ObjectMapper();

    private synchronized String getSpotifyToken() {
        if (spotifyToken != null && System.currentTimeMillis() < tokenExpiry) {
            return spotifyToken;
        }

        if (clientId == null || clientId.trim().isEmpty() || clientSecret == null || clientSecret.trim().isEmpty()) {
            System.err.println("Spotify credentials not configured");
            return null;
        }

        try {
            String authStr = clientId.trim() + ":" + clientSecret.trim();
            String base64Auth = Base64.getEncoder().encodeToString(authStr.getBytes(StandardCharsets.UTF_8));

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create("https://accounts.spotify.com/api/token"))
                    .header("Authorization", "Basic " + base64Auth)
                    .header("Content-Type", "application/x-www-form-urlencoded")
                    .POST(HttpRequest.BodyPublishers.ofString("grant_type=client_credentials"))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                System.err.println("Failed to fetch Spotify token: status " + response.statusCode() + ", body: " + response.body());
                return null;
            }

            JsonNode responseJson = objectMapper.readTree(response.body());
            spotifyToken = responseJson.path("access_token").asText();
            int expiresIn = responseJson.path("expires_in").asInt(3600);
            tokenExpiry = System.currentTimeMillis() + (expiresIn - 60) * 1000L;

            return spotifyToken;
        } catch (Exception e) {
            System.err.println("Error fetching Spotify token: " + e.getMessage());
            return null;
        }
    }

    public Map<String, Object> searchSpotifyTrack(String title, String artist) {
        String token = getSpotifyToken();
        if (token == null) return null;

        try {
            String queryStr = "track:" + title + " artist:" + artist;
            String query = URLEncoder.encode(queryStr, StandardCharsets.UTF_8.toString());
            String url = "https://api.spotify.com/v1/search?q=" + query + "&type=track&limit=1";

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Authorization", "Bearer " + token)
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                return null;
            }

            JsonNode root = objectMapper.readTree(response.body());
            JsonNode items = root.path("tracks").path("items");

            if (items.isArray() && items.size() > 0) {
                JsonNode track = items.get(0);
                String spotifyId = track.path("id").asText();
                String spotifyUrl = track.path("external_urls").path("spotify").asText();
                String previewUrl = track.path("preview_url").asText(null);
                JsonNode images = track.path("album").path("images");
                String albumArt = "";
                if (images.isArray() && images.size() > 0) {
                    albumArt = images.get(0).path("url").asText("");
                }
                long durationMs = track.path("duration_ms").asLong();

                return Map.of(
                        "spotify_id", spotifyId,
                        "spotify_url", spotifyUrl,
                        "preview_url", previewUrl != null ? previewUrl : "",
                        "album_art", albumArt != null ? albumArt : "",
                        "duration_ms", durationMs
                );
            }
        } catch (Exception e) {
            System.err.println("Error searching Spotify track \"" + title + "\": " + e.getMessage());
        }
        return null;
    }

    public List<Map<String, Object>> getSpotifyRecommendations(String instrument, String genre, String mood, int limit) {
        String token = getSpotifyToken();
        if (token == null) return List.of();

        try {
            List<String> queryParts = new ArrayList<>();
            if (instrument != null && !instrument.trim().isEmpty()) queryParts.add(instrument);
            if (genre != null && !genre.trim().isEmpty()) queryParts.add(genre);
            if (mood != null && !mood.trim().isEmpty()) queryParts.add(mood);

            String queryStr = queryParts.isEmpty() ? "music" : String.join(" ", queryParts);
            String query = URLEncoder.encode(queryStr, StandardCharsets.UTF_8.toString());

            int cappedLimit = Math.min(Math.max(1, limit), 10);
            String url = "https://api.spotify.com/v1/search?q=" + query + "&type=track&limit=" + cappedLimit;

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Authorization", "Bearer " + token)
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());

            if (response.statusCode() != 200) {
                System.err.println("Spotify search failed: status " + response.statusCode());
                return List.of();
            }

            JsonNode root = objectMapper.readTree(response.body());
            JsonNode items = root.path("tracks").path("items");
            List<Map<String, Object>> list = new ArrayList<>();

            if (items.isArray()) {
                for (JsonNode t : items) {
                    String title = t.path("name").asText();
                    String artist = t.path("artists").get(0).path("name").asText();
                    String spotifyUrl = t.path("external_urls").path("spotify").asText();
                    String previewUrl = t.path("preview_url").asText("");
                    
                    JsonNode images = t.path("album").path("images");
                    String albumArt = "";
                    if (images.isArray() && images.size() > 0) {
                        albumArt = images.size() > 1 ? images.get(1).path("url").asText() : images.get(0).path("url").asText();
                    }
                    String spotifyId = t.path("id").asText();

                    list.add(Map.of(
                            "title", title,
                            "artist", artist,
                            "spotify_url", spotifyUrl,
                            "preview_url", previewUrl,
                            "album_art", albumArt,
                            "spotify_id", spotifyId
                    ));
                }
            }
            return list;
        } catch (Exception e) {
            System.err.println("Spotify recommendations search error: " + e.getMessage());
            return List.of();
        }
    }
}
