package com.smartinventory.repository;

import com.smartinventory.entity.Product;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

import java.math.BigDecimal;
import java.util.List;

public interface ProductRepository extends JpaRepository<Product, Long>, JpaSpecificationExecutor<Product> {

    /** Load category and supplier in the same query to avoid N+1 selects on the product list. */
    @Override
    @EntityGraph(attributePaths = {"category", "supplier"})
    Page<Product> findAll(Specification<Product> spec, Pageable pageable);

    boolean existsBySkuIgnoreCase(String sku);

    boolean existsBySkuIgnoreCaseAndIdNot(String sku, Long id);

    long countByCategoryId(Long categoryId);

    long countBySupplierId(Long supplierId);

    long countByActiveTrue();

    long countByActiveTrueAndQuantityLessThanEqual(int quantity);

    @Query("""
            select p from Product p
            left join fetch p.category
            left join fetch p.supplier
            where p.active = true and p.quantity <= p.reorderLevel
            order by p.quantity asc, p.name asc
            """)
    List<Product> findLowStock();

    @Query("select count(p) from Product p where p.active = true and p.quantity <= p.reorderLevel")
    long countLowStock();

    /** Stock value at cost. Returns null when there are no products. */
    @Query("select sum(p.costPrice * p.quantity) from Product p where p.active = true")
    BigDecimal totalStockValue();

    @Query("select p.category.id, count(p) from Product p where p.category is not null group by p.category.id")
    List<Object[]> countGroupedByCategory();

    @Query("select p.supplier.id, count(p) from Product p where p.supplier is not null group by p.supplier.id")
    List<Object[]> countGroupedBySupplier();

    @Query("""
            select p from Product p
            left join fetch p.category
            left join fetch p.supplier
            order by p.name asc
            """)
    List<Product> findAllForReport();
}
