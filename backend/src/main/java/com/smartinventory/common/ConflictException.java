package com.smartinventory.common;

/** The request clashes with existing data (duplicate SKU, deleting something still in use, ...). */
public class ConflictException extends RuntimeException {

    public ConflictException(String message) {
        super(message);
    }
}
