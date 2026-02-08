package com.highticketing.auth.domain.user.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Schema(description = "이메일 중복 확인 요청")
public class CheckEmailRequest {

  @Schema(description = "확인할 이메일 (최대 300자)", example = "user@example.com")
  @NotBlank(message = "이메일은 필수입니다")
  @Size(max = 300, message = "이메일은 300자 이하여야 합니다")
  @Email(message = "올바른 이메일 형식이어야 합니다")
  private String email;
}
