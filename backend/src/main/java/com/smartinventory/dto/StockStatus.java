package com.smartinventory.dto;

/** Filter for the product list. */
public enum StockStatus {
    /** Above the reorder level. */
    IN_STOCK,
    /** At or below the reorder level but not empty. */
    LOW,
    /** Everything that needs ordering: LOW plus OUT. */
    REORDER,
    /** Zero on hand. */
    OUT
}
