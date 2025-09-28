import express from "express";
import * as userController from "../controller/users.mjs";
import { body } from "express-validator";
import { validate } from "../middleware/validator.mjs";
import rateLimit from "express-rate-limit"; //요청 속도 제한 (Rate Limiting) 모듈
import { isAuth } from "../middleware/users.mjs";
import { verifyRecaptcha } from "../middleware/verifyRecaptcha.mjs";

const router = express.Router();

//문자 요청 제한
const smsLimiter = rateLimit({
  windowMs: 60 * 1000, // 1분
  max: 10, // 1분에 10번까지 허용
  message: "문자 인증 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.",
});

//로그인시 입력정보 형식 확인
const validateLogin = [
  body("userid")
    .trim()
    .isLength({ min: 4 })
    .withMessage("아이디는 최소 4자 이상 입력하세요")
    .matches(/^[a-zA-Z0-9]*$/)
    .withMessage("특수문자는 사용이 불가합니다"),
  body("passwd")
    .trim()
    .isLength({ min: 6 })
    .withMessage("비밀번호는 최소 6자이상 입력하세요"),
  validate,
];

//회원 가입시 입력정보 형식 확인
const validateSignup = [
  ...validateLogin,
  body("nickname").trim().notEmpty().withMessage("nickname을 입력하세요"),
  body("email").trim().isEmail().withMessage("이메일 형식을 확인해주세요"),
  validate,
];

// 아이디 찾기 시 이메일 형식 확인
const validateFindId = [
  body("email").trim().isEmail().withMessage("이메일 형식을 확인해주세요"),
  validate,
];

//인증번호 전송시 폰번호 형식 확인
const validatePhone = [
  body("phone")
    .trim()
    .isNumeric()
    .withMessage("핸드폰 번호 형식을 확인 바랍니다."),
  validate,
];

//인증번호 입력시 인증번호 형식 확인
const validateCode = [
  body("code").trim().isNumeric().withMessage("인증번호는 숫자형식 입니다."),
  validate,
];
//비밀번호 변경시 비밀번호 형식 확인
const validateNewPW = [
  body("newPassword")
    .trim()
    .isLength({ min: 6 })
    .withMessage("비밀번호는 최소 6자이상 입력하세요"),
  validate,
];

//회원가입(post)
router.post("/signup", validateSignup, verifyRecaptcha, userController.signup);
//로그인
router.post("/login", validateLogin, verifyRecaptcha, userController.login);
//아이디 찾기
router.post("/findID", validateFindId, userController.findID);
//유저 중복 확인버튼
router.post("/check", userController.check);
//회원가입용 인증번호 보내기
router.post(
  "/send-signupcode",
  validatePhone,
  smsLimiter,
  userController.sendSignupCode
);
//비밀번호 재설정용 인증번호 보내기
router.post("/send-code", validatePhone, smsLimiter, userController.sendCode);
//인증번호 확인
router.post("/verify-code", validateCode, userController.verifyCode);
//비밀번호 재설정
router.post("/reset-password", validateNewPW, userController.resetPassword);

//로그인한 사용자 회원정보 변경
router.post("/update", isAuth, userController.updateUser);
//로그인한 사용자의 친구 추가
router.post("/add-friend", isAuth, userController.addFriend);
// 로그인한 사용자 개인정보 보내주기
router.get("/me", isAuth, userController.getMe);
// 로그인한 사용자의 친구 목록 보내주기기
router.get("/get-friend", isAuth, userController.getFriends);
//로그인한 사용자의 친구 추가
router.post("/remove-friend", isAuth, userController.removeFriend);
//userid와 nickname 매핑
router.get("/user-map", isAuth, userController.getUserMap);
//nickname과 userid 매핑
router.post("/nicknames-to-ids", isAuth, userController.nicknamesToIds);

export default router;
