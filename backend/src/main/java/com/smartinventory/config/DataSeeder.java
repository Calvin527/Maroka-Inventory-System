package com.smartinventory.config;

import com.smartinventory.entity.Category;
import com.smartinventory.entity.Customer;
import com.smartinventory.entity.MovementType;
import com.smartinventory.entity.OrderItem;
import com.smartinventory.entity.OrderStatus;
import com.smartinventory.entity.Product;
import com.smartinventory.entity.Role;
import com.smartinventory.entity.SalesOrder;
import com.smartinventory.entity.StockMovement;
import com.smartinventory.entity.Supplier;
import com.smartinventory.entity.User;
import com.smartinventory.repository.CategoryRepository;
import com.smartinventory.repository.CustomerRepository;
import com.smartinventory.repository.OrderItemRepository;
import com.smartinventory.repository.ProductRepository;
import com.smartinventory.repository.SalesOrderRepository;
import com.smartinventory.repository.StockMovementRepository;
import com.smartinventory.repository.SupplierRepository;
import com.smartinventory.repository.UserRepository;
import com.smartinventory.service.DemoService;
import com.smartinventory.service.OrderService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Random;
import java.util.Set;

/**
 * DEMO MODE ONLY. This bean doesn't exist at all unless app.demo.enabled=true.
 *
 * Fills an empty demo database with a realistic sample business (a building and hardware supplier),
 * and wipes and reloads it every night so visitors always find a clean demo.
 * Every order that took stock out also has a matching stock movement, so product histories add up.
 */
