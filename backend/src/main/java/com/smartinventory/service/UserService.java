package com.smartinventory.service;

import com.smartinventory.common.BadRequestException;
import com.smartinventory.common.ConflictException;
import com.smartinventory.common.PasswordRules;
import com.smartinventory.common.ResourceNotFoundException;
import com.smartinventory.dto.UserCreateRequest;
import com.smartinventory.dto.UserResponse;
import com.smartinventory.dto.UserUpdateRequest;
import com.smartinventory.entity.User;
import com.smartinventory.repository.UserRepository;
import com.smartinventory.security.SecurityUtils;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final DemoService demoService;

    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder, DemoService demoService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.demoService = demoService;
    }

    @Transactional(readOnly = true)
    public List<UserResponse> list() {
        return userRepository.findAll(Sort.by("fullName")).stream().map(UserResponse::from).toList();
    }

    @Transactional
    public UserResponse create(UserCreateRequest request) {
        String email = normaliseEmail(request.email());
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new ConflictException("A user with email " + email + " already exists");
        }
        User user = new User(request.fullName().trim(), email,
                passwordEncoder.encode(request.password()), request.role());
        return UserResponse.from(userRepository.save(user));
    }

    @Transactional
    public UserResponse update(Long id, UserUpdateRequest request) {
        User user = find(id);
        if (demoService.isProtectedAccount(user.getEmail())) {
            throw new BadRequestException(DemoService.PROTECTED_MESSAGE);
        }
        String email = normaliseEmail(request.email());
        if (userRepository.existsByEmailIgnoreCaseAndIdNot(email, id)) {
            throw new ConflictException("A user with email " + email + " already exists");
        }

        boolean isSelf = user.getEmail().equalsIgnoreCase(SecurityUtils.currentUsername());
        if (isSelf && (!request.active() || request.role() != user.getRole())) {
            throw new BadRequestException("You can't deactivate your own account or change your own role");
        }

        user.setFullName(request.fullName().trim());
        user.setEmail(email);
        user.setRole(request.role());
        user.setActive(request.active());
        if (StringUtils.hasText(request.password())) {
            // Safety net: the DTO already checks this, but the service never trusts its callers.
            if (!PasswordRules.isStrong(request.password())) {
                throw new BadRequestException("Password " + PasswordRules.MESSAGE);
            }
            user.setPassword(passwordEncoder.encode(request.password()));
        }
        return UserResponse.from(user);
    }

    @Transactional
    public void delete(Long id) {
        User user = find(id);
        if (demoService.isProtectedAccount(user.getEmail())) {
            throw new BadRequestException(DemoService.PROTECTED_MESSAGE);
        }
        if (user.getEmail().equalsIgnoreCase(SecurityUtils.currentUsername())) {
            throw new BadRequestException("You can't delete your own account");
        }
        userRepository.delete(user);
    }

    private User find(Long id) {
        return userRepository.findById(id).orElseThrow(() -> ResourceNotFoundException.of("User", id));
    }

    private static String normaliseEmail(String email) {
        return email.trim().toLowerCase();
    }
}