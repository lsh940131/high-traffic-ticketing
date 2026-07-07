import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  /** 이름 @example 홍길동 */
  @IsString()
  @IsNotEmpty({ message: '이름을 입력해주세요.' })
  name!: string;

  /** 이메일 @example hong@test.com */
  @IsEmail({}, { message: '올바른 이메일 형식이 아닙니다.' })
  email!: string;

  /** 비밀번호 (8자 이상) @example password123 */
  @IsString()
  @MinLength(8, { message: '비밀번호는 8자 이상이어야 합니다.' })
  password!: string;
}

export class LoginDto {
  /** 이메일 @example hong@test.com */
  @IsEmail({}, { message: '올바른 이메일 형식이 아닙니다.' })
  email!: string;

  /** 비밀번호 @example password123 */
  @IsString()
  @IsNotEmpty({ message: '비밀번호를 입력해주세요.' })
  password!: string;
}
