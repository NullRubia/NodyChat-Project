import * as chatroomRepository from "../data/chatRoom.mjs";
import * as userRepository from "../data/users.mjs";
import * as messageRepository from "../data/message.mjs";
import { io, connectedUsers } from "../WebChattingApp.mjs";

// 채팅방을 생성하는 함수
export async function createChatRooms(req, res) {
  try {
    const id = req.id; // 로그인한 사용자의 DB _id
    const user = await userRepository.findByid(id); // 사용자 정보 조회
    if (!user) {
      return res
        .status(404)
        .json({ message: "올바르지 않은 사용자 정보입니다." });
    }

    const { name, members } = req.body;
    if (!name || !Array.isArray(members) || members.length === 0) {
      return res
        .status(400)
        .json({ message: "채팅상대를 한명이상 선택해주세요." });
    }

    const allMembers = [...new Set([...members, user.userid])]; // 본인 포함, 중복 제거

    // 존재하지 않는 사용자 여부 확인
    const results = await Promise.all(
      allMembers.map((userid) => userRepository.findByUserid(userid))
    );

    if (results.some((u) => !u)) {
      return res.status(400).json({
        message:
          "존재하지 않는 사용자가 포함되어 있어 채팅방을 생성할 수 없습니다.",
      });
    }

    const newRoom = await chatroomRepository.createRoom({
      name,
      members: allMembers,
    });
    // nicknames 정의 추가
    const users = await Promise.all(
      newRoom.members.map((userId) => userRepository.findByUserid(userId))
    );
    const nicknames = users.map((user) => user.nickname);

    // 소켓 알림 추가
    for (const userid of allMembers) {
      const socketId = connectedUsers[userid];
      console.log("emit 대상:", userid, "→", socketId);
      if (socketId) {
        io.to(socketId).emit("newChatRoom", {
          _id: newRoom._id,
          name: newRoom.name,
        });
        console.log("📡 emit 전송 room 데이터:", {
          _id: newRoom._id,
          name: newRoom.name,
        });
        io.to(socketId).emit("memberListUpdated", {
          roomId: newRoom._id.toString(),
          nicknames,
        });
        console.log("✅ newRoom 전체:", newRoom);
      }
    }

    res.status(201).json(newRoom);
  } catch (err) {
    console.error("createChatRooms error:", err);
    res.status(500).json({ message: "Server error" });
  }
}

//로그인한 사용자의 채팅방을 찾아서 리턴하는 함수
export async function getUserChatRooms(req, res) {
  try {
    const id = req.id; // 로그인한 사용자의 DB _id
    const user = await userRepository.findByid(id); // 사용자 정보 조회
    if (!user) {
      return res
        .status(404)
        .json({ message: "올바르지 않은 사용자 정보입니다." });
    }

    const rooms = await chatroomRepository.findByMember(user.userid); // 유저 아이디 기반으로 채팅방 조회
    res.status(200).json(rooms); // 채팅방 리스트 응답
  } catch (err) {
    console.error("getUserChatRooms error:", err);
    res.status(500).json({ message: "서버응답 에러" });
  }
}

