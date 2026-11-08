package com.smartinventory.service;

import com.smartinventory.common.BadRequestException;
import com.smartinventory.dto.SalesSummaryResponse;
import com.smartinventory.dto.TopProductResponse;
import com.smartinventory.entity.OrderStatus;
import com.smartinventory.entity.Product;
import com.smartinventory.entity.SalesOrder;
import com.smartinventory.repository.OrderItemRepository;
import com.smartinventory.repository.ProductRepository;
import com.smartinventory.repository.SalesOrderRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class ReportService {

    private static final int MAX_RANGE_DAYS = 366;
    private static final DateTimeFormatter DATE_TIME = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

    private final SalesOrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final ProductRepository productRepository;
    private final ZoneId zone;

    public ReportService(SalesOrderRepository orderRepository, OrderItemRepository orderItemRepository,
                         ProductRepository productRepository, @Value("${app.timezone}") String timezone) {
        this.orderRepository = orderRepository;
        this.orderItemRepository = orderItemRepository;
        this.productRepository = productRepository;
        this.zone = ZoneId.of(timezone);
    }

    public LocalDate today() {
        return LocalDate.now(zone);
    }

    @Transactional(readOnly = true)
    public SalesSummaryResponse salesSummary(LocalDate from, LocalDate to) {
        validateRange(from, to);
        Instant start = from.atStartOfDay(zone).toInstant();
        Instant end = to.plusDays(1).atStartOfDay(zone).toInstant();

        List<SalesOrder> orders = orderRepository.findByStatusesInPeriod(OrderStatus.REVENUE_STATUSES, start, end);

        Map<LocalDate, long[]> dailyCounts = new LinkedHashMap<>();
        Map<LocalDate, BigDecimal> dailyRevenue = new LinkedHashMap<>();
        for (LocalDate d = from; !d.isAfter(to); d = d.plusDays(1)) {
            dailyCounts.put(d, new long[]{0});
            dailyRevenue.put(d, BigDecimal.ZERO);
        }

        BigDecimal revenue = BigDecimal.ZERO;
        BigDecimal tax = BigDecimal.ZERO;
        BigDecimal gross = BigDecimal.ZERO;
        Map<Long, SalesSummaryResponse.TopCustomer> customers = new LinkedHashMap<>();

        for (SalesOrder o : orders) {
            revenue = revenue.add(o.getSubtotal());
            tax = tax.add(o.getTaxAmount());
            gross = gross.add(o.getTotal());

            LocalDate day = o.getCreatedAt().atZone(zone).toLocalDate();
            dailyCounts.get(day)[0]++;
            dailyRevenue.merge(day, o.getSubtotal(), BigDecimal::add);

            Long cid = o.getCustomer().getId();
            SalesSummaryResponse.TopCustomer prev = customers.get(cid);
            customers.put(cid, prev == null
                    ? new SalesSummaryResponse.TopCustomer(cid, o.getCustomer().getName(), 1, o.getSubtotal())
                    : new SalesSummaryResponse.TopCustomer(cid, prev.customerName(), prev.orders() + 1,
                    prev.revenue().add(o.getSubtotal())));
        }

        List<SalesSummaryResponse.DailySales> daily = new ArrayList<>();
        dailyCounts.forEach((d, count) -> daily.add(
                new SalesSummaryResponse.DailySales(d, count[0], dailyRevenue.get(d))));

        List<TopProductResponse> topProducts = orderItemRepository
                .findTopSellingInPeriod(OrderStatus.REVENUE_STATUSES, start, end, PageRequest.of(0, 10)).stream()
                .map(TopProductResponse::fromRow)
                .toList();

        List<SalesSummaryResponse.TopCustomer> topCustomers = customers.values().stream()
                .sorted(Comparator.comparing(SalesSummaryResponse.TopCustomer::revenue).reversed())
                .limit(5)
                .toList();

        BigDecimal average = orders.isEmpty() ? BigDecimal.ZERO
                : revenue.divide(BigDecimal.valueOf(orders.size()), 2, RoundingMode.HALF_UP);

        return new SalesSummaryResponse(from, to, orders.size(), revenue, tax, gross, average,
                daily, topProducts, topCustomers);
    }

    @Transactional(readOnly = true)
    public String inventoryCsv() {
        Csv csv = new Csv("SKU", "Name", "Category", "Supplier", "Unit", "Quantity", "Reorder Level",
                "Stock Status", "Cost Price", "Selling Price", "Stock Value (Cost)", "Active");
        for (Product p : productRepository.findAllForReport()) {
            csv.row(p.getSku(), p.getName(),
                    p.getCategory() == null ? "" : p.getCategory().getName(),
                    p.getSupplier() == null ? "" : p.getSupplier().getName(),
                    p.getUnit(), p.getQuantity(), p.getReorderLevel(), stockStatus(p),
                    p.getCostPrice(), p.getSellingPrice(), p.getStockValue(), p.isActive() ? "Yes" : "No");
        }
        return csv.toString();
    }

    @Transactional(readOnly = true)
    public String lowStockCsv() {
        Csv csv = new Csv("SKU", "Name", "Category", "Supplier", "Supplier Phone", "Supplier Email",
                "Quantity", "Reorder Level", "Suggested Order Qty");
        for (Product p : productRepository.findLowStock()) {
            // Simple rule of thumb: order enough to reach twice the reorder level.
            int suggested = Math.max(p.getReorderLevel() * 2 - p.getQuantity(), 1);
            csv.row(p.getSku(), p.getName(),
                    p.getCategory() == null ? "" : p.getCategory().getName(),
                    p.getSupplier() == null ? "" : p.getSupplier().getName(),
                    p.getSupplier() == null ? "" : p.getSupplier().getPhone(),
                    p.getSupplier() == null ? "" : p.getSupplier().getEmail(),
                    p.getQuantity(), p.getReorderLevel(), suggested);
        }
        return csv.toString();
    }

    @Transactional(readOnly = true)
    public String salesCsv(LocalDate from, LocalDate to) {
        validateRange(from, to);
        Instant start = from.atStartOfDay(zone).toInstant();
        Instant end = to.plusDays(1).atStartOfDay(zone).toInstant();
        Csv csv = new Csv("Order Number", "Date", "Customer", "Status", "Subtotal (excl. VAT)", "VAT", "Total",
                "Captured By");
        for (SalesOrder o : orderRepository.findAllInPeriod(start, end)) {
            csv.row(o.getOrderNumber(), DATE_TIME.format(o.getCreatedAt().atZone(zone)), o.getCustomer().getName(),
                    o.getStatus().name(), o.getSubtotal(), o.getTaxAmount(), o.getTotal(), o.getCreatedBy());
        }
        return csv.toString();
    }

    private static String stockStatus(Product p) {
        if (p.isOutOfStock()) return "OUT OF STOCK";
        if (p.isLowStock()) return "LOW";
        return "OK";
    }

    private static void validateRange(LocalDate from, LocalDate to) {
        if (from.isAfter(to)) {
            throw new BadRequestException("'from' must be on or before 'to'");
        }
        if (ChronoUnit.DAYS.between(from, to) > MAX_RANGE_DAYS) {
            throw new BadRequestException("Date range can be at most " + MAX_RANGE_DAYS + " days");
        }
    }

    /** Minimal CSV builder with proper quoting and protection against spreadsheet formula injection. */
    private static final class Csv {
        private final StringBuilder sb = new StringBuilder("﻿"); // BOM so Excel reads UTF-8 correctly

        Csv(String... headers) {
            row((Object[]) headers);
        }

        void row(Object... values) {
            for (int i = 0; i < values.length; i++) {
                if (i > 0) sb.append(',');
                sb.append(escape(values[i]));
            }
            sb.append("\r\n");
        }

        private static String escape(Object value) {
            if (value == null) return "";
            if (value instanceof Number) return value.toString();
            String s = value.toString();
            if (!s.isEmpty() && "=+-@".indexOf(s.charAt(0)) >= 0) {
                s = "'" + s;
            }
            if (s.contains(",") || s.contains("\"") || s.contains("\n") || s.contains("\r")) {
                s = "\"" + s.replace("\"", "\"\"") + "\"";
            }
            return s;
        }

        @Override
        public String toString() {
            return sb.toString();
        }
    }
}
