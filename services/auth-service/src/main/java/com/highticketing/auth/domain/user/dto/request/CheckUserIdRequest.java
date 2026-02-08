package com.highticketing.auth.domain.user.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Schema(description = "아이디 중복 확인 요청")
public class CheckUserIdRequest {

  @Schema(description = "확인할 아이디 (6~100자, 영문/숫자만(regexp=^[a-zA-Z0-9]+$)", example = "testuser123")
  @NotBlank(message = "아이디는 필수입니다")
  @Size(min = 6, max = 100, message = "아이디는 6자 이상 100자 이하여야 합니다")
  @Pattern(regexp = "^[a-zA-Z0-9]+$", message = "아이디는 영어 대소문자와 숫자만 사용 가능합니다")
  private String userId;
}
