# BookStaxx에 Tailwind CSS 도입하기

BookStaxx 크롬 확장 프로그램에 Tailwind CSS를 도입하여 디자인을 현대적이고 일관성 있게 만드는 과정입니다.

## 설치된 파일

이 과정에서 다음 파일들이 생성되었습니다:

1. **package.json**: npm 프로젝트 설정 및 의존성 관리
2. **tailwind.config.js**: Tailwind CSS 설정 파일
3. **src/tailwind.css**: 기본 Tailwind CSS 파일
4. **build-tailwind.js**: Tailwind CSS 빌드 스크립트

## 적용된 변경사항

1. **HTML 파일 수정**:
   - `hide-chrome-bar.html`과 `options.html`에 Tailwind CSS 클래스 적용
   - 모든 인라인 스타일을 Tailwind 유틸리티 클래스로 대체

2. **컴포넌트 정의**:
   - `src/tailwind.css`에 북마크 관련 컴포넌트 스타일 정의
   - 자주 사용되는 UI 요소를 재사용 가능한 컴포넌트로 만듦

3. **JavaScript 수정**:
   - `createBookmarkBar()`, `displayBookmarks()`, `createBookmarkButton()` 함수에 Tailwind 클래스 적용
   - DOM 요소 생성 시 일관된 스타일링 적용

## 사용 방법

### 개발 시

1. 필요한 패키지 설치:
   ```bash
   npm install
   ```

2. Tailwind CSS 개발 모드 실행:
   ```bash
   npm run watch:css
   ```

3. 코드 변경 후 빌드:
   ```bash
   node build-tailwind.js
   ```

### 프로덕션 빌드

```bash
npm run build:css
```

## 테마 설정

`tailwind.config.js` 파일에서 다음과 같은 테마 설정을 변경할 수 있습니다:

- **색상**: 북마크 파란색, 어두운 색, 밝은 색, 호버 색상
- **폰트**: 기본 sans-serif 폰트 패밀리
- **아이콘 크기**: 작은/중간/큰 아이콘 크기
- **그림자**: 북마크 요소 및 호버 시 그림자

## 주의사항

1. 크롬 확장 프로그램에서는 외부 CSS 파일 로드에 제한이 있을 수 있습니다.
2. 콘텐츠 스크립트에서는 인라인 스타일을 사용하는 것이 더 안정적일 수 있습니다.
3. `options.html`과 같은 확장 프로그램 페이지에서는 Tailwind CSS를 전체 적용이 가능합니다. 