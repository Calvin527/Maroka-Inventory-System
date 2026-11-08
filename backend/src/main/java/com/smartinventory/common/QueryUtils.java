package com.smartinventory.common;

import org.springframework.util.StringUtils;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

public final class QueryUtils {

    private QueryUtils() {
    }

    /** Turns rows of [id, count] from a GROUP BY query into a lookup map. */
    public static Map<Long, Long> toCountMap(List<Object[]> rows) {
        Map<Long, Long> map = new HashMap<>();
        for (Object[] row : rows) {
            map.put(((Number) row[0]).longValue(), ((Number) row[1]).longValue());
        }
        return map;
    }

    /** "%term%" in lower case for case-insensitive LIKE searches. */
    public static String likePattern(String term) {
        return "%" + term.trim().toLowerCase() + "%";
    }

    public static String trimToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }
}
