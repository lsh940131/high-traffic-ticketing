package com.highticketing.common.web.exception;

import lombok.Getter;

@Getter
public class CustomException extends RuntimeException {

  private final ErrorCode errorCode;

  public CustomException(ErrorCode errorCode) {
    super(errorCode.getMsg());
    this.errorCode = errorCode;
  }

  public CustomException(ErrorCode errorCode, String message) {
    super(message);
    this.errorCode = errorCode;
  }
}
