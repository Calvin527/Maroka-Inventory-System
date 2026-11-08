package com.smartinventory.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Customer details captured by staff. All contact details are required so the business
 * can always reach the customer about an order or a delivery.
 */
public record CustomerRequest(
        @NotBlank(message = "is required")
        @Size(min = 2, max = 120, message = "must be between 2 and 120 characters")
        String name,

        @NotBlank(message = "is required")
        @Email(message = "must be a valid email address")
        @Size(max = 150) String email,

        // A South African number: 0 or +27 followed by 9 digits. Spaces, dashes and brackets are allowed.
        @NotBlank(message = "is required")
        @Pattern(regexp = "^[\\s(]*(\\+27|0)[\\s\\-()]*(\\d[\\s\\-()]*){9}$",
                message = "must be a South African number, e.g. 072 555 0110 or +27 72 555 0110")
        String phone,

        @NotBlank(message = "is required")
        @Size(min = 5, max = 255, message = "must be between 5 and 255 characters")
        String address
) {
}