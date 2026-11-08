package com.smartinventory.service;

import com.smartinventory.common.ConflictException;
import com.smartinventory.common.QueryUtils;
import com.smartinventory.common.ResourceNotFoundException;
import com.smartinventory.dto.CategoryRequest;
import com.smartinventory.dto.CategoryResponse;
import com.smartinventory.entity.Category;
import com.smartinventory.repository.CategoryRepository;
import com.smartinventory.repository.ProductRepository;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Service
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;

    public CategoryService(CategoryRepository categoryRepository, ProductRepository productRepository) {
        this.categoryRepository = categoryRepository;
        this.productRepository = productRepository;
    }

    @Transactional(readOnly = true)
    public List<CategoryResponse> list() {
        Map<Long, Long> counts = QueryUtils.toCountMap(productRepository.countGroupedByCategory());
        return categoryRepository.findAll(Sort.by("name")).stream()
                .map(c -> CategoryResponse.from(c, counts.getOrDefault(c.getId(), 0L)))
                .toList();
    }

    @Transactional(readOnly = true)
    public CategoryResponse get(Long id) {
        Category category = find(id);
        return CategoryResponse.from(category, productRepository.countByCategoryId(id));
    }

    @Transactional
    public CategoryResponse create(CategoryRequest request) {
        String name = request.name().trim();
        if (categoryRepository.existsByNameIgnoreCase(name)) {
            throw new ConflictException("Category '" + name + "' already exists");
        }
        Category saved = categoryRepository.save(new Category(name, QueryUtils.trimToNull(request.description())));
        return CategoryResponse.from(saved, 0);
    }

    @Transactional
    public CategoryResponse update(Long id, CategoryRequest request) {
        Category category = find(id);
        String name = request.name().trim();
        if (categoryRepository.existsByNameIgnoreCaseAndIdNot(name, id)) {
            throw new ConflictException("Category '" + name + "' already exists");
        }
        category.setName(name);
        category.setDescription(QueryUtils.trimToNull(request.description()));
        return CategoryResponse.from(category, productRepository.countByCategoryId(id));
    }

    @Transactional
    public void delete(Long id) {
        Category category = find(id);
        long products = productRepository.countByCategoryId(id);
        if (products > 0) {
            throw new ConflictException("'" + category.getName() + "' still has " + products
                    + " product(s). Move them to another category first.");
        }
        categoryRepository.delete(category);
    }

    private Category find(Long id) {
        return categoryRepository.findById(id).orElseThrow(() -> ResourceNotFoundException.of("Category", id));
    }
}
