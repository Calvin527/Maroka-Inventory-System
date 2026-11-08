package com.smartinventory.service;

import com.smartinventory.common.BadRequestException;
import com.smartinventory.common.ConflictException;
import com.smartinventory.common.PageResponse;
import com.smartinventory.common.QueryUtils;
import com.smartinventory.common.ResourceNotFoundException;
import com.smartinventory.dto.CustomerRequest;
import com.smartinventory.dto.CustomerResponse;
import com.smartinventory.entity.Customer;
import com.smartinventory.repository.CustomerRepository;
import com.smartinventory.repository.SalesOrderRepository;
import com.smartinventory.security.SecurityUtils;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.Locale;
import java.util.Map;

@Service
public class CustomerService {

    private final CustomerRepository customerRepository;
    private final SalesOrderRepository orderRepository;

    public CustomerService(CustomerRepository customerRepository, SalesOrderRepository orderRepository) {
        this.customerRepository = customerRepository;
        this.orderRepository = orderRepository;
    }

    @Transactional(readOnly = true)
    public PageResponse<CustomerResponse> search(String q, Pageable pageable) {
        Specification<Customer> spec = (root, query, cb) -> {
            if (!StringUtils.hasText(q)) {
                return cb.conjunction();
            }
            String like = QueryUtils.likePattern(q);
            return cb.or(
                    cb.like(cb.lower(root.get("name")), like),
                    cb.like(cb.lower(root.get("email")), like),
                    cb.like(cb.lower(root.get("phone")), like));
        };
        Map<Long, Long> orderCounts = QueryUtils.toCountMap(orderRepository.countGroupedByCustomer());
        return PageResponse.from(customerRepository.findAll(spec, pageable),
                c -> CustomerResponse.from(c, orderCounts.getOrDefault(c.getId(), 0L)));
    }

    @Transactional(readOnly = true)
    public CustomerResponse get(Long id) {
        Map<Long, Long> orderCounts = QueryUtils.toCountMap(orderRepository.countGroupedByCustomer());
        return CustomerResponse.from(find(id), orderCounts.getOrDefault(id, 0L));
    }

    @Transactional
    public CustomerResponse create(CustomerRequest request) {
        String email = normaliseEmail(request.email());
        String phone = normalisePhone(request.phone());

        if (customerRepository.existsByEmailIgnoreCase(email)) {
            throw new ConflictException("A customer with the email " + email + " already exists");
        }
        if (customerRepository.existsByPhone(phone)) {
            throw new ConflictException("A customer with the phone number " + phone + " already exists");
        }

        Customer customer = new Customer(request.name().trim(), email, phone, request.address().trim());
        // Accountability: remember which staff member added this customer.
        customer.setCreatedBy(SecurityUtils.currentUsername());
        return CustomerResponse.from(customerRepository.save(customer), 0);
    }

    @Transactional
    public CustomerResponse update(Long id, CustomerRequest request) {
        Customer customer = find(id);
        String email = normaliseEmail(request.email());
        String phone = normalisePhone(request.phone());

        if (customerRepository.existsByEmailIgnoreCaseAndIdNot(email, id)) {
            throw new ConflictException("Another customer already uses the email " + email);
        }
        if (customerRepository.existsByPhoneAndIdNot(phone, id)) {
            throw new ConflictException("Another customer already uses the phone number " + phone);
        }

        customer.setName(request.name().trim());
        customer.setEmail(email);
        customer.setPhone(phone);
        customer.setAddress(request.address().trim());
        return get(customer.getId());
    }

    @Transactional
    public void delete(Long id) {
        Customer customer = find(id);
        if (orderRepository.existsByCustomerId(id)) {
            throw new ConflictException(customer.getName()
                    + " has order history and can't be deleted (records must be kept for reporting).");
        }
        customerRepository.delete(customer);
    }

    /** Emails are stored trimmed and in lower case, so duplicates are easy to spot. */
    static String normaliseEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    /**
     * Turns any accepted way of writing a South African number into one standard format.
     * "0716362034", "071-636-2034" and "+27 71 636 2034" all become "071 636 2034",
     * so the same number can't be saved twice in different formats.
     */
    static String normalisePhone(String phone) {
        String digits = phone.replaceAll("[\\s\\-()]", "");
        if (digits.startsWith("+27")) {
            digits = "0" + digits.substring(3);
        }
        if (!digits.matches("0\\d{9}")) {
            throw new BadRequestException("Phone must be a South African number, e.g. 072 555 0110");
        }
        return digits.substring(0, 3) + " " + digits.substring(3, 6) + " " + digits.substring(6);
    }

    private Customer find(Long id) {
        return customerRepository.findById(id).orElseThrow(() -> ResourceNotFoundException.of("Customer", id));
    }
}