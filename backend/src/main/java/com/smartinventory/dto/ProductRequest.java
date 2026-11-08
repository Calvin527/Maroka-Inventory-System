package com.smartinventory.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

/**
 * Create/update a product. {@code openingQuantity} is only used when creating;
 * after that, quantity changes go through stock movements so there is always an audit trail.
 */
public record ProductRequest(
        @NotBlank @Size(max = 50) String sku,
        @NotBlank @Size(max = 150) String name,
        @Size(max = 1000) String description,
        Long categoryId,
        Long supplierId,
        @NotNull @DecimalMin("0.00") @Digits(integer = 10, fraction = 2) BigDecimal costPrice,
        @NotNull @DecimalMin("0.00") @Digits(integer = 10, fraction = 2) BigDecimal sellingPrice,
        @Min(0) Integer openingQuantity,
        @NotNull @Min(0) Integer reorderLevel,
        @Size(max = 20) String unit,
        Boolean active
) {
}
