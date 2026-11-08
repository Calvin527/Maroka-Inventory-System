package com.smartinventory.controller;

import com.smartinventory.common.PageResponse;
import com.smartinventory.dto.StockMovementRequest;
import com.smartinventory.dto.StockMovementResponse;
import com.smartinventory.entity.MovementType;
import com.smartinventory.service.StockService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/stock-movements")
@Tag(name = "Stock movements")
public class StockMovementController {

    private final StockService stockService;

    public StockMovementController(StockService stockService) {
        this.stockService = stockService;
    }

    @GetMapping
    public PageResponse<StockMovementResponse> history(
            @RequestParam(required = false) Long productId,
            @RequestParam(required = false) MovementType type,
            @PageableDefault(size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return stockService.history(productId, type, pageable);
    }

    @PostMapping
    @Operation(summary = "Record stock in, stock out or a stock-take adjustment")
    public ResponseEntity<StockMovementResponse> record(@Valid @RequestBody StockMovementRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(stockService.record(request));
    }
}
