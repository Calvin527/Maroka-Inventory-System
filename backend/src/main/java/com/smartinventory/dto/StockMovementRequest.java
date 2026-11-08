package com.smartinventory.dto;

import com.smartinventory.entity.MovementType;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * IN / OUT: {@code quantity} is how many units come in or go out (must be at least 1).
 * ADJUSTMENT: {@code quantity} is the counted amount on the shelf; the system works out the difference.
 */
public record StockMovementRequest(
        @NotNull Long productId,
        @NotNull MovementType type,
        @NotNull @Min(0) Integer quantity,
        @Size(max = 255) String reason,
        @Size(max = 100) String reference
) {
}
