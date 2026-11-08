package com.smartinventory.service;

import com.smartinventory.common.ConflictException;
import com.smartinventory.common.QueryUtils;
import com.smartinventory.common.ResourceNotFoundException;
import com.smartinventory.dto.SupplierRequest;
import com.smartinventory.dto.SupplierResponse;
import com.smartinventory.entity.Supplier;
import com.smartinventory.repository.ProductRepository;
import com.smartinventory.repository.SupplierRepository;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class SupplierService {

    private final SupplierRepository supplierRepository;
    private final ProductRepository productRepository;

    public SupplierService(SupplierRepository supplierRepository, ProductRepository productRepository) {
        this.supplierRepository = supplierRepository;
        this.productRepository = productRepository;
    }

    /** Suppliers are a short list, so filtering happens in memory. */
    @Transactional(readOnly = true)
    public List<SupplierResponse> list(String q) {
        Map<Long, Long> counts = QueryUtils.toCountMap(productRepository.countGroupedBySupplier());
        String term = StringUtils.hasText(q) ? q.trim().toLowerCase(Locale.ROOT) : null;
        return supplierRepository.findAll(Sort.by("name")).stream()
                .filter(s -> term == null || matches(s, term))
                .map(s -> SupplierResponse.from(s, counts.getOrDefault(s.getId(), 0L)))
                .toList();
    }

    @Transactional(readOnly = true)
    public SupplierResponse get(Long id) {
        return SupplierResponse.from(find(id), productRepository.countBySupplierId(id));
    }

    @Transactional
    public SupplierResponse create(SupplierRequest request) {
        Supplier supplier = new Supplier(request.name().trim(), QueryUtils.trimToNull(request.contactPerson()),
                QueryUtils.trimToNull(request.email()), QueryUtils.trimToNull(request.phone()),
                QueryUtils.trimToNull(request.address()));
        return SupplierResponse.from(supplierRepository.save(supplier), 0);
    }

    @Transactional
    public SupplierResponse update(Long id, SupplierRequest request) {
        Supplier supplier = find(id);
        supplier.setName(request.name().trim());
        supplier.setContactPerson(QueryUtils.trimToNull(request.contactPerson()));
        supplier.setEmail(QueryUtils.trimToNull(request.email()));
        supplier.setPhone(QueryUtils.trimToNull(request.phone()));
        supplier.setAddress(QueryUtils.trimToNull(request.address()));
        return SupplierResponse.from(supplier, productRepository.countBySupplierId(id));
    }

    @Transactional
    public void delete(Long id) {
        Supplier supplier = find(id);
        long products = productRepository.countBySupplierId(id);
        if (products > 0) {
            throw new ConflictException(supplier.getName() + " still supplies " + products
                    + " product(s). Reassign them first.");
        }
        supplierRepository.delete(supplier);
    }

    private Supplier find(Long id) {
        return supplierRepository.findById(id).orElseThrow(() -> ResourceNotFoundException.of("Supplier", id));
    }

    private static boolean matches(Supplier s, String term) {
        return contains(s.getName(), term) || contains(s.getContactPerson(), term)
                || contains(s.getEmail(), term) || contains(s.getPhone(), term);
    }

    private static boolean contains(String value, String term) {
        return value != null && value.toLowerCase(Locale.ROOT).contains(term);
    }
}
