package com.highticketing.auth.domain.user.controller;

import com.highticketing.auth.domain.user.dto.request.CheckEmailRequest;
import com.highticketing.auth.domain.user.dto.response.CheckEmailResponse;
import com.highticketing.auth.domain.user.service.UserService;
import com.highticketing.common.web.response.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.web.bind.annotation.*;

@Tag(name = "User", description = "사용자 API")
@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
public class UserController {

  private final UserService userService;

  @Operation(summary = "이메일 중복 확인", description = "입력한 이메일의 사용 가능 여부를 확인합니다")
  @GetMapping("/check-email")
  public ApiResponse<CheckEmailResponse> checkEmail(
      @Valid @ParameterObject CheckEmailRequest request) {
    return ApiResponse.success(userService.checkEmailAvailability(request.getEmail()));
  }
}
