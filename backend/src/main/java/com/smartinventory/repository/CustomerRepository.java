
package com.smartinventory.repository;

import com.smartinventory.entity.Customer;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface CustomerRepository extends JpaRepository<Customer, Long>, JpaSpecificationExecutor<Customer> {

    /** Duplicate checks when adding a customer. */
    boolean existsByEmailIgnoreCase(String email);

    boolean existsByPhone(String phone);

    /** Duplicate checks when editing: ignore the customer being edited. */
    boolean existsByEmailIgnoreCaseAndIdNot(String email, Long id);

    boolean existsByPhoneAndIdNot(String phone, Long id);
}