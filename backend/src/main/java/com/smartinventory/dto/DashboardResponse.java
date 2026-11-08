package com.smartinventory.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

public record DashboardResponse(
        long totalProducts,
        BigDecimal totalStockValue,
        long lowStockCount,
        long outOfStockCount,
        long totalCustomers,
        long totalSuppliers,
        long pendingOrders,
        BigDecimal revenueThisMonth,
        BigDecimal revenueLastMonth,
        long ordersThisMonth,
        List<MonthlySales> monthlySales,
        Map<String, Long> ordersByStatus,
        List<TopProductResponse> topProducts,
        List<ProductResponse> lowStockProducts,
        List<OrderSummaryResponse> recentOrders
) {
    /** Revenue excludes VAT. {@code month} is yyyy-MM, {@code label} is e.g. "Jun". */
    public record MonthlySales(String month, String label, BigDecimal revenue, long orders) {
    }
}
