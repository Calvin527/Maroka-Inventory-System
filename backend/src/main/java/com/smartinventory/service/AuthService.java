package com.smartinventory.service;

import com.smartinventory.common.BadRequestException;
import com.smartinventory.common.ResourceNotFoundException;
import com.smartinventory.dto.AuthResponse;
import com.smartinventory.dto.ChangePasswordRequest;
import com.smartinventory.dto.LoginRequest;
import com.smartinventory.dto.UserResponse;
import com.smartinventory.entity.User;
import com.smartinventory.repository.UserRepository;
import com.smartinventory.security.JwtService;
import com.smartinventory.security.SecurityUtils;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;
    private final DemoService demoService;

    public AuthService(AuthenticationManager authenticationManager, UserRepository userRepository,
                       JwtService jwtService, PasswordEncoder passwordEncoder, DemoService demoService) {
        this.authenticationManager = authenticationManager;
        this.userRepository = userRepository;
        this.jwtService = jwtService;
        this.passwordEncoder = passwordEncoder;
        this.demoService = demoService;
    }

    @Transactional(readOnly = true)
    public AuthResponse login(LoginRequest request) {
        String email = request.email().trim();
        // Throws BadCredentialsException / DisabledException, handled by GlobalExceptionHandler.
        authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(email, request.password()));

        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new BadCredentialsException("Invalid email or password"));
        return new AuthResponse(jwtService.generateToken(user), "Bearer",
                jwtService.getExpirationMs(), UserResponse.from(user));
    }

    @Transactional(readOnly = true)
    public UserResponse currentUser() {
        return UserResponse.from(loadCurrentUser());
    }

    @Transactional
    public void changePassword(ChangePasswordRequest request) {
        User user = loadCurrentUser();
        if (demoService.isProtectedAccount(user.getEmail())) {
            throw new BadRequestException(DemoService.PROTECTED_MESSAGE);
        }
        if (!passwordEncoder.matches(request.currentPassword(), user.getPassword())) {
            throw new BadRequestException("Current password is incorrect");
        }
        user.setPassword(passwordEncoder.encode(request.newPassword()));
    }

    private User loadCurrentUser() {
        String email = SecurityUtils.currentUsername();
        return userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ResourceNotFoundException("Current user not found"));
    }
}