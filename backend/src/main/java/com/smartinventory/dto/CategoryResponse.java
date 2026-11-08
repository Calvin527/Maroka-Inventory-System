package com.smartinventory.dto;

import com.smartinventory.entity.Category;

public record CategoryResponse(
        Long id,
        String name,
        String description,
        long productCount
) {
    public static CategoryResponse from(Category c, long productCount) {
        return new CategoryResponse(c.getId(), c.getName(), c.getDescription(), productCount);
    }
}
