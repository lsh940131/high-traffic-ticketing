package com.highticketing.auth.domain.user.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Getter;

@Getter
@AllArgsConstructor(access = AccessLevel.PRIVATE)
@Schema(description = "이메일 중복 확인 응답")
public class CheckEmailResponse {

  @Schema(description = "사용 가능 여부", example = "true")
  private final boolean available;

  public static CheckEmailResponse available() {
    return new CheckEmailResponse(true);
  }

  public static CheckEmailResponse unavailable() {
    return new CheckEmailResponse(false);
  }
}
