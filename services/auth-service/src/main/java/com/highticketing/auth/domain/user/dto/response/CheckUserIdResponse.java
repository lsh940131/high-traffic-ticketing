package com.highticketing.auth.domain.user.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Schema(description = "아이디 중복 확인 응답")
public class CheckUserIdResponse {

  @Schema(description = "사용 가능 여부", example = "true")
  private final boolean available;

  @Schema(description = "메시지", example = "사용 가능한 아이디입니다")
  private final String message;

  public static CheckUserIdResponse available() {
    return new CheckUserIdResponse(true, "사용 가능한 아이디입니다");
  }

  public static CheckUserIdResponse unavailable() {
    return new CheckUserIdResponse(false, "이미 사용 중인 아이디입니다");
  }
}
