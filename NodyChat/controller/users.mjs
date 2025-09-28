import * as userRepository from "../data/users.mjs";
import * as bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { config } from "../config.mjs";
import { sendVerificationSMS } from "../service/sms.mjs";

// 인증번호 임시 저장용 객체
const smsCode = new Map();
// 인증 폰번호 저장용 세션객체
const currentPhoneSessions = new Map();

const secretKey = config.jwt.secretKey;
const bcryptSaltRounds = config.bcrypt.saltRounds;
const jwtExpiresInDays = config.jwt.expiresInSec;

async function createJwtToken(id) {
  return jwt.sign({ id }, secretKey, { expiresIn: jwtExpiresInDays });
}

//유저 중복 확인용 함수
export async function check(req, res) {
  const { nickname, email, phone, userid } = req.body;
  const foundId = await userRepository.findByUserid(userid);
  const foundEmail = await userRepository.findByEmail(email);
  const foundPhone = await userRepository.findByPhone(phone);
  const foundNickname = await userRepository.findByNickname(nickname);
  if (foundId) {
    return res.status(409).json({ message: "이미 사용 중인 아이디입니다." });
  }
  if (foundNickname) {
    return res.status(409).json({ message: "이미 사용 중인 닉네임입니다." });
  }
  if (foundEmail) {
    return res.status(409).json({ message: "이미 사용 중인 이메일입니다." });
  }
  if (foundPhone) {
    return res.status(409).json({ message: "이미 사용 중인 번호입니다." });
  }
  return res.status(200).json({ message: "중복된 사항이 없습니다." });
}

//회원가입
export async function signup(req, res, next) {
  const { nickname, email, phone, userid, passwd, image, sessionId } = req.body;

  // 회원 중복 체크
  const foundId = await userRepository.findByUserid(userid);
  const foundEmail = await userRepository.findByEmail(email);
  const foundPhone = await userRepository.findByPhone(phone);
  const foundNickname = await userRepository.findByNickname(nickname);
  if (foundId) {
    return res.status(409).json({ message: `${userid}이 이미 있습니다.` });
  }
  if (foundEmail) {
    return res.status(409).json({ message: `${email}이 이미 있습니다.` });
  }
  if (foundPhone) {
    return res.status(409).json({ message: `${phone}이 이미 있습니다.` });
  }
  if (foundNickname) {
    return res.status(409).json({ message: `${nickname}이 이미 있습니다.` });
  }

  const hashed = bcrypt.hashSync(passwd, bcryptSaltRounds);
  const users = await userRepository.createUser({
    nickname,
    email,
    phone,
    userid,
    passwd: hashed,
    image,
  });
  const token = await createJwtToken(users.id);
  if (token) {
    res.status(201).json({ token, userid });
  }
  //회원가입 완료시 세션 삭제
  const phoneFromSession = currentPhoneSessions.get(sessionId);
  if (phoneFromSession) {
    currentPhoneSessions.delete(sessionId);
    smsCode.delete(phoneFromSession);
  }
}

//로그인
export async function login(req, res, next) {
  const { userid, passwd } = req.body;
  const user = await userRepository.findByUserid(userid);
  if (!user) {
    //존재하지 않는 사용자 아이디 입력시 사용자에게 메세지 출력
    return res
      .status(200)
      .send(
        `<script>alert('존재하지 않는 사용자아이디입니다.'); location.href='/';</script>`
      );
  }
  const isValidPasswd = await bcrypt.compare(passwd, user.passwd);
  if (!isValidPasswd) {
    //비밀번호가 틀렸을시 사용자에게 메세지 출력
    return res
      .status(200)
      .send(
        `<script>alert('비밀번호가 틀렸습니다.'); location.href='/';</script>`
      );
  }

  const token = await createJwtToken(user.id);
  res.cookie("token", token, {
    httpOnly: false, //JS에서 document.cookie로 접근 가능하게
    maxAge: 1000 * 60 * 60, // 1시간
  });
  res.redirect("/main");
}

//유저 인증
export async function verify(req, res, next) {
  const id = req.id;
  if (id) {
    res.status(200).json(id);
  } else {
    res.status(401).json({ message: "사용자 인증 실패" });
  }
}
export async function me(req, res, next) {
  const user = await userRepository.findByid(req.id);
  if (!user) {
    return res.status(404).json({ message: "일치하는 사용자가 없음" });
  }
  res.status(200).json({ token: req.token, userid: user.userid });
}

//아이디 찾기
export async function findID(req, res, next) {
  const { email } = req.body;
  const user = await userRepository.findByEmail(email);
  if (!user) {
    res.status(401).json(`${email} 해당하는 이메일이 없습니다.`);
  }
  res.status(200).json({ userid: user.userid });
}

// 6자리 인증번호 랜덤값 생성
function generateCode() {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6자리
}

