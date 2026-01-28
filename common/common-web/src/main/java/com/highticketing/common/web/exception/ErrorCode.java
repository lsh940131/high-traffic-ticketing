package com.highticketing.common.web.exception;

import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum ErrorCode {

    // Common
    BAD_REQUEST(HttpStatus.BAD_REQUEST, "COMMON_001", "잘못된 요청입니다"),
    INVALID_INPUT(HttpStatus.BAD_REQUEST, "COMMON_002", "입력값이 올바르지 않습니다"),
    RESOURCE_NOT_FOUND(HttpStatus.NOT_FOUND, "COMMON_003", "요청한 리소스를 찾을 수 없습니다"),
    INTERNAL_SERVER_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "COMMON_004", "서버 오류가 발생했습니다"),
    UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "COMMON_005", "인증이 필요합니다"),
    FORBIDDEN(HttpStatus.FORBIDDEN, "COMMON_006", "접근 권한이 없습니다");

    private final HttpStatus httpStatus;
    private final String code;
    private final String msg;
}
