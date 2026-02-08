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

  public static CheckUserIdResponse available() {
    return new CheckUserIdResponse(true);
  }

  public static CheckUserIdResponse unavailable() {
    return new CheckUserIdResponse(false);
  }
}
