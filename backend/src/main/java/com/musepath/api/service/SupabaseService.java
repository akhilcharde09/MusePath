package com.musepath.api.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Map;

/**
 * SupabaseService - Replaces JPA/JDBC with Supabase REST API (PostgREST).
 * Uses SUPABASE_URL + SUPABASE_SERVICE_KEY - no DB password needed!
 */
@Service
public class SupabaseService {

    @Value("${SUPABASE_URL:}")
    private String supabaseUrl;

    @Value("${SUPABASE_SERVICE_KEY:}")
    private String serviceKey;

    private final HttpClient httpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

    private final ObjectMapper objectMapper = new ObjectMapper();

    // =========================================================
    //  Core HTTP Methods
    // =========================================================

    /**
     * GET /rest/v1/{table}?{query}
     * Returns the raw JSON array response from Supabase.
     */
    public JsonNode select(String table, String query) {
        try {
            String url = supabaseUrl + "/rest/v1/" + table + (query != null && !query.isEmpty() ? "?" + query : "");
            HttpRequest req = buildRequest(url).GET().build();
            HttpResponse<String> res = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
            checkStatus(res, "SELECT " + table);
            return objectMapper.readTree(res.body());
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Supabase SELECT failed [" + table + "]: " + e.getMessage(), e);
        }
    }

    /**
     * GET /rest/v1/{table}?{query} with Prefer: return=representation (single)
     * Returns a single JsonNode or null.
     */
    public JsonNode selectSingle(String table, String query) {
        JsonNode arr = select(table, query + "&limit=1");
        if (arr != null && arr.isArray() && arr.size() > 0) {
            return arr.get(0);
        }
        return null;
    }

    /**
     * POST /rest/v1/{table} with Prefer: return=representation
     * Returns the created row.
     */
    public JsonNode insert(String table, Object body) {
        try {
            String url = supabaseUrl + "/rest/v1/" + table;
            String json = objectMapper.writeValueAsString(body);
            HttpRequest req = buildRequest(url)
                    .header("Prefer", "return=representation")
                    .POST(HttpRequest.BodyPublishers.ofString(json))
                    .build();
            HttpResponse<String> res = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
            checkStatus(res, "INSERT " + table);
            JsonNode arr = objectMapper.readTree(res.body());
            return (arr.isArray() && arr.size() > 0) ? arr.get(0) : arr;
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Supabase INSERT failed [" + table + "]: " + e.getMessage(), e);
        }
    }

    /**
     * POST /rest/v1/{table} for bulk insert.
     */
    public JsonNode insertMany(String table, Object bodyArray) {
        try {
            String url = supabaseUrl + "/rest/v1/" + table;
            String json = objectMapper.writeValueAsString(bodyArray);
            HttpRequest req = buildRequest(url)
                    .header("Prefer", "return=representation")
                    .POST(HttpRequest.BodyPublishers.ofString(json))
                    .build();
            HttpResponse<String> res = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
            checkStatus(res, "INSERT_MANY " + table);
            return objectMapper.readTree(res.body());
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Supabase INSERT_MANY failed [" + table + "]: " + e.getMessage(), e);
        }
    }

    /**
     * PATCH /rest/v1/{table}?{filter} with body
     */
    public JsonNode update(String table, String filter, Object body) {
        try {
            String url = supabaseUrl + "/rest/v1/" + table + "?" + filter;
            String json = objectMapper.writeValueAsString(body);
            HttpRequest req = buildRequest(url)
                    .header("Prefer", "return=representation")
                    .method("PATCH", HttpRequest.BodyPublishers.ofString(json))
                    .build();
            HttpResponse<String> res = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
            checkStatus(res, "UPDATE " + table);
            JsonNode arr = objectMapper.readTree(res.body());
            return (arr.isArray() && arr.size() > 0) ? arr.get(0) : arr;
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Supabase UPDATE failed [" + table + "]: " + e.getMessage(), e);
        }
    }

    /**
     * DELETE /rest/v1/{table}?{filter}
     */
    public void delete(String table, String filter) {
        try {
            String url = supabaseUrl + "/rest/v1/" + table + "?" + filter;
            HttpRequest req = buildRequest(url)
                    .DELETE()
                    .build();
            HttpResponse<String> res = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
            if (res.statusCode() >= 400) {
                throw new RuntimeException("Supabase DELETE [" + table + "] status " + res.statusCode() + ": " + res.body());
            }
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Supabase DELETE failed [" + table + "]: " + e.getMessage(), e);
        }
    }

    /**
     * Upsert - POST with Prefer: resolution=merge-duplicates
     */
    public JsonNode upsert(String table, Object body) {
        try {
            String url = supabaseUrl + "/rest/v1/" + table;
            String json = objectMapper.writeValueAsString(body);
            HttpRequest req = buildRequest(url)
                    .header("Prefer", "resolution=merge-duplicates,return=representation")
                    .POST(HttpRequest.BodyPublishers.ofString(json))
                    .build();
            HttpResponse<String> res = httpClient.send(req, HttpResponse.BodyHandlers.ofString());
            checkStatus(res, "UPSERT " + table);
            JsonNode arr = objectMapper.readTree(res.body());
            return (arr.isArray() && arr.size() > 0) ? arr.get(0) : arr;
        } catch (RuntimeException e) {
            throw e;
        } catch (Exception e) {
            throw new RuntimeException("Supabase UPSERT failed [" + table + "]: " + e.getMessage(), e);
        }
    }

    // =========================================================
    //  Helper Methods
    // =========================================================

    public String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    public ObjectMapper getObjectMapper() {
        return objectMapper;
    }

    private HttpRequest.Builder buildRequest(String url) {
        return HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("apikey", serviceKey)
                .header("Authorization", "Bearer " + serviceKey)
                .header("Content-Type", "application/json")
                .timeout(Duration.ofSeconds(20));
    }

    private void checkStatus(HttpResponse<String> res, String op) {
        if (res.statusCode() >= 400) {
            throw new RuntimeException("Supabase " + op + " error (status " + res.statusCode() + "): " + res.body());
        }
    }
}
