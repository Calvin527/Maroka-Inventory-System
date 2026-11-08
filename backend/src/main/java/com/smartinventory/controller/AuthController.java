package com.smartinventory.controller;

import com.smartinventory.dto.AuthResponse;
import com.smartinventory.dto.ChangePasswordRequest;
import com.smartinventory.dto.DemoInfoResponse;
import com.smartinventory.dto.LoginRequest;
import com.smartinventory.dto.UserResponse;
import com.smartinventory.service.AuthService;
import com.smartinventory.service.DemoService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@Tag(name = "Authentication")
public class AuthController {

    private final AuthService authService;
    private final DemoService demoService;

    public AuthController(AuthService authService, DemoService demoService) {
        this.authService = authService;
        this.demoService = demoService;
    }

    @PostMapping("/login")
    public AuthResponse login(@Valid @RequestBody LoginRequest request) {
        return authService.login(request);
    }

    @GetMapping("/me")
    public UserResponse me() {
        return authService.currentUser();
    }

    @PostMapping("/change-password")
    public ResponseEntity<Void> changePassword(@Valid @RequestBody ChangePasswordRequest request) {
        authService.changePassword(request);
        return ResponseEntity.noContent().build();
    }

    /** Public (no login needed): the login page asks this whether to show demo accounts. */
    @GetMapping("/demo")
    @Operation(summary = "Demo mode info", description = "In the real system this always returns enabled=false and no accounts.")
    public DemoInfoResponse demo() {
        return new DemoInfoResponse(
                demoService.isEnabled(),
                demoService.isEnabled() ? demoService.resetTime() : null,
                demoService.loginAccounts().stream()
                        .map(a -> new DemoInfoResponse.Account(a.role(), a.fullName(), a.email(), a.password()))
                        .toList());
    }
}