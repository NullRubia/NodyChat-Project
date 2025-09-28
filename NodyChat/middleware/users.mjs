import jwt from "jsonwebtoken";
import * as userRepository from "../data/users.mjs";
import { config } from "../config.mjs";

export const isAuth = async (req, res, next) => {
  const token = req.cookies?.token; // ← 쿠키에서 토큰 가져오기
  if (!token) {
    console.log("토큰없음");
    return res.send(
      `<script>alert('로그인되지 않았습니다.'); location.href='/';</script>`
    );
  }

  jwt.verify(token, config.jwt.secretKey, async (error, decoded) => {
    if (error) {
      console.log("JWT 토큰 검증 실패:", error.message);
      return res.send(
        `<script>alert('토큰이 유효하지 않습니다. 재로그인 바랍니다.'); location.href='/';</script>`
      );
    }
    // 토큰 유효할 때만 아래 실행
    const user = await userRepository.findByid(decoded.id);
    if (!user) {
      console.log("사용자를 찾을 수 없음 (ID:", decoded.id, ")");
      return res.send(
        `<script>alert('사용자를 찾을 수 없습니다.'); location.href='/';</script>`
      );
    }
    console.log("인증 성공 - 사용자 ID:", user.id);
    req.id = user.id;
    next();
  });
};
