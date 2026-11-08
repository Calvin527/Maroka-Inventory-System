package com.smartinventory.common;

/** A request that breaks a business rule (e.g. not enough stock, invalid status change). */
public class BadRequestException extends RuntimeException {

    public BadRequestException(String message) {
        super(message);
    }
}
