import express from "express";
import * as chatRoomController from "../controller/chatRoom.mjs";
import { isAuth } from "../middleware/users.mjs";

const router = express.Router();

//채팅방 생성
router.post("/create", isAuth, chatRoomController.createChatRooms);
//로그인한 사용자의 채팅방 정보 출력
router.get("/get", isAuth, chatRoomController.getUserChatRooms);
//채팅방 초대
router.post("/invite", isAuth, chatRoomController.inviteToChatRoom);
//채팅방 나가기
router.post("/leave", isAuth, chatRoomController.leaveChatRoom);
//채팅방 참가자 목록 보여주기
router.get("/members", isAuth, chatRoomController.members);
export default router;
