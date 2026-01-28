package com.highticketing.common.web.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class SwaggerConfig {

    private static final String SECURITY_SCHEME_NAME = "bearer-jwt";

    @Bean
    public OpenAPI openAPI(
            @Value("${spring.application.name:API}") String appName,
            @Value("${springdoc.info.title:}") String customTitle,
            @Value("${springdoc.info.description:}") String description,
            @Value("${springdoc.info.version:v1.0.0}") String version
    ) {
        String title = customTitle.isEmpty() ? appName + " API" : customTitle;

        return new OpenAPI()
                .info(new Info()
                        .title(title)
                        .version(version)
                        .description(description.isEmpty() ? title + " Documentation" : description))
                .addSecurityItem(new SecurityRequirement().addList(SECURITY_SCHEME_NAME))
                .components(new Components()
                        .addSecuritySchemes(SECURITY_SCHEME_NAME,
                                new SecurityScheme()
                                        .type(SecurityScheme.Type.HTTP)
                                        .scheme("bearer")
                                        .bearerFormat("JWT")
                                        .description("로그인 시 발급받은 access token을 입력하세요")));
    }
}
