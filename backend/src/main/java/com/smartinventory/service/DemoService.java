
package com.smartinventory.service;

import com.smartinventory.entity.Role;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Locale;

/**
 * Everything the rest of the app needs to know about demo mode.
 *
 * Demo mode is only for the public portfolio demo. It must run against its own database and with
 * its own JWT secret, so demo accounts never exist in, and can never reach, the real system.
 */
@Service
public class DemoService {

    /** One demo login. Shown on the demo login page; never created when demo mode is off. */
    public record DemoAccount(Role role, String fullName, String email, String password, boolean listedOnLogin) {
    }

    /** All demo users. The extra staff members exist so the manager's staff view has data to compare. */
    public static final List<DemoAccount> ACCOUNTS = List.of(
            new DemoAccount(Role.ADMIN, "Ayanda Admin", "admin@demo.example", "Admin@123", true),
            new DemoAccount(Role.MANAGER, "Lerato Manager", "manager@demo.example", "Manager@123", true),
            new DemoAccount(Role.STAFF, "Sipho Staff", "staff@demo.example", "Staff@123", true),
            new DemoAccount(Role.STAFF, "Thandi Mokoena", "thandi@demo.example", "Staff@123", false),
            new DemoAccount(Role.STAFF, "Pieter van Wyk", "pieter@demo.example", "Staff@123", false));

    /** Shown when a visitor tries to change a demo account. */
    public static final String PROTECTED_MESSAGE =
            "Demo accounts can't be changed, so every visitor gets the same experience. "
                    + "Create a new user to try this out; all demo data resets every night.";

    private final boolean enabled;
    private final String resetCron;

    public DemoService(@Value("${app.demo.enabled:false}") boolean enabled,
                       @Value("${app.demo.reset-cron:0 0 3 * * *}") String resetCron) {
        this.enabled = enabled;
        this.resetCron = resetCron;
    }

    public boolean isEnabled() {
        return enabled;
    }

    /** The accounts to show on the login page, or none when demo mode is off. */
    public List<DemoAccount> loginAccounts() {
        return enabled ? ACCOUNTS.stream().filter(DemoAccount::listedOnLogin).toList() : List.of();
    }

    /**
     * Demo accounts can't be edited, deleted or have their password changed, so one visitor
     * can't lock the next one out. Always false when demo mode is off.
     */
    public boolean isProtectedAccount(String email) {
        if (!enabled || email == null) {
            return false;
        }
        String normalised = email.trim().toLowerCase(Locale.ROOT);
        return ACCOUNTS.stream().anyMatch(a -> a.email().equals(normalised));
    }

    /** "03:00" style description of the nightly reset, for the login page. */
    public String resetTime() {
        String[] parts = resetCron.trim().split("\\s+");
        if (parts.length >= 3 && parts[1].matches("\\d+") && parts[2].matches("\\d+")) {
            return "%02d:%02d".formatted(Integer.parseInt(parts[2]), Integer.parseInt(parts[1]));
        }
        return "every night";
    }
}