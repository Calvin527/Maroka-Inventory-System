package com.smartinventory.repository;

import com.smartinventory.entity.OrderStatus;
import com.smartinventory.entity.SalesOrder;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface SalesOrderRepository extends JpaRepository<SalesOrder, Long>, JpaSpecificationExecutor<SalesOrder> {

    @Override
    @EntityGraph(attributePaths = {"customer"})
    Page<SalesOrder> findAll(Specification<SalesOrder> spec, Pageable pageable);

    @Query("""
            select distinct o from SalesOrder o
            join fetch o.customer
            left join fetch o.items i
            left join fetch i.product
            where o.id = :id
            """)
    Optional<SalesOrder> findDetailedById(@Param("id") Long id);

    long countByStatus(OrderStatus status);

    boolean existsByCustomerId(Long customerId);

    @EntityGraph(attributePaths = {"customer"})
    List<SalesOrder> findTop5ByOrderByCreatedAtDesc();

    @Query("""
            select o from SalesOrder o
            join fetch o.customer
            where o.status in :statuses and o.createdAt >= :from and o.createdAt < :to
            order by o.createdAt asc
            """)
    List<SalesOrder> findByStatusesInPeriod(@Param("statuses") Collection<OrderStatus> statuses,
                                            @Param("from") Instant from,
                                            @Param("to") Instant to);

    @Query("""
            select o from SalesOrder o
            join fetch o.customer
            where o.createdAt >= :from and o.createdAt < :to
            order by o.createdAt asc
            """)
    List<SalesOrder> findAllInPeriod(@Param("from") Instant from, @Param("to") Instant to);

    @Query("select o.status, count(o) from SalesOrder o group by o.status")
    List<Object[]> countGroupedByStatus();

    @Query("select o.customer.id, count(o) from SalesOrder o group by o.customer.id")
    List<Object[]> countGroupedByCustomer();
}
