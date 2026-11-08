
package com.smartinventory.dto;

import com.smartinventory.common.PasswordRules;
import com.smartinventory.entity.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Leave password out (null) to keep the current one.
 * If a new password is given, it must meet the password policy.
 */
public record UserUpdateRequest(
        @NotBlank @Size(max = 100) String fullName,
        @NotBlank @Email @Size(max = 150) String email,
        @NotNull Role role,
        @NotNull Boolean active,
        @Pattern(regexp = PasswordRules.REGEX, message = PasswordRules.MESSAGE) String password
) {
}