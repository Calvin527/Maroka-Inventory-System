package com.smartinventory.config;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import org.springframework.context.annotation.Configuration;

/**
 * Swagger UI at /swagger-ui.html. Log in via POST /api/auth/login, then click "Authorize" and paste the token.
 */
@Configuration
@OpenAPIDefinition(
        info = @Info(
                title = "Smart Inventory API",
                version = "1.0",
                description = "Inventory, stock, customers, suppliers, orders, dashboard and reporting."),
        security = @SecurityRequirement(name = "bearerAuth"))
@SecurityScheme(name = "bearerAuth", type = SecuritySchemeType.HTTP, scheme = "bearer", bearerFormat = "JWT")
public class OpenApiConfig {
}
