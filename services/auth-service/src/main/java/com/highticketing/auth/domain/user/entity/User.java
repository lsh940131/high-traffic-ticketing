package com.highticketing.auth.domain.user.entity;

import com.highticketing.common.security.Role;
import jakarta.persistence.*;
import java.time.Instant;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "users")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class User {

  @Id
  @GeneratedValue(strategy = GenerationType.IDENTITY)
  private Long id;

  @Column(nullable = false, unique = true, length = 300)
  private String email;

  @Column(name = "pwd", nullable = false)
  private String password;

  @Enumerated(EnumType.STRING)
  @Column(nullable = false, length = 50)
  private Role role;

  @Column(nullable = false, updatable = false)
  private Instant createdAt;

  private Instant updatedAt;

  private Instant deletedAt;

  @Builder
  public User(String email, String password, Role role) {
    this.email = email;
    this.password = password;
    this.role = role;
  }

  @PrePersist
  protected void onCreate() {
    this.createdAt = Instant.now();
  }

  @PreUpdate
  protected void onUpdate() {
    this.updatedAt = Instant.now();
  }
}
