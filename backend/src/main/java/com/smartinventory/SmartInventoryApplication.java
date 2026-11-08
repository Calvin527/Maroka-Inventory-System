package com.smartinventory;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * {@code @EnableScheduling} switches on Spring's timer for @Scheduled methods
 * (used by the demo's nightly reset; nothing is scheduled when demo mode is off).
 */
@SpringBootApplication
@EnableScheduling
public class SmartInventoryApplication {

    public static void main(String[] args) {
        SpringApplication.run(SmartInventoryApplication.class, args);
    }
}