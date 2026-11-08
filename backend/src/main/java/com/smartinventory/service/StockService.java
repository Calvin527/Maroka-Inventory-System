package com.smartinventory.service;

import com.smartinventory.common.BadRequestException;
import com.smartinventory.common.PageResponse;
import com.smartinventory.common.QueryUtils;
import com.smartinventory.common.ResourceNotFoundException;
import com.smartinventory.dto.StockMovementRequest;
import com.smartinventory.dto.StockMovementResponse;
import com.smartinventory.entity.MovementType;
import com.smartinventory.entity.Product;
import com.smartinventory.entity.StockMovement;
import com.smartinventory.repository.ProductRepository;
import com.smartinventory.repository.StockMovementRepository;
import com.smartinventory.security.SecurityUtils;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

/**
 * The only place where product quantities change. Every change writes a StockMovement for the audit trail.
 */
@Service
public class StockService {

    private final StockMovementRepository movementRepository;
    private final ProductRepository productRepository;

    public StockService(StockMovementRepository movementRepository, ProductRepository productRepository) {
        this.movementRepository = movementRepository;
        this.productRepository = productRepository;
    }

    @Transactional(readOnly = true)
    public PageResponse<StockMovementResponse> history(Long productId, MovementType type, Pageable pageable) {
        Specification<StockMovement> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (productId != null) {
                predicates.add(cb.equal(root.get("product").get("id"), productId));
            }
            if (type != null) {
                predicates.add(cb.equal(root.get("type"), type));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        return PageResponse.from(movementRepository.findAll(spec, pageable), StockMovementResponse::from);
    }

    /** Manual stock movement captured by a user (delivery received, damaged goods, stock take, ...). */
    @Transactional
    public StockMovementResponse record(StockMovementRequest request) {
        Product product = productRepository.findById(request.productId())
                .orElseThrow(() -> ResourceNotFoundException.of("Product", request.productId()));
        if (!product.isActive()) {
            throw new BadRequestException(product.getName() + " is archived; reactivate it before moving stock");
        }

        int qty = request.quantity();
        int change = switch (request.type()) {
            case IN -> requirePositive(qty);
            case OUT -> -requirePositive(qty);
            case ADJUSTMENT -> qty - product.getQuantity();
        };
        if (request.type() == MovementType.ADJUSTMENT && change == 0) {
            throw new BadRequestException("Counted quantity matches current stock, nothing to adjust");
        }

        String reason = QueryUtils.trimToNull(request.reason());
        if (reason == null) {
            reason = switch (request.type()) {
                case IN -> "Stock received";
                case OUT -> "Stock removed";
                case ADJUSTMENT -> "Stock take adjustment";
            };
        }
        StockMovement movement = applyMovement(product, request.type(), change, reason,
                QueryUtils.trimToNull(request.reference()));
        return StockMovementResponse.from(movement);
    }

    /**
     * Applies a signed change to a managed product and records it.
     *
     * @throws BadRequestException if the change would make stock negative
     */
    public StockMovement applyMovement(Product product, MovementType type, int change, String reason, String reference) {
        int previous = product.getQuantity();
        int next = previous + change;
        if (next < 0) {
            throw new BadRequestException("Not enough stock for %s (%s): %d available, %d requested"
                    .formatted(product.getName(), product.getSku(), previous, -change));
        }
        product.setQuantity(next);
        StockMovement movement = new StockMovement(product, type, change, previous, next,
                reason, reference, SecurityUtils.currentUsername());
        return movementRepository.save(movement);
    }

    private static int requirePositive(int qty) {
        if (qty < 1) {
            throw new BadRequestException("Quantity must be at least 1");
        }
        return qty;
    }
}
