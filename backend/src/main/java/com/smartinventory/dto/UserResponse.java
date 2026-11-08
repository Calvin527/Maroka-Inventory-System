package com.smartinventory.dto;

import com.smartinventory.entity.Role;
import com.smartinventory.entity.User;

import java.time.Instant;

public record UserResponse(
        Long id,
        String fullName,
        String email,
        Role role,
        boolean active,
        Instant createdAt
) {
    public static UserResponse from(User u) {
        return new UserResponse(u.getId(), u.getFullName(), u.getEmail(), u.getRole(), u.isActive(), u.getCreatedAt());
    }
}
