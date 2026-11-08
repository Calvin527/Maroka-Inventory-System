package com.smartinventory.dto;

import com.smartinventory.entity.OrderItem;

import java.math.BigDecimal;

public record OrderItemResponse(
        Long id,
        Long productId,
        String productSku,
        String productName,
        int quantity,
        BigDecimal unitPrice,
        BigDecimal lineTotal
) {
    public static OrderItemResponse from(OrderItem i) {
        return new OrderItemResponse(i.getId(), i.getProduct().getId(), i.getProduct().getSku(),
                i.getProduct().getName(), i.getQuantity(), i.getUnitPrice(), i.getLineTotal());
    }
}
