package com.highticketing.auth.domain.user.service;

import com.highticketing.auth.domain.user.dto.response.CheckEmailResponse;
import com.highticketing.auth.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserService {

  private final UserRepository userRepository;

  public CheckEmailResponse checkEmailAvailability(String email) {
    boolean exists = userRepository.existsByEmail(email);
    return exists ? CheckEmailResponse.unavailable() : CheckEmailResponse.available();
  }
}
