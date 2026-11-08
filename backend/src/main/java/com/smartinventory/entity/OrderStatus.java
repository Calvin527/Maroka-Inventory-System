package com.smartinventory.entity;

import java.util.EnumSet;
import java.util.Set;

/**
 * Order lifecycle:
 * PENDING -> CONFIRMED -> SHIPPED -> DELIVERED
 * PENDING or CONFIRMED -> CANCELLED
 *
 * Stock is deducted when an order is CONFIRMED and returned if a confirmed order is cancelled.
 */
public enum OrderStatus {
    PENDING,
    CONFIRMED,
    SHIPPED,
    DELIVERED,
    CANCELLED;

    /** Statuses that count as a completed sale for revenue reporting. */
    public static final Set<OrderStatus> REVENUE_STATUSES = EnumSet.of(CONFIRMED, SHIPPED, DELIVERED);

    public boolean canTransitionTo(OrderStatus next) {
        return switch (this) {
            case PENDING -> next == CONFIRMED || next == CANCELLED;
            case CONFIRMED -> next == SHIPPED || next == CANCELLED;
            case SHIPPED -> next == DELIVERED;
            case DELIVERED, CANCELLED -> false;
        };
    }

    /** True when stock has already been deducted for an order in this status. */
    public boolean holdsStock() {
        return REVENUE_STATUSES.contains(this);
    }
}
