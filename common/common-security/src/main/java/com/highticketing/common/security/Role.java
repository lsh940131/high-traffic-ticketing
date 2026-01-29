package com.highticketing.common.security;

public enum Role {
  ADMIN("ROLE_ADMIN"),
  USER("ROLE_USER");

  private final String authority;

  Role(String authority) {
    this.authority = authority;
  }

  public String getAuthority() {
    return authority;
  }
}
