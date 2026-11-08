package com.smartinventory;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * End-to-end tests against an in-memory H2 database filled by the demo seeder.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class ApiIntegrationTest {

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper objectMapper;

    @Test
    void wrongPasswordIsRejected() throws Exception {
        mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"admin@demo.example\",\"password\":\"nope\"}"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void apiRequiresAToken() throws Exception {
        mvc.perform(get("/api/products")).andExpect(status().isUnauthorized());
    }

    @Test
    void adminSeesTheDashboard() throws Exception {
        String token = login("admin@demo.example", "Admin@123");
        mvc.perform(get("/api/dashboard").header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalProducts").value(24))
                .andExpect(jsonPath("$.monthlySales.length()").value(6));
    }

    @Test
    void staffCannotManageTheCatalogue() throws Exception {
        String token = login("staff@demo.example", "Staff@123");
        mvc.perform(post("/api/categories")
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"name\":\"Garden\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    void confirmingAnOrderReducesStock() throws Exception {
        String token = login("manager@demo.example", "Manager@123");

        JsonNode hammer = getJson(token, "/api/products?q=TL-HAM-450").get("content").get(0);
        long productId = hammer.get("id").asLong();
        int before = hammer.get("quantity").asInt();
        long customerId = getJson(token, "/api/customers?q=Mokoena").get("content").get(0).get("id").asLong();

        String created = mvc.perform(post("/api/orders")
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"customerId": %d, "items": [{"productId": %d, "quantity": 2}]}
                                """.formatted(customerId, productId)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("PENDING"))
                .andReturn().getResponse().getContentAsString();
        long orderId = objectMapper.readTree(created).get("id").asLong();

        mvc.perform(patch("/api/orders/" + orderId + "/status")
                        .header(HttpHeaders.AUTHORIZATION, bearer(token))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"CONFIRMED\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CONFIRMED"));

        mvc.perform(get("/api/products/" + productId).header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(jsonPath("$.quantity").value(before - 2));
    }

    @Test
    void demoInfoIsPublicAndListsTheDemoAccounts() throws Exception {
        mvc.perform(get("/api/auth/demo"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.enabled").value(true))
                .andExpect(jsonPath("$.accounts.length()").value(3));
    }

    @Test
    void demoAccountsCannotBeDeletedEvenByTheAdmin() throws Exception {
        String token = login("admin@demo.example", "Admin@123");
        JsonNode users = getJson(token, "/api/users");
        long managerId = -1;
        for (JsonNode u : users) {
            if (u.get("email").asText().equals("manager@demo.example")) {
                managerId = u.get("id").asLong();
            }
        }
        mvc.perform(delete("/api/users/" + managerId).header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isBadRequest());
    }

    private String login(String email, String password) throws Exception {
        String body = mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"%s\",\"password\":\"%s\"}".formatted(email, password)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(body).get("token").asText();
    }

    private JsonNode getJson(String token, String url) throws Exception {
        String body = mvc.perform(get(url).header(HttpHeaders.AUTHORIZATION, bearer(token)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(body);
    }

    private static String bearer(String token) {
        return "Bearer " + token;
    }
}