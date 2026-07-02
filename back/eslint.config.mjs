// back (NestJS + TypeScript) ESLint — flat config.
// 툴체인은 루트 devDependencies에서 해석됨(Node가 상위 node_modules로 올라감).
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.node },
      sourceType: 'module',
    },
    rules: {
      // NestJS: 데코레이터/DI 패턴 특성상 완화
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-extraneous-class': 'off', // 빈 모듈 클래스 허용
    },
  },
  prettier, // 포맷 관련 룰은 Prettier에 위임(충돌 제거) — 항상 마지막
);
