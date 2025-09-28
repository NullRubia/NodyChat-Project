import express from "express";
import { createServer } from "http"; // 소켓 통신을 위한 http 서버 생성
import { Server } from "socket.io"; // Socket.IO 서버 클래스
import { config } from "./config.mjs"; // 환경 설정 (PORT 등)
import { connectDB } from "./db/database.mjs"; // DB 연결
import userRouter from "./router/users.mjs";
import chatRoomRouter from "./router/chatRoom.mjs";
import messgeRouter from "./router/message.mjs";
import * as messageController from "./controller/message.mjs"; //메세지 전송용용
import * as userRepository from "./data/users.mjs";
import { fileURLToPath } from "url";
import { isAuth } from "./middleware/users.mjs"; // JWT 인증 미들웨어
import fs from "fs";
import path from "path";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import weatherParsing from "./service/weatherParsing.mjs"; //날씨 정보 파싱
import newsParsing from "./service/newsParsing.mjs"; //뉴스 웹페이지 파싱
import youtubeAPI from "./service/youtube.mjs";
import rateLimit from "express-rate-limit"; //요청 속도 제한 (Rate Limiting) 모듈

const PORT = config.host.port;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Express 앱 생성
const app = express();

// http 서버 생성 (소켓 통신은 http 서버를 통해 동작)
const server = createServer(app);

// Socket.IO 서버 생성
const io = new Server(server, {
  cors: {
    origin: "*", // 필요 시 도메인 제한
    credentials: true,
  },
});
//요청 제한 걸기
//전역 속도 제한: 1분에 500번 이하 요청 허용
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1분
  max: 500, // 최대 500번 요청 허용
  message: "요청이 너무 많습니다. 잠시 후 다시 시도해주세요.",
  standardHeaders: true, // RateLimit-* 헤더 포함
  legacyHeaders: false, // X-RateLimit-* 헤더 비활성화
});

// 미들웨어 설정
app.use(limiter);
app.use(cookieParser());
app.use(express.json()); // JSON 바디 파서
app.use(express.urlencoded({ extended: true })); // URL 인코딩 바디 파서
app.use(express.static(__dirname)); // 정적 파일 제공

//봇 차단 코드
//서버에 대한 검색엔진 크롤링 방지와, 자동화된 봇 또는 스크래퍼의 접근 차단을 목적
//GET /robots.txt 요청에 대해 응답을 줍니다.
//"User-agent: *": 모든 검색 엔진 크롤러(bot)를 지칭합니다.
//"Disallow: /": 웹사이트의 모든 경로에 접근하지 말라는 뜻입니다.
//cmd에서 "curl -A "googlebot" http://localhost:8080" Forbidden(403) 이렇게 뜨면 정상 차단된것.
app.get("/robots.txt", (req, res) => {
  res.type("text/plain");
  res.send("User-agent: *\nDisallow: /");
});

const botUserAgents = [
  /googlebot/i,
  /bingbot/i,
  /slurp/i,
  /duckduckbot/i,
  /baiduspider/i,
  /yandexbot/i,
  /sogou/i,
  /exabot/i,
  /facebot/i,
  /ia_archiver/i,
  /python-requests/i,
  /scrapy/i,
  /curl/i,
  /wget/i,
];
app.use((req, res, next) => {
  const ua = req.headers["user-agent"];
  if (ua && botUserAgents.some((bot) => bot.test(ua))) {
    return res.status(403).send("Forbidden");
  }
  next();
});

// 로그인 페이지
app.get("/", (req, res) => {
  res.clearCookie("token"); // 로그인 페이지 접근 시 토큰 삭제
  fs.readFile(path.join(__dirname, "./loginPage/login.html"), (err, data) => {
    if (err) return res.status(500).send("파일 오류");
    res.status(200).set({ "Content-Type": "text/html" }).send(data);
  });
});

