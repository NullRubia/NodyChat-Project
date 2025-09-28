import Mongoose from "mongoose";
import { useVirtualId } from "../db/database.mjs";

const messgeSchema = new Mongoose.Schema(
  {
    chatroom: { type: String, required: true },
    sender: { type: String, required: true },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  // 버전키 false
  { versionKey: false }
);

useVirtualId(messgeSchema);

const Message = Mongoose.model("Messge", messgeSchema);

//메세지 생성하기
export async function createMessage(data) {
  return new Message(data).save();
}
//채팅방 정보로 메세지 가져오기
export async function getMessagesByRoomId(chatroomId) {
  return Message.find({ chatroom: chatroomId }).sort({ createdAt: 1 });
}
//채팅방 id로 메세지 삭제
export function deleteMessagesByRoomId(chatroomId) {
  return Message.deleteMany({ chatroom: chatroomId });
}
