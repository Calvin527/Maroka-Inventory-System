package com.smartinventory.dto;

import com.smartinventory.entity.Role;

import java.util.List;

/** What the login page needs to know about demo mode. In the real system: enabled=false, no accounts. */
public record DemoInfoResponse(
        boolean enabled,
        String resetTime,
        List<Account> accounts
) {
    public record Account(Role role, String fullName, String email, String password) {
    }
}