//채팅방 초대하기
export async function inviteToChatRoom(req, res) {
  try {
    const id = req.id;
    const inviter = await userRepository.findByid(id);
    if (!inviter) {
      return res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
    }

    const { roomId, InviteUser } = req.body;

    if (!roomId || !Array.isArray(InviteUser) || InviteUser.length === 0) {
      return res
        .status(400)
        .json({ message: "roomId와 초대할 사용자 배열이 필요합니다." });
    }

    const room = await chatroomRepository.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: "채팅방을 찾을 수 없습니다." });
    }

    // 초대자는 해당 채팅방 멤버여야 함
    if (!room.members.includes(inviter.userid)) {
      return res
        .status(403)
        .json({ message: "해당 채팅방의 멤버만 초대할 수 있습니다." });
    }

    // 초대 대상 전원 존재하는지 확인
    const users = await Promise.all(
      InviteUser.map((userid) => userRepository.findByUserid(userid))
    );
    const invalidUsers = InviteUser.filter((_, index) => !users[index]);

    if (invalidUsers.length > 0) {
      return res.status(400).json({
        message: `존재하지 않는 사용자: ${invalidUsers.join(", ")}`,
      });
    }

    // 중복 제거 및 기존 멤버 제외
    const newMembers = InviteUser.filter(
      (userid) => !room.members.includes(userid)
    );
    const updatedMembers = [...room.members, ...newMembers];
    await chatroomRepository.updateRoomMembers(roomId, updatedMembers);
    // 새롭게 갱신된 방 정보 다시 가져오기
    const updatedRoom = await chatroomRepository.findById(roomId);

    // 전체 멤버 닉네임 조회
    const allUsers = await Promise.all(
      updatedRoom.members.map((userid) => userRepository.findByUserid(userid))
    );
    const nicknames = allUsers.map((u) => u.nickname);

    // 1. 초대 대상에게 newChatRoom 이벤트
    for (const userid of newMembers) {
      const socketId = connectedUsers[userid];
      if (socketId) {
        io.to(socketId).emit("newChatRoom", {
          _id: updatedRoom._id,
          name: updatedRoom.name,
        });
      }
    }

    // 2. 전체 참가자에게 memberListUpdated 이벤트
    for (const userid of updatedRoom.members) {
      const socketId = connectedUsers[userid];
      if (socketId) {
        io.to(socketId).emit("memberListUpdated", {
          roomId: updatedRoom._id.toString(),
          nicknames,
        });
      }
    }
    res
      .status(200)
      .json({ message: `${newMembers.length}명 초대 완료`, newMembers });
  } catch (err) {
    console.error("inviteToChatRoom error:", err);
    res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
}

//채팅방 참가자 목록 보내주기
export async function members(req, res) {
  try {
    const roomId = req.query.roomId;
    const room = await chatroomRepository.findById(roomId);

    if (!room || !room.members) {
      return res.status(404).json({ message: "채팅방을 찾을 수 없습니다." });
    }

    // userId 배열을 순회하며 nickname을 수집
    const nicknamePromises = room.members.map((userId) =>
      userRepository.findByUserid(userId).then((user) => user?.nickname)
    );

    const nicknames = (await Promise.all(nicknamePromises)).filter(Boolean); // null 제거
    res.json(nicknames);
  } catch (err) {
    console.error("🔴 참가자 목록 조회 실패:", err);
    res.status(500).json({ message: "서버 오류" });
  }
}

//채팅방 나가기 및 더이상 채팅방에 채팅할 멤버가 존재하지 않을시 채팅방 삭제
export async function leaveChatRoom(req, res) {
  try {
    const id = req.id; //로그인한 사용자의 id 받아오기
    const user = await userRepository.findByid(id); //id로 로그인한 사용자 찾기
    if (!user) {
      return res.status(404).json({ message: "사용자를 찾을 수 없습니다." });
    }

    const { roomId } = req.body; //채팅방 id 입력받기
    if (!roomId) {
      return res.status(400).json({ message: "채팅방 ID가 필요합니다." });
    }

    const room = await chatroomRepository.findById(roomId); //id로 채팅방 찾기
    if (!room) {
      return res
        .status(404)
        .json({ message: "해당 채팅방이 존재하지 않습니다." });
    }

    //본인이 해당 채팅방 멤버인지 확인
    if (!room.members.includes(user.userid)) {
      return res
        .status(403)
        .json({ message: "해당 채팅방의 멤버가 아닙니다." });
    }

    //본인을 제외한 멤버로 채팅방 멤버를 업데이트
    const updatedMembers = room.members.filter((m) => m !== user.userid);

    //본인이 나간 후 채팅방 멤버가 1명 이하일 경우 채팅방 삭제, 2명 이상일 경우 채팅방 멤버 업데이트
    if (updatedMembers.length < 2) {
      await chatroomRepository.deleteRoomById(room._id); //채팅방 삭제
      await messageRepository.deleteMessagesByRoomId(roomId); // 채팅방 삭제시 메세지도 함께 삭제
      return res.status(200).json({ message: "채팅방이 삭제되었습니다." });
    } else {
      await chatroomRepository.updateRoomMembers(room._id, updatedMembers);
      return res.status(200).json({ message: "채팅방을 나갔습니다." });
    }
  } catch (err) {
    console.error("leaveChatRoom error:", err);
    res.status(500).json({ message: "서버 오류가 발생했습니다." });
  }
}
