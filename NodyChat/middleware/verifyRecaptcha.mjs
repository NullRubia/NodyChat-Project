import axios from "axios";
import { config } from "../config.mjs"; // 환경변수 관리하는 모듈 경로 맞게 조정

export async function verifyRecaptcha(req, res, next) {
  try {
    const recaptchaToken = req.body["g-recaptcha-response"];
    if (!recaptchaToken) {
      return res
        .status(400)
        .send(
          `<script>alert('reCAPTCHA 토큰이 없습니다.'); history.back();</script>`
        );
    }

    const secret = config.CAPTCHA.apiKey;
    const verifyUrl = "https://www.google.com/recaptcha/api/siteverify";

    const { data } = await axios.post(verifyUrl, null, {
      params: {
        secret,
        response: recaptchaToken,
      },
    });

    if (!data.success) {
      return res
        .status(400)
        .send(`<script>alert('reCAPTCHA 인증 실패'); history.back();</script>`);
    }

    next(); // 인증 성공하면 다음 미들웨어/컨트롤러로 넘어감
  } catch (err) {
    console.error("reCAPTCHA 검증 중 오류:", err.message);
    return res
      .status(500)
      .send(
        `<script>alert('서버 오류가 발생했습니다.'); history.back();</script>`
      );
  }
}
