package com.smartinventory.service;

import com.smartinventory.common.BadRequestException;
import com.smartinventory.common.ConflictException;
import com.smartinventory.common.PageResponse;
import com.smartinventory.common.QueryUtils;
import com.smartinventory.common.ResourceNotFoundException;
import com.smartinventory.dto.ProductRequest;
import com.smartinventory.dto.ProductResponse;
import com.smartinventory.dto.StockStatus;
import com.smartinventory.entity.MovementType;
import com.smartinventory.entity.Product;
import com.smartinventory.repository.CategoryRepository;
import com.smartinventory.repository.OrderItemRepository;
import com.smartinventory.repository.ProductRepository;
import com.smartinventory.repository.StockMovementRepository;
import com.smartinventory.repository.SupplierRepository;
import jakarta.persistence.criteria.Path;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.List;

@Service
public class ProductService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;
    private final SupplierRepository supplierRepository;
    private final OrderItemRepository orderItemRepository;
    private final StockMovementRepository movementRepository;
    private final StockService stockService;

    public ProductService(ProductRepository productRepository, CategoryRepository categoryRepository,
                          SupplierRepository supplierRepository, OrderItemRepository orderItemRepository,
                          StockMovementRepository movementRepository, StockService stockService) {
        this.productRepository = productRepository;
        this.categoryRepository = categoryRepository;
        this.supplierRepository = supplierRepository;
        this.orderItemRepository = orderItemRepository;
        this.movementRepository = movementRepository;
        this.stockService = stockService;
    }

    @Transactional(readOnly = true)
    public PageResponse<ProductResponse> search(String q, Long categoryId, Long supplierId,
                                                StockStatus stockStatus, Boolean active, Pageable pageable) {
        Specification<Product> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            if (StringUtils.hasText(q)) {
                String like = QueryUtils.likePattern(q);
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("name")), like),
                        cb.like(cb.lower(root.get("sku")), like)));
            }
            if (categoryId != null) {
                predicates.add(cb.equal(root.get("category").get("id"), categoryId));
            }
            if (supplierId != null) {
                predicates.add(cb.equal(root.get("supplier").get("id"), supplierId));
            }
            if (active != null) {
                predicates.add(cb.equal(root.get("active"), active));
            }
            if (stockStatus != null) {
                Path<Integer> quantity = root.get("quantity");
                Path<Integer> reorderLevel = root.get("reorderLevel");
                predicates.add(switch (stockStatus) {
                    case OUT -> cb.lessThanOrEqualTo(quantity, 0);
                    case LOW -> cb.and(cb.greaterThan(quantity, 0), cb.lessThanOrEqualTo(quantity, reorderLevel));
                    case REORDER -> cb.lessThanOrEqualTo(quantity, reorderLevel);
                    case IN_STOCK -> cb.greaterThan(quantity, reorderLevel);
                });
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };
        return PageResponse.from(productRepository.findAll(spec, pageable), ProductResponse::from);
    }

    @Transactional(readOnly = true)
    public ProductResponse get(Long id) {
        return ProductResponse.from(find(id));
    }

    /** Active products at or below their reorder level, emptiest first. */
    @Transactional(readOnly = true)
    public List<ProductResponse> lowStock() {
        return productRepository.findLowStock().stream().map(ProductResponse::from).toList();
    }

    @Transactional
    public ProductResponse create(ProductRequest request) {
        String sku = normaliseSku(request.sku());
        if (productRepository.existsBySkuIgnoreCase(sku)) {
            throw new ConflictException("SKU " + sku + " is already in use");
        }
        Product product = new Product(sku, request.name().trim(), request.costPrice(),
                request.sellingPrice(), request.reorderLevel());
        applyFields(product, request);
        product = productRepository.save(product);

        int opening = request.openingQuantity() == null ? 0 : request.openingQuantity();
        if (opening > 0) {
            stockService.applyMovement(product, MovementType.IN, opening, "Opening stock", null);
        }
        return ProductResponse.from(product);
    }

    @Transactional
    public ProductResponse update(Long id, ProductRequest request) {
        Product product = find(id);
        String sku = normaliseSku(request.sku());
        if (productRepository.existsBySkuIgnoreCaseAndIdNot(sku, id)) {
            throw new ConflictException("SKU " + sku + " is already in use");
        }
        product.setSku(sku);
        product.setName(request.name().trim());
        product.setCostPrice(request.costPrice());
        product.setSellingPrice(request.sellingPrice());
        product.setReorderLevel(request.reorderLevel());
        applyFields(product, request);
        return ProductResponse.from(product);
    }

    /**
     * Products that appear on orders are archived (hidden, kept for history); others are deleted outright.
     *
     * @return true if the product was archived rather than deleted
     */
    @Transactional
    public boolean delete(Long id) {
        Product product = find(id);
        if (orderItemRepository.existsByProductId(id)) {
            product.setActive(false);
            return true;
        }
        movementRepository.deleteByProductId(id);
        productRepository.delete(product);
        return false;
    }

    private void applyFields(Product product, ProductRequest request) {
        product.setDescription(QueryUtils.trimToNull(request.description()));
        product.setUnit(StringUtils.hasText(request.unit()) ? request.unit().trim() : "unit");
        if (request.active() != null) {
            product.setActive(request.active());
        }
        product.setCategory(request.categoryId() == null ? null
                : categoryRepository.findById(request.categoryId())
                .orElseThrow(() -> new BadRequestException("Category " + request.categoryId() + " does not exist")));
        product.setSupplier(request.supplierId() == null ? null
                : supplierRepository.findById(request.supplierId())
                .orElseThrow(() -> new BadRequestException("Supplier " + request.supplierId() + " does not exist")));
    }

    private Product find(Long id) {
        return productRepository.findById(id).orElseThrow(() -> ResourceNotFoundException.of("Product", id));
    }

    private static String normaliseSku(String sku) {
        return sku.trim().toUpperCase();
    }
}
