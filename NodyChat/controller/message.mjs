import * as messageRepository from "../data/message.mjs";
import * as userRepository from "../data/users.mjs";
import * as chatroomRepository from "../data/chatRoom.mjs";

/**
 * [공통 로직] 메시지 저장 함수
 * - 소켓 통신 및 REST API 모두에서 사용 가능
 * - senderId: 로그인한 사용자의 DB _id
 * - chatroomId: 메시지를 보낼 채팅방 ID
 * - content: 메시지 내용
 */
export async function saveMessage({ senderId, chatroomId, content }) {
  const user = await userRepository.findByUserid(senderId); // 사용자 조회
  if (!user) throw new Error("사용자를 찾을 수 없습니다.");

  const room = await chatroomRepository.findById(chatroomId); // 채팅방 조회
  if (!room) throw new Error("채팅방이 존재하지 않습니다.");

  // 사용자가 해당 채팅방의 멤버인지 확인
  if (!room.members.includes(user.userid)) {
    throw new Error("해당 채팅방에 참여하고 있지 않습니다.");
  }

  // 메시지 저장 및 반환
  return await messageRepository.createMessage({
    chatroom: chatroomId,
    sender: user.userid,
    content,
  });
}

// [REST API] 채팅메세지 보내기
export async function sendMessage(req, res) {
  try {
    const id = req.id; // 로그인한 사용자 DB _id
    const { chatroomId, content } = req.body; // 채팅방 ID와 메시지 내용 받기
    console.log("[sendMessage] 요청 받음:", { id, chatroomId, content });

    if (!chatroomId || !content) {
      return res
        .status(400)
        .json({ message: "채팅방 ID와 메시지 내용을 입력해주세요." });
    }

    // 공통 메시지 저장 함수 호출
    const saved = await saveMessage({ senderId: id, chatroomId, content });
    res.status(201).json(saved);
  } catch (err) {
    console.error("sendMessage error:", err);
    res
      .status(500)
      .json({ message: err.message || "메시지를 저장하는 중 서버 오류" });
  }
}

// [REST API] 채팅메세지 불러오기
export async function getChatRoomMessages(req, res) {
  try {
    const id = req.id; // 로그인한 사용자 DB _id
    console.log("[getChatRoomMessages] 사용자 ID:", id);
    const user = await userRepository.findByid(id); // 사용자 정보 조회
    if (!user) {
      return res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
    }

    const { chatroomId } = req.body; // 채팅방 ID 받기

    // 본인이 참여한 채팅방에 대해서만 불러오기 가능
    const room = await chatroomRepository.findById(chatroomId);
    if (!room || !room.members.includes(user.userid)) {
      return res.status(403).json({ message: "채팅방 접근 권한이 없습니다." });
    }

    // 메시지 목록 정렬된 순서로 불러오기
    const messages = await messageRepository.getMessagesByRoomId(chatroomId);
    res.status(200).json(messages);
  } catch (err) {
    console.error("getChatRoomMessages error:", err);
    res.status(500).json({ message: "메시지를 가져오는 중 오류 발생" });
  }
}
