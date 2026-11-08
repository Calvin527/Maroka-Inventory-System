package com.smartinventory.dto;

import java.math.BigDecimal;

public record TopProductResponse(
        Long productId,
        String productName,
        long quantitySold,
        BigDecimal revenue
) {
    /** Maps a row of [productId, productName, sum(quantity), sum(lineTotal)]. */
    public static TopProductResponse fromRow(Object[] row) {
        return new TopProductResponse(
                ((Number) row[0]).longValue(),
                (String) row[1],
                row[2] == null ? 0 : ((Number) row[2]).longValue(),
                row[3] == null ? BigDecimal.ZERO : new BigDecimal(row[3].toString()));
    }
}
