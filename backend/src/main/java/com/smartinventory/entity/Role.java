package com.smartinventory.entity;

/**
 * ADMIN   - everything, including user management.
 * MANAGER - manages catalogue, suppliers, orders and reports.
 * STAFF   - views data, captures orders, customers and stock movements.
 */
public enum Role {
    ADMIN,
    MANAGER,
    STAFF
}
