package com.smartinventory.dto;

import com.smartinventory.entity.Product;

import java.math.BigDecimal;
import java.time.Instant;

public record ProductResponse(
        Long id,
        String sku,
        String name,
        String description,
        Long categoryId,
        String categoryName,
        Long supplierId,
        String supplierName,
        BigDecimal costPrice,
        BigDecimal sellingPrice,
        int quantity,
        int reorderLevel,
        String unit,
        boolean active,
        boolean lowStock,
        boolean outOfStock,
        BigDecimal stockValue,
        Instant createdAt,
        Instant updatedAt
) {
    public static ProductResponse from(Product p) {
        return new ProductResponse(
                p.getId(), p.getSku(), p.getName(), p.getDescription(),
                p.getCategory() != null ? p.getCategory().getId() : null,
                p.getCategory() != null ? p.getCategory().getName() : null,
                p.getSupplier() != null ? p.getSupplier().getId() : null,
                p.getSupplier() != null ? p.getSupplier().getName() : null,
                p.getCostPrice(), p.getSellingPrice(), p.getQuantity(), p.getReorderLevel(), p.getUnit(),
                p.isActive(), p.isLowStock(), p.isOutOfStock(), p.getStockValue(),
                p.getCreatedAt(), p.getUpdatedAt());
    }
}