//회원가입용 인증번호호 보내기
export async function sendSignupCode(req, res) {
  const { phone } = req.body;
  const code = generateCode();
  const sessionId = uuidv4(); // 고유 세션 키 생성

  try {
    await sendVerificationSMS(phone, code);
    smsCode.set(phone, { code, expiresAt: Date.now() + 3 * 60 * 1000 }); // 인증번호 유효시간 3분
    currentPhoneSessions.set(sessionId, phone); // 입력받은 전화번호를 sessionId로 phone 저장

    res.status(200).json({
      message: "인증번호 전송 완료",
      sessionId,
    });
  } catch (err) {
    console.error("SMS 전송 실패:", err);
    res.status(500).json({ message: "SMS 전송 실패", error: err });
  }
}

// 비밀번호 재설정용 인증번호 보내기
export async function sendCode(req, res) {
  const { phone } = req.body;
  const code = generateCode();
  const sessionId = uuidv4(); // 고유 세션 키 생성
  const foundphone = await userRepository.findByPhone(phone);
  if (!foundphone) {
    return res
      .status(409)
      .json({ message: `${phone}은 등록되지 않은 번호입니다.` });
  }

  try {
    await sendVerificationSMS(phone, code);
    smsCode.set(phone, { code, expiresAt: Date.now() + 3 * 60 * 1000 }); // 인증번호 유효시간 3분
    currentPhoneSessions.set(sessionId, phone); // 입력받은 전화번호를 sessionId로 phone 저장

    res.status(200).json({
      message: "인증번호 전송 완료",
      sessionId, // 프론트에 이걸 보내줘야 이후에 사용 가능
    });
  } catch (err) {
    console.error("SMS 전송 실패:", err);
    res.status(500).json({ message: "SMS 전송 실패", error: err });
  }
}

// 인증번호 확인
export async function verifyCode(req, res) {
  const { sessionId, code } = req.body;
  const phone = currentPhoneSessions.get(sessionId); // 세션에 저장된 번호 조회

  if (!phone) {
    return res.status(400).json({ message: "유효하지 않은 세션입니다." });
  }

  const record = smsCode.get(phone);
  if (!record || record.expiresAt < Date.now()) {
    return res.status(400).json({ message: "인증번호가 만료되었습니다." });
  }

  if (record.code !== code) {
    return res.status(401).json({ message: "인증번호가 일치하지 않습니다." });
  }

  record.verified = true;
  smsCode.set(phone, record);

  res.status(200).json({ message: "인증 성공", sessionId, verified: true }); // 프론트는 이 세션ID를 계속 사용(verified는 프론트에서 필요한 속성으로 true값을 같이 보내줌)
}

// 비밀번호 변경
export async function resetPassword(req, res) {
  const { sessionId, newPassword } = req.body;
  const phone = currentPhoneSessions.get(sessionId);

  if (!phone) {
    return res
      .status(403)
      .json({ message: "세션이 만료되었거나 유효하지 않습니다." });
  }

  const record = smsCode.get(phone);
  if (!record || !record.verified) {
    return res.status(403).json({ message: "전화번호 인증이 필요합니다." });
  }

  const user = await userRepository.findByPhone(phone);
  if (!user) {
    return res
      .status(404)
      .json({ message: "해당 전화번호의 사용자가 없습니다." });
  }

  const hashed = await bcrypt.hash(newPassword, bcryptSaltRounds);
  user.passwd = hashed;
  await user.save();

  // 인증 상태 정리
  currentPhoneSessions.delete(sessionId);
  smsCode.delete(phone);

  res.status(200).json({ message: "비밀번호가 성공적으로 변경되었습니다." });
}

//중복 확인후 회원 정보 변경
export async function updateUser(req, res) {
  const { newNickname, newPasswd, newEmail, newPhone } = req.body;
  const id = req.id;

  // 중복 검사 (변경된 값이 있는 경우만 체크)
  if (newEmail) {
    const foundEmail = await userRepository.findByEmail(newEmail);
    if (foundEmail && foundEmail.id !== id) {
      //이미 해당 이메일을을 가진 사용자가 존재하고, 그 사용자가 현재 로그인한 나 자신이 아닌 경우에만 중복으로 간주
      //foundPhone : 	DB에 해당 번호를 가진 유저가 있음
      //foundPhone.id !== id : 그 유저가 내가 아님
      return res.status(409).json({ message: `${newEmail}이 이미 있습니다.` });
    }
  }

  if (newPhone) {
    const foundPhone = await userRepository.findByPhone(newPhone);
    if (foundPhone && foundPhone.id !== id) {
      return res.status(409).json({ message: `${newPhone}이 이미 있습니다.` });
    }
  }

  if (newNickname) {
    const foundNickname = await userRepository.findByNickname(newNickname);
    if (foundNickname && foundNickname.id !== id) {
      return res
        .status(409)
        .json({ message: `${newNickname}이 이미 있습니다.` });
    }
  }

  const user = await userRepository.findByid(id);
  if (!user) {
    return res.status(404).json({ message: "인증되지 않은 사용자입니다." });
  }

  // 변경된 항목만 업데이트
  if (newNickname) user.nickname = newNickname;
  if (newEmail) user.email = newEmail;
  if (newPhone) user.phone = newPhone;
  if (newPasswd) {
    const hashed = await bcrypt.hash(newPasswd, bcryptSaltRounds);
    user.passwd = hashed;
  } // 새로운 비밀번호가 입력 되었을시에만 해시와 해서 다시 저장

  await user.save();
  return res
    .status(200)
    .json({ message: "회원정보가 성공적으로 변경되었습니다." });
}

