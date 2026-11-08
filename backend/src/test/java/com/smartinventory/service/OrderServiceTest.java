package com.smartinventory.service;

import com.smartinventory.common.BadRequestException;
import com.smartinventory.entity.Customer;
import com.smartinventory.entity.OrderItem;
import com.smartinventory.entity.OrderStatus;
import com.smartinventory.entity.Product;
import com.smartinventory.entity.Role;
import com.smartinventory.entity.SalesOrder;
import com.smartinventory.entity.StockMovement;
import com.smartinventory.repository.CustomerRepository;
import com.smartinventory.repository.ProductRepository;
import com.smartinventory.repository.SalesOrderRepository;
import com.smartinventory.repository.StockMovementRepository;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Unit tests for the stock and permission rules in the order lifecycle (no database, no Spring context).
 */
@ExtendWith(MockitoExtension.class)
class OrderServiceTest {

    @Mock SalesOrderRepository orderRepository;
    @Mock CustomerRepository customerRepository;
    @Mock ProductRepository productRepository;
    @Mock StockMovementRepository movementRepository;

    OrderService orderService;

    @BeforeEach
    void setUp() {
        StockService stockService = new StockService(movementRepository, productRepository);
        orderService = new OrderService(orderRepository, customerRepository, productRepository,
                stockService, new BigDecimal("0.15"));
        lenient().when(movementRepository.save(any(StockMovement.class))).thenAnswer(inv -> inv.getArgument(0));

        // Most tests act as a manager; the permission tests switch user themselves.
        loginAs(Role.MANAGER);
    }

    @AfterEach
    void tearDown() {
        // Don't let one test's login leak into the next.
        SecurityContextHolder.clearContext();
    }

    @Test
    void confirmingAnOrderDeductsStockAndRecordsAMovement() {
        Product drill = product("TL-DRL-18V", 10);
        SalesOrder order = order(OrderStatus.PENDING, drill, 3);
        when(orderRepository.findDetailedById(1L)).thenReturn(Optional.of(order));

        orderService.updateStatus(1L, OrderStatus.CONFIRMED);

        assertThat(drill.getQuantity()).isEqualTo(7);
        assertThat(order.getStatus()).isEqualTo(OrderStatus.CONFIRMED);
        verify(movementRepository, times(1)).save(any(StockMovement.class));
    }

    @Test
    void confirmingFailsWithoutTouchingStockWhenThereIsNotEnough() {
        Product geyser = product("PL-GYS-150", 2);
        SalesOrder order = order(OrderStatus.PENDING, geyser, 5);
        when(orderRepository.findDetailedById(1L)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> orderService.updateStatus(1L, OrderStatus.CONFIRMED))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Not enough stock");

        assertThat(geyser.getQuantity()).isEqualTo(2);
        assertThat(order.getStatus()).isEqualTo(OrderStatus.PENDING);
        verify(movementRepository, never()).save(any(StockMovement.class));
    }

    @Test
    void staffCannotConfirmAnOrder() {
        loginAs(Role.STAFF);
        Product drill = product("TL-DRL-18V", 10);
        SalesOrder order = order(OrderStatus.PENDING, drill, 3);
        when(orderRepository.findDetailedById(1L)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> orderService.updateStatus(1L, OrderStatus.CONFIRMED))
                .isInstanceOf(AccessDeniedException.class);

        // Nothing may change when the request is rejected.
        assertThat(drill.getQuantity()).isEqualTo(10);
        assertThat(order.getStatus()).isEqualTo(OrderStatus.PENDING);
        verify(movementRepository, never()).save(any(StockMovement.class));
    }

    @Test
    void adminCanConfirmAnOrder() {
        loginAs(Role.ADMIN);
        Product drill = product("TL-DRL-18V", 10);
        SalesOrder order = order(OrderStatus.PENDING, drill, 3);
        when(orderRepository.findDetailedById(1L)).thenReturn(Optional.of(order));

        orderService.updateStatus(1L, OrderStatus.CONFIRMED);

        assertThat(order.getStatus()).isEqualTo(OrderStatus.CONFIRMED);
    }

    @Test
    void staffCanStillCancelAPendingOrder() {
        loginAs(Role.STAFF);
        SalesOrder order = order(OrderStatus.PENDING, product("BM-CEM-50", 7), 3);
        when(orderRepository.findDetailedById(1L)).thenReturn(Optional.of(order));

        orderService.updateStatus(1L, OrderStatus.CANCELLED);

        assertThat(order.getStatus()).isEqualTo(OrderStatus.CANCELLED);
    }

    @Test
    void cancellingAConfirmedOrderReturnsStock() {
        Product cement = product("BM-CEM-50", 7);
        SalesOrder order = order(OrderStatus.CONFIRMED, cement, 3);
        when(orderRepository.findDetailedById(1L)).thenReturn(Optional.of(order));

        orderService.updateStatus(1L, OrderStatus.CANCELLED);

        assertThat(cement.getQuantity()).isEqualTo(10);
        assertThat(order.getStatus()).isEqualTo(OrderStatus.CANCELLED);
    }

    @Test
    void cancellingAPendingOrderLeavesStockAlone() {
        Product cement = product("BM-CEM-50", 7);
        SalesOrder order = order(OrderStatus.PENDING, cement, 3);
        when(orderRepository.findDetailedById(1L)).thenReturn(Optional.of(order));

        orderService.updateStatus(1L, OrderStatus.CANCELLED);

        assertThat(cement.getQuantity()).isEqualTo(7);
        verify(movementRepository, never()).save(any(StockMovement.class));
    }

    @Test
    void skippingStepsInTheLifecycleIsRejected() {
        SalesOrder order = order(OrderStatus.PENDING, product("X-1", 5), 1);
        when(orderRepository.findDetailedById(1L)).thenReturn(Optional.of(order));

        assertThatThrownBy(() -> orderService.updateStatus(1L, OrderStatus.DELIVERED))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void totalsAddFifteenPercentVat() {
        SalesOrder order = order(OrderStatus.PENDING, product("X-1", 5), 2); // 2 x R100.00

        OrderService.applyTotals(order, new BigDecimal("0.15"));

        assertThat(order.getSubtotal()).isEqualByComparingTo("200.00");
        assertThat(order.getTaxAmount()).isEqualByComparingTo("30.00");
        assertThat(order.getTotal()).isEqualByComparingTo("230.00");
    }

    /** Pretends a user with this role is logged in, the same way the JWT filter does for real requests. */
    private static void loginAs(Role role) {
        var auth = new UsernamePasswordAuthenticationToken(
                role.name().toLowerCase() + "@test.local", null,
                List.of(new SimpleGrantedAuthority("ROLE_" + role.name())));
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    private static Product product(String sku, int quantity) {
        Product p = new Product(sku, "Product " + sku, new BigDecimal("60.00"), new BigDecimal("100.00"), 1);
        p.setQuantity(quantity);
        return p;
    }

    private static SalesOrder order(OrderStatus status, Product product, int quantity) {
        SalesOrder order = new SalesOrder(new Customer("Test Customer", null, null, null), null, "test");
        order.setOrderNumber("SO-000001");
        order.addItem(new OrderItem(product, quantity, product.getSellingPrice()));
        order.setStatus(status);
        return order;
    }
}