package com.smartinventory.dto;

import com.smartinventory.entity.Customer;

import java.time.Instant;

public record CustomerResponse(
        Long id,
        String name,
        String email,
        String phone,
        String address,
        long orderCount,
        String createdBy,
        Instant createdAt
) {
    public static CustomerResponse from(Customer c, long orderCount) {
        return new CustomerResponse(c.getId(), c.getName(), c.getEmail(), c.getPhone(),
                c.getAddress(), orderCount, c.getCreatedBy(), c.getCreatedAt());
    }
}