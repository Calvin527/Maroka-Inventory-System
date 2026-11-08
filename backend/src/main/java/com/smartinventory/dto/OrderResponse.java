package com.smartinventory.dto;

import com.smartinventory.entity.OrderStatus;
import com.smartinventory.entity.SalesOrder;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

/** Full order with line items (detail view). */
public record OrderResponse(
        Long id,
        String orderNumber,
        Long customerId,
        String customerName,
        String customerEmail,
        String customerPhone,
        OrderStatus status,
        List<OrderItemResponse> items,
        BigDecimal subtotal,
        BigDecimal taxAmount,
        BigDecimal total,
        String notes,
        String createdBy,
        Instant createdAt,
        Instant updatedAt
) {
    public static OrderResponse from(SalesOrder o) {
        return new OrderResponse(
                o.getId(), o.getOrderNumber(),
                o.getCustomer().getId(), o.getCustomer().getName(),
                o.getCustomer().getEmail(), o.getCustomer().getPhone(),
                o.getStatus(),
                o.getItems().stream().map(OrderItemResponse::from).toList(),
                o.getSubtotal(), o.getTaxAmount(), o.getTotal(),
                o.getNotes(), o.getCreatedBy(), o.getCreatedAt(), o.getUpdatedAt());
    }
}
