package com.smartinventory.dto;

import com.smartinventory.entity.MovementType;
import com.smartinventory.entity.StockMovement;

import java.time.Instant;

public record StockMovementResponse(
        Long id,
        Long productId,
        String productName,
        String productSku,
        MovementType type,
        int quantityChange,
        int previousQuantity,
        int newQuantity,
        String reason,
        String reference,
        String performedBy,
        Instant createdAt
) {
    public static StockMovementResponse from(StockMovement m) {
        return new StockMovementResponse(
                m.getId(), m.getProduct().getId(), m.getProduct().getName(), m.getProduct().getSku(),
                m.getType(), m.getQuantityChange(), m.getPreviousQuantity(), m.getNewQuantity(),
                m.getReason(), m.getReference(), m.getPerformedBy(), m.getCreatedAt());
    }
}
