
package com.smartinventory.service;

import com.smartinventory.common.BadRequestException;
import com.smartinventory.common.PageResponse;
import com.smartinventory.common.QueryUtils;
import com.smartinventory.common.ResourceNotFoundException;
import com.smartinventory.dto.OrderCreateRequest;
import com.smartinventory.dto.OrderItemRequest;
import com.smartinventory.dto.OrderResponse;
import com.smartinventory.dto.OrderSummaryResponse;
import com.smartinventory.entity.Customer;
import com.smartinventory.entity.MovementType;
import com.smartinventory.entity.OrderItem;
import com.smartinventory.entity.OrderStatus;
import com.smartinventory.entity.Product;
import com.smartinventory.entity.Role;
import com.smartinventory.entity.SalesOrder;
import com.smartinventory.repository.CustomerRepository;
import com.smartinventory.repository.ProductRepository;
import com.smartinventory.repository.SalesOrderRepository;
import com.smartinventory.security.SecurityUtils;
import jakarta.persistence.criteria.Predicate;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Order processing. Stock is checked when an order is created, deducted when it is confirmed,
 * and returned if a confirmed order is cancelled. Any user can capture an order; only a manager
 * or admin can confirm one.
 */
@Service
public class OrderService {

    private final SalesOrderRepository orderRepository;
    private final CustomerRepository customerRepository;
    private final ProductRepository productRepository;
    private final StockService stockService;
    private final BigDecimal taxRate;

    public OrderService(SalesOrderRepository orderRepository, CustomerRepository customerRepository,
                        ProductRepository productRepository, StockService stockService,
                        @Value("${app.tax-rate}") BigDecimal taxRate) {
        this.orderRepository = orderRepository;
        this.customerRepository = customerRepository;
        this.productRepository = productRepository;
        this.stockService = stockService;
        this.taxRate = taxRate;
    }

    @Transactional(readOnly = true)
    public PageResponse<OrderSummaryResponse> search(OrderStatus status, Long customerId, String q, Pageable pageable) {
        Specification<SalesOrder> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (status != null) {
                predicates.add(cb.equal(root.get("status"), status));
            }
            if (customerId != null) {
                predicates.add(cb.equal(root.get("customer").get("id"), customerId));
            }
            if (StringUtils.hasText(q)) {
                String like = QueryUtils.likePattern(q);
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("orderNumber")), like),
                        cb.like(cb.lower(root.get("customer").get("name")), like)));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        return PageResponse.from(orderRepository.findAll(spec, pageable), OrderSummaryResponse::from);
    }

    @Transactional(readOnly = true)
    public OrderResponse get(Long id) {
        return OrderResponse.from(findDetailed(id));
    }

    @Transactional
    public OrderResponse create(OrderCreateRequest request) {
        Customer customer = customerRepository.findById(request.customerId())
                .orElseThrow(() -> new BadRequestException("Customer " + request.customerId() + " does not exist"));

        // The same product added twice becomes one line.
        Map<Long, Integer> quantities = new LinkedHashMap<>();
        for (OrderItemRequest item : request.items()) {
            quantities.merge(item.productId(), item.quantity(), Integer::sum);
        }

        SalesOrder order = new SalesOrder(customer, QueryUtils.trimToNull(request.notes()),
                SecurityUtils.currentUsername());
        for (Map.Entry<Long, Integer> entry : quantities.entrySet()) {
            Product product = productRepository.findById(entry.getKey())
                    .orElseThrow(() -> new BadRequestException("Product " + entry.getKey() + " does not exist"));
            if (!product.isActive()) {
                throw new BadRequestException(product.getName() + " is archived and can't be sold");
            }
            if (product.getQuantity() < entry.getValue()) {
                throw new BadRequestException("Only %d x %s in stock (requested %d)"
                        .formatted(product.getQuantity(), product.getName(), entry.getValue()));
            }
            order.addItem(new OrderItem(product, entry.getValue(), product.getSellingPrice()));
        }
        applyTotals(order, taxRate);

        order = orderRepository.save(order);
        order.setOrderNumber(formatOrderNumber(order.getId()));
        return OrderResponse.from(order);
    }

    @Transactional
    public OrderResponse updateStatus(Long id, OrderStatus newStatus) {
        SalesOrder order = findDetailed(id);
        OrderStatus current = order.getStatus();

        if (current == newStatus) {
            throw new BadRequestException("Order is already " + current);
        }
        if (!current.canTransitionTo(newStatus)) {
            throw new BadRequestException("An order can't go from " + current + " to " + newStatus);
        }

        // Separation of duties: staff capture orders, but only a manager or admin may confirm one,
        // because confirming is the step that commits stock.
        if (newStatus == OrderStatus.CONFIRMED && !SecurityUtils.hasAnyRole(Role.ADMIN, Role.MANAGER)) {
            throw new AccessDeniedException("Only managers and admins can confirm orders");
        }

        String number = order.getOrderNumber();
        if (newStatus == OrderStatus.CONFIRMED) {
            List<String> shortages = new ArrayList<>();
            for (OrderItem item : order.getItems()) {
                Product p = item.getProduct();
                if (p.getQuantity() < item.getQuantity()) {
                    shortages.add("%s (need %d, have %d)".formatted(p.getName(), item.getQuantity(), p.getQuantity()));
                }
            }
            if (!shortages.isEmpty()) {
                throw new BadRequestException("Not enough stock to confirm: " + String.join(", ", shortages));
            }
            for (OrderItem item : order.getItems()) {
                stockService.applyMovement(item.getProduct(), MovementType.OUT, -item.getQuantity(),
                        "Sold on order " + number, number);
            }
        }

        if (newStatus == OrderStatus.CANCELLED && current.holdsStock()) {
            for (OrderItem item : order.getItems()) {
                stockService.applyMovement(item.getProduct(), MovementType.IN, item.getQuantity(),
                        "Order " + number + " cancelled, stock returned", number);
            }
        }

        order.setStatus(newStatus);
        return OrderResponse.from(order);
    }

    @Transactional
    public void delete(Long id) {
        SalesOrder order = findDetailed(id);
        if (order.getStatus() != OrderStatus.PENDING && order.getStatus() != OrderStatus.CANCELLED) {
            throw new BadRequestException("Only pending or cancelled orders can be deleted");
        }
        orderRepository.delete(order);
    }

    /** Subtotal (excl. VAT), VAT and total, rounded to cents. */
    public static void applyTotals(SalesOrder order, BigDecimal taxRate) {
        BigDecimal subtotal = order.getItems().stream()
                .map(OrderItem::getLineTotal)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);
        BigDecimal tax = subtotal.multiply(taxRate).setScale(2, RoundingMode.HALF_UP);
        order.setSubtotal(subtotal);
        order.setTaxAmount(tax);
        order.setTotal(subtotal.add(tax));
    }

    public static String formatOrderNumber(Long id) {
        return "SO-%06d".formatted(id);
    }

    private SalesOrder findDetailed(Long id) {
        return orderRepository.findDetailedById(id).orElseThrow(() -> ResourceNotFoundException.of("Order", id));
    }
}