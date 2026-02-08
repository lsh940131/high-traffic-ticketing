package com.highticketing.auth.domain.user.controller;

import com.highticketing.auth.domain.user.dto.request.CheckUserIdRequest;
import com.highticketing.auth.domain.user.dto.response.CheckUserIdResponse;
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

  @Operation(summary = "아이디 중복 확인", description = "입력한 아이디의 사용 가능 여부를 확인합니다")
  @GetMapping("/check-id")
  public ApiResponse<CheckUserIdResponse> checkUserId(
      @Valid @ParameterObject CheckUserIdRequest request) {
    return ApiResponse.success(userService.checkUserIdAvailability(request.getUserId()));
  }
}
