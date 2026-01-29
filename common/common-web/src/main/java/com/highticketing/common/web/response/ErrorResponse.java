package com.highticketing.common.web.response;

import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor(access = AccessLevel.PRIVATE)
public class ErrorResponse {

  private final String code;
  private final String msg;

  public static ErrorResponse of(String code, String msg) {
    return new ErrorResponse(code, msg);
  }
}