// 사용자 개인정보 보내주기
export async function getMe(req, res) {
  const id = req.id;
  const user = await userRepository.findByid(id);
  if (!user)
    return res.status(404).json({ message: "사용자를 찾을 수 없습니다." });

  res.json({
    nickname: user.nickname,
    email: user.email,
    phone: user.phone,
  });
}

//친구 추가용 함수
export async function addFriend(req, res) {
  const { friendNickname } = req.body;
  const Id = req.id;
  if (!friendNickname) {
    return res
      .status(400)
      .json({ message: "추가할 친구의 닉네임이 필요합니다." });
  }
  const user = await userRepository.findByid(Id);
  const friendUser = await userRepository.findByNickname(friendNickname);
  if (!user || !friendUser) {
    return res
      .status(404)
      .json({ message: "사용자 또는 친구 대상이 존재하지 않습니다." });
  }
  if (user.nickname === friendNickname) {
    return res
      .status(400)
      .json({ message: "자기 자신은 친구로 추가할 수 없습니다." });
  }
  if (user.friend && user.friend.includes(friendUser.userid)) {
    return res.status(409).json({ message: "이미 친구로 추가되어 있습니다." });
  }
  user.friend = [...(user.friend || []), friendUser.userid];
  await user.save();
  res
    .status(200)
    .json({ message: `${friendNickname}님을 친구로 추가했습니다.` });
}

// 친구 목록 조회용 함수
export async function getFriends(req, res) {
  const id = req.id;
  const user = await userRepository.findByid(id);

  if (!user) {
    return res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
  }

  //친구 목록이 없는 경우
  if (!user.friend || user.friend.length === 0) {
    return res.status(200).json({ friends: [] });
  }

  const friends = await Promise.all(
    user.friend.map(async (friendUserid) => {
      const friend = await userRepository.findByUserid(friendUserid);
      return friend ? friend.nickname : null;
    })
  );

  // null 제거
  const filteredNicknames = friends.filter((nickname) => nickname !== null);

  res.status(200).json({ friends: filteredNicknames });
}

// 친구 삭제용 함수
export async function removeFriend(req, res) {
  const { friendNickname } = req.body;
  const id = req.id;

  if (!friendNickname) {
    return res
      .status(400)
      .json({ message: "삭제할 친구의 닉네임이 필요합니다." });
  }

  const user = await userRepository.findByid(id);
  const friendUser = await userRepository.findByNickname(friendNickname);

  if (!user || !friendUser) {
    return res
      .status(404)
      .json({ message: "사용자 또는 삭제할 친구가 존재하지 않습니다." });
  }

  const friendUserid = friendUser.userid;
  if (!user.friend || !user.friend.includes(friendUserid)) {
    return res
      .status(404)
      .json({ message: `${friendNickname}님은 친구 목록에 없습니다.` });
  }

  // 친구 목록에서 해당 userid 제거
  user.friend = user.friend.filter((fid) => fid !== friendUserid);
  await user.save();

  res
    .status(200)
    .json({ message: `${friendNickname}님이 친구 목록에서 삭제되었습니다.` });
}

//userid와 닉네임 매칭
export async function getUserMap(req, res) {
  try {
    const users = await userRepository.findAllUsers();

    // { userid: nickname } 형태로 변환
    const userMap = {};
    users.forEach((user) => {
      userMap[user.userid] = user.nickname;
    });

    res.json(userMap);
  } catch (err) {
    console.error("유저 매핑 실패:", err);
    res.status(500).json({ message: "유저 정보를 가져오는 데 실패했습니다." });
  }
}

//닉네임으로 userid 매칭
export async function nicknamesToIds(req, res) {
  try {
    const { nicknames } = req.body; // ["닉네임1", "닉네임2", ...]

    if (!Array.isArray(nicknames) || nicknames.length === 0) {
      return res.status(400).json({ message: "닉네임 배열이 필요합니다." });
    }

    const users = await userRepository.find(
      { nickname: { $in: nicknames } },
      "userid nickname"
    );

    const userids = users.map((user) => user.userid); // ID만 추출
    res.json({ userids });
  } catch (err) {
    console.error("닉네임 -> ID 변환 실패:", err);
    res.status(500).json({ message: "서버 오류 발생" });
  }
}
