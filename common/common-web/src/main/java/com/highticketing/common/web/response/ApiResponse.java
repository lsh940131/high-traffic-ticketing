package com.highticketing.common.web.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@JsonInclude(JsonInclude.Include.NON_NULL)
public class ApiResponse<T> {

  private final T data;
  private final ErrorResponse error;

  public static <T> ApiResponse<T> success(T data) {
    return new ApiResponse<>(data, null);
  }

  public static ApiResponse<Void> success() {
    return new ApiResponse<>(null, null);
  }

  public static <T> ApiResponse<T> error(String code, String msg) {
    return new ApiResponse<>(null, ErrorResponse.of(code, msg));
  }

  public static <T> ApiResponse<T> error(ErrorResponse errorResponse) {
    return new ApiResponse<>(null, errorResponse);
  }
}