@Component
@ConditionalOnProperty(name = "app.demo.enabled", havingValue = "true")
public class DataSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);

    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;
    private final SupplierRepository supplierRepository;
    private final CustomerRepository customerRepository;
    private final ProductRepository productRepository;
    private final StockMovementRepository movementRepository;
    private final SalesOrderRepository orderRepository;
    private final OrderItemRepository orderItemRepository;
    private final PasswordEncoder passwordEncoder;
    private final TransactionTemplate transaction;
    private final BigDecimal taxRate;
    private final ZoneId zone;

    public DataSeeder(UserRepository userRepository, CategoryRepository categoryRepository,
                      SupplierRepository supplierRepository, CustomerRepository customerRepository,
                      ProductRepository productRepository, StockMovementRepository movementRepository,
                      SalesOrderRepository orderRepository, OrderItemRepository orderItemRepository,
                      PasswordEncoder passwordEncoder, PlatformTransactionManager transactionManager,
                      @Value("${app.tax-rate}") BigDecimal taxRate,
                      @Value("${app.timezone}") String timezone) {
        this.userRepository = userRepository;
        this.categoryRepository = categoryRepository;
        this.supplierRepository = supplierRepository;
        this.customerRepository = customerRepository;
        this.productRepository = productRepository;
        this.movementRepository = movementRepository;
        this.orderRepository = orderRepository;
        this.orderItemRepository = orderItemRepository;
        this.passwordEncoder = passwordEncoder;
        this.transaction = new TransactionTemplate(transactionManager);
        this.taxRate = taxRate;
        this.zone = ZoneId.of(timezone);
    }

    /** On start-up: load the demo business, but only into an empty database. */
    @Override
    public void run(String... args) {
        if (userRepository.count() > 0) {
            log.info("Demo mode: database already has data, keeping it until the nightly reset");
            return;
        }
        transaction.executeWithoutResult(status -> seed());
        log.info("Demo mode: sample business loaded");
    }

    /** Every night: wipe everything and load a fresh copy, all in one transaction. */
    @Scheduled(cron = "${app.demo.reset-cron}", zone = "${app.timezone}")
    public void nightlyReset() {
        log.info("Demo mode: nightly reset starting");
        transaction.executeWithoutResult(status -> {
            wipe();
            seed();
        });
        log.info("Demo mode: nightly reset finished");
    }

    /** Deletes all rows. Children first (order items, movements), so no foreign key is broken. */
    private void wipe() {
        orderItemRepository.deleteAllInBatch();
        orderRepository.deleteAllInBatch();
        movementRepository.deleteAllInBatch();
        productRepository.deleteAllInBatch();
        customerRepository.deleteAllInBatch();
        categoryRepository.deleteAllInBatch();
        supplierRepository.deleteAllInBatch();
        userRepository.deleteAllInBatch();
    }

    private void seed() {
        Instant openingDate = Instant.now().minus(190, ChronoUnit.DAYS);
        List<String> staffEmails = seedUsers();
        Map<String, Category> categories = seedCategories();
        Map<String, Supplier> suppliers = seedSuppliers();
        List<Customer> customers = seedCustomers(staffEmails, openingDate);
        List<Product> products = seedProducts(categories, suppliers, openingDate);
        List<SalesOrder> orders = seedOrders(customers, products, staffEmails);
        seedStockHistory(products, orders, openingDate);
    }

    /** Creates the demo accounts and returns the staff members' emails. */
    private List<String> seedUsers() {
        List<String> staff = new ArrayList<>();
        for (DemoService.DemoAccount a : DemoService.ACCOUNTS) {
            userRepository.save(new User(a.fullName(), a.email(), passwordEncoder.encode(a.password()), a.role()));
            if (a.role() == Role.STAFF) {
                staff.add(a.email());
            }
        }
        return staff;
    }

    private Map<String, Category> seedCategories() {
        Category building = new Category("Building Materials", "Cement, sand, bricks, steel and roofing");
        Category plumbing = new Category("Plumbing", "Pipes, fittings, geysers and taps");
        Category electrical = new Category("Electrical & Solar", "Cable, breakers, lighting and backup power");
        Category tools = new Category("Tools", "Hand and power tools");
        Category paint = new Category("Paint & Finishes", "Interior and exterior paint and accessories");
        categoryRepository.saveAll(List.of(building, plumbing, electrical, tools, paint));
        return Map.of("BM", building, "PL", plumbing, "EL", electrical, "TL", tools, "PT", paint);
    }

    private Map<String, Supplier> seedSuppliers() {
        Supplier highveld = new Supplier("Highveld Building Supplies", "Johan Pretorius",
                "orders@highveldbuild.example", "012 555 0101", "14 Industrial Rd, Pretoria West");
        Supplier aqua = new Supplier("AquaFlow Plumbing Wholesale", "Nomsa Khumalo",
                "sales@aquaflow.example", "011 555 0144", "8 Main Reef Rd, Germiston");
        Supplier volt = new Supplier("Volt Electrical Distributors", "Rajesh Naidoo",
                "trade@voltelectrical.example", "031 555 0177", "22 Umgeni Rd, Durban");
        Supplier karoo = new Supplier("Karoo Tools & Hardware", "Pieter Botha",
                "info@karootools.example", "051 555 0123", "5 Church St, Bloemfontein");
        Supplier colour = new Supplier("ColourCraft Paints", "Fatima Adams",
                "orders@colourcraft.example", "021 555 0188", "31 Voortrekker Rd, Bellville");
        supplierRepository.saveAll(List.of(highveld, aqua, volt, karoo, colour));
        return Map.of("BM", highveld, "PL", aqua, "EL", volt, "TL", karoo, "PT", colour);
    }

    /** Customers are added by staff members, like in the real system, a few days after opening. */
    private List<Customer> seedCustomers(List<String> staffEmails, Instant openingDate) {
        String[][] rows = {
                {"Mokoena Construction", "accounts@mokoenacon.example", "072 555 0110", "Soshanguve, Pretoria"},
                {"Naledi Interiors", "naledi@naledi-interiors.example", "083 555 0121", "Hatfield, Pretoria"},
                {"Ridgeview Builders", "info@ridgeview.example", "082 555 0132", "Centurion"},
                {"Sipho Dlamini", "sipho.dlamini@mail.example", "076 555 0143", "Mamelodi East"},
                {"Greenfield Property Maintenance", "jobs@greenfieldpm.example", "071 555 0154", "Midrand"},
                {"Kgosi Renovations", "kgosi@kgosireno.example", "079 555 0165", "Atteridgeville"},
                {"Amanda van der Merwe", "amanda.vdm@mail.example", "084 555 0176", "Montana Park"},
                {"Tshwane Community Projects", "projects@tcp.example", "012 555 0187", "Pretoria CBD"},
        };
        List<Customer> customers = new ArrayList<>();
        for (int i = 0; i < rows.length; i++) {
            Customer c = new Customer(rows[i][0], rows[i][1], rows[i][2], rows[i][3]);
            c.setCreatedBy(staffEmails.get(i % staffEmails.size()));
            c.setCreatedAt(openingDate.plus(1 + i, ChronoUnit.DAYS));
            customers.add(customerRepository.save(c));
        }
        return customers;
    }

    /** Products are saved with their final quantity; seedStockHistory works out the history behind it. */
    private List<Product> seedProducts(Map<String, Category> c, Map<String, Supplier> s, Instant openingDate) {
        // sku, name, group, cost, sell, qty on hand today, reorder level, unit
        Object[][] rows = {
                {"BM-CEM-50", "Cement 42.5N 50kg", "BM", "89.00", "115.00", 240, 80, "bag"},
                {"BM-SND-1M", "Building sand (1 cubic metre)", "BM", "380.00", "520.00", 18, 10, "m3"},
                {"BM-BRK-500", "Clay stock bricks (pack of 500)", "BM", "1450.00", "1890.00", 12, 15, "pack"},
                {"BM-RBR-Y12", "Rebar Y12 6m", "BM", "95.00", "129.00", 160, 50, "length"},
                {"BM-IBR-3M", "IBR roof sheet 0.47mm 3m", "BM", "265.00", "349.00", 45, 30, "sheet"},
                {"PL-PVC-110", "PVC sewer pipe 110mm 6m", "PL", "210.00", "289.00", 38, 20, "length"},
                {"PL-CU-15", "Copper pipe 15mm 5.5m", "PL", "320.00", "425.00", 6, 15, "length"},
                {"PL-GYS-150", "Electric geyser 150L 3kW", "PL", "4200.00", "5499.00", 4, 3, "unit"},
                {"PL-TAP-BMX", "Basin mixer tap, chrome", "PL", "380.00", "549.00", 27, 10, "unit"},
                {"PL-PTF-12", "Thread seal tape 12mm", "PL", "6.50", "12.99", 0, 50, "roll"},
                {"EL-CBL-2.5", "Surfix cable 2.5mm 100m", "EL", "1350.00", "1799.00", 14, 8, "roll"},
                {"EL-CB-20A", "Circuit breaker 20A", "EL", "58.00", "89.00", 95, 40, "unit"},
                {"EL-LED-9W", "LED bulb 9W B22 (10 pack)", "EL", "120.00", "179.00", 33, 25, "pack"},
                {"EL-PLG-3P", "3-pin plug top", "EL", "18.00", "32.00", 9, 30, "unit"},
                {"EL-INV-5K", "Hybrid inverter 5kW", "EL", "14500.00", "18999.00", 3, 2, "unit"},
                {"EL-BAT-5K", "Lithium battery 5.12kWh", "EL", "16800.00", "21999.00", 2, 2, "unit"},
                {"TL-DRL-18V", "Cordless drill 18V", "TL", "1150.00", "1599.00", 21, 8, "unit"},
                {"TL-GRD-115", "Angle grinder 115mm", "TL", "520.00", "749.00", 16, 6, "unit"},
                {"TL-HAM-450", "Claw hammer 450g", "TL", "95.00", "149.00", 48, 15, "unit"},
                {"TL-TPM-8M", "Tape measure 8m", "TL", "65.00", "99.00", 60, 20, "unit"},
                {"PT-PVA-20W", "PVA paint white 20L", "PT", "520.00", "749.00", 26, 12, "tin"},
                {"PT-ENM-5L", "Enamel gloss 5L", "PT", "390.00", "559.00", 7, 10, "tin"},
                {"PT-RLR-230", "Paint roller 230mm", "PT", "45.00", "79.00", 70, 25, "unit"},
                {"PT-UCT-5L", "Universal undercoat 5L", "PT", "310.00", "449.00", 19, 8, "tin"},
        };

        List<Product> products = new ArrayList<>();
        for (Object[] r : rows) {
            Product p = new Product((String) r[0], (String) r[1],
                    new BigDecimal((String) r[3]), new BigDecimal((String) r[4]), (Integer) r[6]);
            p.setCategory(c.get((String) r[2]));
            p.setSupplier(s.get((String) r[2]));
            p.setQuantity((Integer) r[5]);
            p.setUnit((String) r[7]);
            p.setCreatedAt(openingDate);
            products.add(productRepository.save(p));
        }
        return products;
    }

    /** Roughly 55 orders over the last six months, growing month on month, captured by different staff. */
    private List<SalesOrder> seedOrders(List<Customer> customers, List<Product> products, List<String> staffEmails) {
        Random rnd = new Random(42);
        LocalDate today = LocalDate.now(zone);
        Instant now = Instant.now();

        List<Instant> dates = new ArrayList<>();
        for (int monthsBack = 5; monthsBack >= 0; monthsBack--) {
            LocalDate monthStart = today.minusMonths(monthsBack).withDayOfMonth(1);
            int lastDay = monthsBack == 0 ? today.getDayOfMonth() : monthStart.lengthOfMonth();
            int count = 6 + (5 - monthsBack) * 2;
            if (monthsBack == 0) {
                // Scale the current month to how far through it we are (at least a few orders).
                count = Math.max(4, count * lastDay / monthStart.lengthOfMonth());
            }
            for (int i = 0; i < count; i++) {
                LocalDate day = monthStart.plusDays(rnd.nextInt(lastDay));
                Instant at = day.atTime(7 + rnd.nextInt(10), rnd.nextInt(60)).atZone(zone).toInstant();
                if (at.isAfter(now)) {
                    at = now.minus(1 + rnd.nextInt(120), ChronoUnit.MINUTES);
                }
                dates.add(at);
            }
        }
        Collections.sort(dates);

        // Staff don't all work equally hard: weights 3 : 2 : 1, so the manager's staff view has something to show.
        int[] weights = {3, 2, 1};
        List<String> staffPicker = new ArrayList<>();
        for (int i = 0; i < staffEmails.size(); i++) {
            for (int w = 0; w < weights[Math.min(i, weights.length - 1)]; w++) {
                staffPicker.add(staffEmails.get(i));
            }
        }

        List<SalesOrder> orders = new ArrayList<>();
        for (Instant at : dates) {
            Customer customer = customers.get(rnd.nextInt(customers.size()));
            String capturedBy = staffPicker.get(rnd.nextInt(staffPicker.size()));
            SalesOrder order = new SalesOrder(customer, null, capturedBy);

            int lines = 1 + rnd.nextInt(4);
            Set<Long> used = new HashSet<>();
            for (int l = 0; l < lines; l++) {
                Product p = products.get(rnd.nextInt(products.size()));
                if (!used.add(p.getId())) {
                    continue;
                }
                double price = p.getSellingPrice().doubleValue();
                int qty = price > 3000 ? 1 : price > 500 ? 1 + rnd.nextInt(3) : 1 + rnd.nextInt(15);
                order.addItem(new OrderItem(p, qty, p.getSellingPrice()));
            }
            OrderService.applyTotals(order, taxRate);
            order.setStatus(pickStatus(rnd, at, now));
            order.setCreatedAt(at);
            order = orderRepository.save(order);
            order.setOrderNumber(OrderService.formatOrderNumber(order.getId()));
            orders.add(order);
        }
        return orders;
    }

    /**
     * Builds a stock history that adds up: opening stock = today's quantity + everything sold since,
     * then one "Stock out" movement for each item on every order that was confirmed (or later).
     */
    private void seedStockHistory(List<Product> products, List<SalesOrder> orders, Instant openingDate) {
        Map<Long, Integer> sold = new HashMap<>();
        for (SalesOrder o : orders) {
            if (o.getStatus().holdsStock()) {
                for (OrderItem i : o.getItems()) {
                    sold.merge(i.getProduct().getId(), i.getQuantity(), Integer::sum);
                }
            }
        }

        Map<Long, Integer> running = new HashMap<>();
        for (Product p : products) {
            int opening = p.getQuantity() + sold.getOrDefault(p.getId(), 0);
            running.put(p.getId(), opening);
            if (opening > 0) {
                StockMovement m = new StockMovement(p, MovementType.IN, opening, 0, opening,
                        "Opening stock", "OPENING", "system");
                m.setCreatedAt(openingDate);
                movementRepository.save(m);
            }
        }

        String manager = DemoService.ACCOUNTS.stream()
                .filter(a -> a.role() == Role.MANAGER).findFirst().orElseThrow().email();
        for (SalesOrder o : orders) { // already in date order
            if (!o.getStatus().holdsStock()) {
                continue;
            }
            for (OrderItem i : o.getItems()) {
                Product p = i.getProduct();
                int before = running.get(p.getId());
                int after = before - i.getQuantity();
                running.put(p.getId(), after);
                StockMovement m = new StockMovement(p, MovementType.OUT, -i.getQuantity(), before, after,
                        "Sold on order " + o.getOrderNumber(), o.getOrderNumber(), manager);
                m.setCreatedAt(o.getCreatedAt());
                movementRepository.save(m);
            }
        }
    }

    private static OrderStatus pickStatus(Random rnd, Instant at, Instant now) {
        long daysAgo = ChronoUnit.DAYS.between(at, now);
        int roll = rnd.nextInt(100);
        if (daysAgo > 14) {
            return roll < 90 ? OrderStatus.DELIVERED : OrderStatus.CANCELLED;
        }
        if (daysAgo > 5) {
            return roll < 50 ? OrderStatus.DELIVERED : roll < 85 ? OrderStatus.SHIPPED : OrderStatus.CANCELLED;
        }
        return roll < 40 ? OrderStatus.PENDING : roll < 75 ? OrderStatus.CONFIRMED : OrderStatus.SHIPPED;
    }
}