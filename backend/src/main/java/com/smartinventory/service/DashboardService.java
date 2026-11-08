package com.smartinventory.service;

import com.smartinventory.dto.DashboardResponse;
import com.smartinventory.dto.OrderSummaryResponse;
import com.smartinventory.dto.ProductResponse;
import com.smartinventory.dto.TopProductResponse;
import com.smartinventory.entity.OrderStatus;
import com.smartinventory.entity.SalesOrder;
import com.smartinventory.repository.CustomerRepository;
import com.smartinventory.repository.OrderItemRepository;
import com.smartinventory.repository.ProductRepository;
import com.smartinventory.repository.SalesOrderRepository;
import com.smartinventory.repository.SupplierRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.YearMonth;
import java.time.ZoneId;
import java.time.format.TextStyle;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class DashboardService {

    private static final int MONTHS_OF_HISTORY = 6;

    private final ProductRepository productRepository;
    private final CustomerRepository customerRepository;
    private final SupplierRepository supplierRepository;
    private final SalesOrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final ZoneId zone;

    public DashboardService(ProductRepository productRepository, CustomerRepository customerRepository,
                            SupplierRepository supplierRepository, SalesOrderRepository orderRepository,
                            OrderItemRepository orderItemRepository,
                            @Value("${app.timezone}") String timezone) {
        this.productRepository = productRepository;
        this.customerRepository = customerRepository;
        this.supplierRepository = supplierRepository;
        this.orderRepository = orderRepository;
        this.orderItemRepository = orderItemRepository;
        this.zone = ZoneId.of(timezone);
    }

    @Transactional(readOnly = true)
    public DashboardResponse summary() {
        YearMonth thisMonth = YearMonth.now(zone);
        YearMonth firstMonth = thisMonth.minusMonths(MONTHS_OF_HISTORY - 1);
        Instant from = firstMonth.atDay(1).atStartOfDay(zone).toInstant();
        Instant to = thisMonth.plusMonths(1).atDay(1).atStartOfDay(zone).toInstant();

        // Bucket sales by month (in the business's time zone, not UTC).
        Map<YearMonth, BigDecimal> revenueByMonth = new LinkedHashMap<>();
        Map<YearMonth, Long> ordersByMonth = new LinkedHashMap<>();
        for (int i = 0; i < MONTHS_OF_HISTORY; i++) {
            YearMonth ym = firstMonth.plusMonths(i);
            revenueByMonth.put(ym, BigDecimal.ZERO);
            ordersByMonth.put(ym, 0L);
        }
        List<SalesOrder> sales = orderRepository.findByStatusesInPeriod(OrderStatus.REVENUE_STATUSES, from, to);
        for (SalesOrder order : sales) {
            YearMonth ym = YearMonth.from(order.getCreatedAt().atZone(zone));
            revenueByMonth.merge(ym, order.getSubtotal(), BigDecimal::add);
            ordersByMonth.merge(ym, 1L, Long::sum);
        }
        List<DashboardResponse.MonthlySales> monthly = new ArrayList<>();
        revenueByMonth.forEach((ym, revenue) -> monthly.add(new DashboardResponse.MonthlySales(
                ym.toString(),
                ym.getMonth().getDisplayName(TextStyle.SHORT, Locale.ENGLISH),
                revenue,
                ordersByMonth.get(ym))));

        Map<String, Long> byStatus = new LinkedHashMap<>();
        for (OrderStatus s : OrderStatus.values()) {
            byStatus.put(s.name(), 0L);
        }
        for (Object[] row : orderRepository.countGroupedByStatus()) {
            byStatus.put(((OrderStatus) row[0]).name(), ((Number) row[1]).longValue());
        }

        List<TopProductResponse> topProducts = orderItemRepository
                .findTopSelling(OrderStatus.REVENUE_STATUSES, PageRequest.of(0, 5)).stream()
                .map(TopProductResponse::fromRow)
                .toList();

        List<ProductResponse> lowStock = productRepository.findLowStock().stream()
                .limit(6)
                .map(ProductResponse::from)
                .toList();

        List<OrderSummaryResponse> recent = orderRepository.findTop5ByOrderByCreatedAtDesc().stream()
                .map(OrderSummaryResponse::from)
                .toList();

        BigDecimal stockValue = productRepository.totalStockValue();

        return new DashboardResponse(
                productRepository.countByActiveTrue(),
                stockValue == null ? BigDecimal.ZERO : stockValue,
                productRepository.countLowStock(),
                productRepository.countByActiveTrueAndQuantityLessThanEqual(0),
                customerRepository.count(),
                supplierRepository.count(),
                orderRepository.countByStatus(OrderStatus.PENDING),
                revenueByMonth.get(thisMonth),
                revenueByMonth.get(thisMonth.minusMonths(1)),
                ordersByMonth.get(thisMonth),
                monthly,
                byStatus,
                topProducts,
                lowStock,
                recent);
    }
}
