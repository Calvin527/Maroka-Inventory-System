package com.smartinventory.dto;

import com.smartinventory.entity.Supplier;

import java.time.Instant;

public record SupplierResponse(
        Long id,
        String name,
        String contactPerson,
        String email,
        String phone,
        String address,
        long productCount,
        Instant createdAt
) {
    public static SupplierResponse from(Supplier s, long productCount) {
        return new SupplierResponse(s.getId(), s.getName(), s.getContactPerson(), s.getEmail(),
                s.getPhone(), s.getAddress(), productCount, s.getCreatedAt());
    }
}
