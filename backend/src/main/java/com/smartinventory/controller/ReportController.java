package com.smartinventory.controller;

import com.smartinventory.dto.SalesSummaryResponse;
import com.smartinventory.service.ReportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;

@RestController
@RequestMapping("/api/reports")
@PreAuthorize("hasAnyRole('ADMIN','MANAGER')")
@Tag(name = "Reports (admin & manager)")
public class ReportController {

    private static final MediaType CSV = new MediaType("text", "csv", StandardCharsets.UTF_8);

    private final ReportService reportService;

    public ReportController(ReportService reportService) {
        this.reportService = reportService;
    }

    @GetMapping("/sales-summary")
    @Operation(summary = "Sales summary for a date range (defaults to this month)")
    public SalesSummaryResponse salesSummary(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        LocalDate end = to != null ? to : reportService.today();
        LocalDate start = from != null ? from : end.withDayOfMonth(1);
        return reportService.salesSummary(start, end);
    }

    @GetMapping("/inventory.csv")
    public ResponseEntity<byte[]> inventoryCsv() {
        return csv("inventory-" + reportService.today() + ".csv", reportService.inventoryCsv());
    }

    @GetMapping("/low-stock.csv")
    public ResponseEntity<byte[]> lowStockCsv() {
        return csv("low-stock-" + reportService.today() + ".csv", reportService.lowStockCsv());
    }

    @GetMapping("/sales.csv")
    public ResponseEntity<byte[]> salesCsv(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        LocalDate end = to != null ? to : reportService.today();
        LocalDate start = from != null ? from : end.withDayOfMonth(1);
        return csv("sales-" + start + "-to-" + end + ".csv", reportService.salesCsv(start, end));
    }

    private static ResponseEntity<byte[]> csv(String filename, String body) {
        return ResponseEntity.ok()
                .contentType(CSV)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename(filename).build().toString())
                .body(body.getBytes(StandardCharsets.UTF_8));
    }
}
