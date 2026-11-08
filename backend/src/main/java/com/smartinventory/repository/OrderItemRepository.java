package com.smartinventory.repository;

import com.smartinventory.entity.OrderItem;
import com.smartinventory.entity.OrderStatus;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Collection;
import java.util.List;

public interface OrderItemRepository extends JpaRepository<OrderItem, Long> {

    boolean existsByProductId(Long productId);

    /** Rows of [productId, productName, quantitySold, revenue], best sellers first. */
    @Query("""
            select i.product.id, i.product.name, sum(i.quantity), sum(i.lineTotal)
            from OrderItem i
            where i.order.status in :statuses
            group by i.product.id, i.product.name
            order by sum(i.quantity) desc
            """)
    List<Object[]> findTopSelling(@Param("statuses") Collection<OrderStatus> statuses, Pageable pageable);

    @Query("""
            select i.product.id, i.product.name, sum(i.quantity), sum(i.lineTotal)
            from OrderItem i
            where i.order.status in :statuses
              and i.order.createdAt >= :from and i.order.createdAt < :to
            group by i.product.id, i.product.name
            order by sum(i.quantity) desc
            """)
    List<Object[]> findTopSellingInPeriod(@Param("statuses") Collection<OrderStatus> statuses,
                                          @Param("from") Instant from,
                                          @Param("to") Instant to,
                                          Pageable pageable);
}
