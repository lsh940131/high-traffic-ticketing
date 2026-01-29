package com.highticketing.auth.domain.user.service;

import com.highticketing.auth.domain.user.dto.response.CheckUserIdResponse;
import com.highticketing.auth.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class UserService {

  private final UserRepository userRepository;

  public CheckUserIdResponse checkUserIdAvailability(String userId) {
    boolean exists = userRepository.existsByUserId(userId);
    return exists ? CheckUserIdResponse.unavailable() : CheckUserIdResponse.available();
  }
}
