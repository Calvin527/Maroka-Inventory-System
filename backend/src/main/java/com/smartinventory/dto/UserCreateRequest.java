package com.smartinventory.dto;

import com.smartinventory.common.PasswordRules;
import com.smartinventory.entity.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record UserCreateRequest(
        @NotBlank @Size(max = 100) String fullName,
        @NotBlank @Email @Size(max = 150) String email,
        @NotBlank @Pattern(regexp = PasswordRules.REGEX, message = PasswordRules.MESSAGE) String password,
        @NotNull Role role
) {
}