// 회원가입 페이지
app.get("/signup", (req, res) => {
  fs.readFile(path.join(__dirname, "./signupPage/signup.html"), (err, data) => {
    if (err) return res.status(500).send("파일 오류");
    res.status(200).set({ "Content-Type": "text/html" }).send(data);
  });
});

// 메인 채팅 페이지 - 인증된 사용자만 접근 가능
app.get("/main", isAuth, (req, res) => {
  fs.readFile(path.join(__dirname, "./mainPage/mainpage.html"), (err, data) => {
    if (err) return res.status(500).send("파일 오류");
    res.status(200).set({ "Content-Type": "text/html" }).send(data);
  });
});

// API 라우팅
app.use("/user", userRouter);
app.use("/chatRoom", chatRoomRouter);
app.use("/message", messgeRouter);
app.use("/weather", weatherParsing);
app.use("/news", newsParsing);
app.use("/youtube", youtubeAPI);

// 없는 경로 처리
app.use((req, res, next) => {
  res.sendStatus(404);
});

// DB 연결 후 서버 시작
connectDB()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`서버 실행 중: http://localhost:${PORT}`);
    });
  })
  .catch(console.error);

//소켓 설정
// 사용자 인증 로직이 있다면 socket.handshake.auth.token 등을 확인
const connectedUsers = {};
io.use(async (socket, next) => {
  const token = socket.handshake.auth.token;

  if (!token) {
    return next(new Error("토큰 없음"));
  }

  try {
    const secret = config.jwt.secretKey || "your_jwt_secret";
    const decoded = jwt.verify(token, secret);

    const IdFromToken = decoded.id || decoded._id;

    // 토큰에서 받은 _id로 사용자 조회
    const user = await userRepository.findByid(IdFromToken); //
    if (!user) {
      return next(new Error("사용자 없음"));
    }

    console.log(user);
    // socket 객체에 사용자 정보 저장
    socket.userId = user.userid; // 예: "kim0527"
    socket._mongoId = user._id; // 필요 시 Mongo ObjectId도 저장
    socket.friend = user.friend; // 로그인한 유저의 친구 목록

    next();
  } catch (err) {
    console.error("JWT 인증 실패:", err.message);
    next(new Error("인증 실패"));
  }
});
//소켓연결
io.on("connection", (socket) => {
  console.log("클라이언트 연결:", socket.id);

  const userid = socket.userId;
  if (userid) {
    connectedUsers[userid] = socket.id;
    console.log(`${userid} 소켓 등록됨: ${socket.id}`);
  }

  // 클라이언트가 채팅방에 입장
  socket.on("joinRoom", (roomId) => {
    socket.join(roomId);
    console.log(`➡ ${socket.id} 가 방 ${roomId}에 입장`);
  });

  // 클라이언트가 메시지 전송
  socket.on("chatMessage", async ({ roomId, message }) => {
    try {
      const senderId = socket.userId;

      // 메시지를 DB에 저장
      const saved = await messageController.saveMessage({
        senderId,
        chatroomId: roomId,
        content: message,
      });

      // 보낸 사람 닉네임 조회
      const user = await userRepository.findByUserid(senderId);
      const nickname = user?.nickname || "익명";

      // 해당 방 사용자들에게 메시지 전송
      io.to(roomId).emit("chatMessage", {
        roomId,
        message: saved.content,
        nickname,
        createdAt: saved.createdAt,
      });

      console.log(`${nickname} 메시지 전송됨 → ${roomId}`);
    } catch (err) {
      console.error("메시지 처리 오류:", err);
    }
  });

  // 클라이언트가 연결 종료
  socket.on("disconnect", () => {
    console.log("연결 종료:", socket.id);

    for (const [uid, sid] of Object.entries(connectedUsers)) {
      if (sid === socket.id) {
        delete connectedUsers[uid];
        console.log(`❌ ${uid} 연결 제거됨`);
        break;
      }
    }
  });
});

export { io, connectedUsers };
