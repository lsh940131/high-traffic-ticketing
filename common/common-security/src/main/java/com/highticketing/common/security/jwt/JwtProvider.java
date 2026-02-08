package com.highticketing.common.security.jwt;

import com.highticketing.common.security.Role;
import com.highticketing.common.security.UserPrincipal;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import javax.crypto.SecretKey;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class JwtProvider {

  private final JwtProperties jwtProperties;

  public String createAccessToken(Long userId, String email, Role role) {
    return createToken(userId, email, role, jwtProperties.getAccessTokenExpiration());
  }

  public String createRefreshToken(Long userId, String email, Role role) {
    return createToken(userId, email, role, jwtProperties.getRefreshTokenExpiration());
  }

  private String createToken(Long userId, String email, Role role, long expiration) {
    Date now = new Date();
    Date expiryDate = new Date(now.getTime() + expiration);

    return Jwts.builder()
        .subject(String.valueOf(userId))
        .claim("email", email)
        .claim("role", role.name())
        .issuedAt(now)
        .expiration(expiryDate)
        .signWith(getSigningKey())
        .compact();
  }

  public UserPrincipal parseToken(String token) {
    Claims claims =
        Jwts.parser().verifyWith(getSigningKey()).build().parseSignedClaims(token).getPayload();

    Long userId = Long.valueOf(claims.getSubject());
    String email = claims.get("email", String.class);
    Role role = Role.valueOf(claims.get("role", String.class));

    return new UserPrincipal(userId, email, role);
  }

  public boolean validateToken(String token) {
    try {
      Jwts.parser().verifyWith(getSigningKey()).build().parseSignedClaims(token);
      return true;
    } catch (JwtException | IllegalArgumentException e) {
      return false;
    }
  }

  private SecretKey getSigningKey() {
    byte[] keyBytes = jwtProperties.getSecret().getBytes(StandardCharsets.UTF_8);
    return Keys.hmacShaKeyFor(keyBytes);
  }
}
