import Mongoose from "mongoose";
import { useVirtualId } from "../db/database.mjs";

const userSchema = new Mongoose.Schema(
  {
    nickname: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true, unique: true },
    userid: { type: String, required: true, unique: true },
    passwd: { type: String, required: true },
    image: String,
    friend: [{ type: String }], // userid 배열로 저장
    createdAt: { type: Date, default: Date.now },
    friendRequests: [
      { type: Mongoose.Schema.Types.ObjectId, ref: "User", default: [] },
    ],
    friends: [
      { type: Mongoose.Schema.Types.ObjectId, ref: "User", default: [] },
    ],
    //   {type: String, default: Date.now}
  },
  // 버전키 false
  { versionKey: false }
);

useVirtualId(userSchema);

const User = Mongoose.model("User", userSchema);

// 유저 생성
export async function createUser(user) {
  return new User(user).save().then((data) => data.id);
}

//이메일로 해당하는 유저 찾기
export async function findByEmail(email) {
  return User.findOne({ email });
}
//유저 아이디로 해당하는 유저 찾기
export async function findByUserid(userid) {
  return User.findOne({ userid });
}
//닉네임으로 유저 찾기
export async function findByNickname(nickname) {
  return User.findOne({ nickname });
}

//_id로 해당하는 유저 찾기
export async function findByid(id) {
  return User.findById(id);
}
// 폰번호로 해당하는 유저 찾기
export async function findByPhone(phone) {
  return User.findOne({ phone });
}

//전체 유저를 조회해서 userid와 nickname만 보내주기
export async function findAllUsers() {
  return User.find({}, "userid nickname");
}
// 조건에 맞는 여러 유저 조회
export async function find(query, projection) {
  return User.find(query, projection);
}
