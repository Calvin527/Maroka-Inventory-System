package com.smartinventory.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/**
 * Immutable audit record of every change to a product's quantity.
 */
@Entity
@Table(name = "stock_movements")
public class StockMovement extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private MovementType type;

    /** Signed change: positive for stock in, negative for stock out. */
    @Column(nullable = false)
    private int quantityChange;

    @Column(nullable = false)
    private int previousQuantity;

    @Column(nullable = false)
    private int newQuantity;

    @Column(length = 255)
    private String reason;

    @Column(length = 100)
    private String reference;

    @Column(length = 150)
    private String performedBy;

    protected StockMovement() {
    }

    public StockMovement(Product product, MovementType type, int quantityChange, int previousQuantity,
                         int newQuantity, String reason, String reference, String performedBy) {
        this.product = product;
        this.type = type;
        this.quantityChange = quantityChange;
        this.previousQuantity = previousQuantity;
        this.newQuantity = newQuantity;
        this.reason = reason;
        this.reference = reference;
        this.performedBy = performedBy;
    }

    public Product getProduct() { return product; }
    public MovementType getType() { return type; }
    public int getQuantityChange() { return quantityChange; }
    public int getPreviousQuantity() { return previousQuantity; }
    public int getNewQuantity() { return newQuantity; }
    public String getReason() { return reason; }
    public String getReference() { return reference; }
    public String getPerformedBy() { return performedBy; }
}
