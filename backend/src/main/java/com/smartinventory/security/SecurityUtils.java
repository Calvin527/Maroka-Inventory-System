package com.smartinventory.security;

import com.smartinventory.entity.Role;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Arrays;

public final class SecurityUtils {

    private SecurityUtils() {
    }

    /** Email of the logged-in user, or "system" for background work (seeding, tests). */
    public static String currentUsername() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth.getName() == null) {
            return "system";
        }
        return auth.getName();
    }

    /**
     * True if the logged-in user has at least one of the given roles.
     * Spring Security stores roles as authorities named "ROLE_ADMIN", "ROLE_MANAGER", etc.
     */
    public static boolean hasAnyRole(Role... roles) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return false;
        }
        return auth.getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .anyMatch(authority -> Arrays.stream(roles)
                        .anyMatch(role -> authority.equals("ROLE_" + role.name())));
    }
}