package com.smartinventory.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

/** Sales report for a date range. Only confirmed, shipped and delivered orders count as sales. */
public record SalesSummaryResponse(
        LocalDate from,
        LocalDate to,
        long orderCount,
        BigDecimal revenue,
        BigDecimal taxCollected,
        BigDecimal grossTotal,
        BigDecimal averageOrderValue,
        List<DailySales> daily,
        List<TopProductResponse> topProducts,
        List<TopCustomer> topCustomers
) {
    public record DailySales(LocalDate date, long orders, BigDecimal revenue) {
    }

    public record TopCustomer(Long customerId, String customerName, long orders, BigDecimal revenue) {
    }
}
