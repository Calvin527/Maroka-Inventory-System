package com.smartinventory.common;

/**
 * The password policy, defined once and used everywhere a password is set.
 * At least 8 characters, with an uppercase letter, a lowercase letter and a number.
 */
public final class PasswordRules {

    private PasswordRules() {
    }

    /** Regular expression the password must match. */
    public static final String REGEX = "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d).{8,100}$";

    /** Message shown to the user when the password doesn't meet the policy. */
    public static final String MESSAGE =
            "must be at least 8 characters and include an uppercase letter, a lowercase letter and a number";

    public static boolean isStrong(String password) {
        return password != null && password.matches(REGEX);
    }
}