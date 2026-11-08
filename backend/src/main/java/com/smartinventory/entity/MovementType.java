package com.smartinventory.entity;

/**
 * IN         - stock received (e.g. supplier delivery, returned order).
 * OUT        - stock removed (e.g. confirmed order, damage, theft).
 * ADJUSTMENT - stock take: sets quantity to the counted amount.
 */
public enum MovementType {
    IN,
    OUT,
    ADJUSTMENT
}
