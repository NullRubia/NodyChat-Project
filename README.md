# **Nody Chat(웹소켓을 이용한 실시간 웹 채팅 프로젝트)**

### **프로젝트 개요 파일**

- NodyChat발표PPT.pdf
  - 프로젝트 소개와 발표 내용
- NodyChat피그마.png & WebChatting.fig
  - NodyChat 피그마 시트
- NodyChat_QA\_테스트 시트.xlsx
  - Nodychat 테스트 시트
- 링크.txt
  - 프로젝트 개요 파일 링크

### **프로젝트 구조(NodeJS단일 서버 구조)**

```
NodyChat/
├── controller/     # 클라이언트 요청 처리, data 함수 호출 및 응답 반환
├── data/           # MongoDB Mongoose 모델 및 DB 접근 함수 (User CRUD 등)
├── db/             # 데이터베이스 연결 설정 및 공통 DB 유틸리티
├── middleware/     # 인증, 로깅, 에러 처리 등 미들웨어
├── service/        # 외부 API 호출 및 크롤링 기능 등 비즈니스 연동 로직
├── router/         # 엔드포인트 라우팅 정의
├── signupPage/     # 회원가입 페이지 HTML/CSS/JS
├── loginPage/      # 로그인 페이지 HTML/CSS/JS
└── mainPage/       # 채팅 메인 페이지 HTML/CSS/JS
```

### **환경변수 설정**

NodyChat 안에 env.txt를 참고하여 .env를 본인에 맞게 설정
login.html, signup.html의 아래 부분을 본인 키에 맞게 변경

```
<div class="g-recaptcha" data-sitekey="your_recaptcha_site_key"></div>
```
