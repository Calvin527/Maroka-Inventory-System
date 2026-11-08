package com.smartinventory.dto;

import com.smartinventory.entity.OrderStatus;
import com.smartinventory.entity.SalesOrder;

import java.math.BigDecimal;
import java.time.Instant;

/** Lightweight order row for lists and the dashboard. */
public record OrderSummaryResponse(
        Long id,
        String orderNumber,
        Long customerId,
        String customerName,
        OrderStatus status,
        BigDecimal total,
        Instant createdAt
) {
    public static OrderSummaryResponse from(SalesOrder o) {
        return new OrderSummaryResponse(o.getId(), o.getOrderNumber(), o.getCustomer().getId(),
                o.getCustomer().getName(), o.getStatus(), o.getTotal(), o.getCreatedAt());
    }
}
