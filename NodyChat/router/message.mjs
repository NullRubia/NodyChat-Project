import express from "express";
import * as messageController from "../controller/message.mjs";
import { isAuth } from "../middleware/users.mjs";

const router = express.Router();

//채팅 보내기
router.post("/send", isAuth, messageController.sendMessage);
//채팅 불러오기
router.post("/load", isAuth, messageController.getChatRoomMessages);
export default router;
