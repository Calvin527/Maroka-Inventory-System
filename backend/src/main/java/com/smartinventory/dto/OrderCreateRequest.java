package com.smartinventory.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public record OrderCreateRequest(
        @NotNull Long customerId,
        @NotEmpty(message = "add at least one product") List<@Valid OrderItemRequest> items,
        @Size(max = 500) String notes
) {
}
