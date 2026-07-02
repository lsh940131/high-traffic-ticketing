// 커밋 메시지 기계 검증. 사람/AI용 문서 = COMMIT_CONVENTION.md.
// 포맷:  <scope>(<type>): <제목>     예) queue(feat): 대기열 진입 토큰 발급
//   → "어디에(scope) 무엇을(type)" 순서로 읽히도록 표준(type-first)에서 뒤집음.
// husky commit-msg 훅에서 실행됨.
module.exports = {
  parserPreset: {
    parserOpts: {
      headerPattern: /^(\w+)\((\w+)\):\s(.+)$/,
      headerCorrespondence: ['scope', 'type', 'subject'],
    },
  },
  rules: {
    // scope = 어디에(디렉터리) — 필수
    'scope-empty': [2, 'never'],
    'scope-enum': [
      2,
      'always',
      [ 'root','infra','front', 'back', 'gateway', 'queue', 'reservation', 'payment', 'figma', 'docs',],
    ],
    // type = 무엇을(작업 종류) — 필수
    'type-empty': [2, 'never'],
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'build', 'ci', 'chore'],
    ],
    // 제목
    'subject-empty': [2, 'never'],
    'subject-full-stop': [2, 'never', '.'],
    'header-max-length': [2, 'always', 72],
    // 본문/꼬리말 앞 빈 줄
    'body-leading-blank': [2, 'always'],
    'footer-leading-blank': [2, 'always'],
  },
};
