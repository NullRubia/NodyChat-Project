import Mongoose from "mongoose";
import { useVirtualId } from "../db/database.mjs";

const roomSchema = new Mongoose.Schema(
  {
    name: { type: String, required: true },
    members: {
      type: [{ type: String, required: true }],
      required: true,
    }, // 참가자 userid 배열로 저장
    createdAt: { type: Date, default: Date.now },
  },
  // 버전키 false
  { versionKey: false }
);

useVirtualId(roomSchema);

const Room = Mongoose.model("Room", roomSchema);

//채팅방을 생성하는 함수
export async function createRoom(data) {
  return await new Room(data).save();
}
//포함된 멤버를 기준으로 채팅방을 찾는 함수
export async function findByMember(userid) {
  return Room.find({ members: userid });
}
//채팅방 id로 채팅방 찾기
export async function findById(id) {
  return Room.findById(id);
}
//채팅방 id로 채팅방 삭제
export async function deleteRoomById(id) {
  return Room.findByIdAndDelete(id);
}
// 채팅방 멤버 업데이트
export async function updateRoomMembers(id, members) {
  return Room.findByIdAndUpdate(id, { members });
}
