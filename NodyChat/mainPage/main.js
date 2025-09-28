// 페이지 로드시 사용자 정보 불러오기 등 초기화
window.addEventListener("DOMContentLoaded", () => {
  loadUserInfo();
  setupEditButton();
  loadChatRooms();
  setupNewChatButton();

  //페이지 진입 시 socket 연결
  initializeSocketForNewRoom();
});

async function loadUserInfo() {
  // 서버에서 현재 로그인한 사용자의 정보 가져오기
  const res = await fetch("/user/me", { credentials: "include" }); // 쿠키 포함
  const data = await res.json();

  //사용자 정보 로딩시 내 닉네임 저장
  myNickname = data.nickname;

  // 가져온 데이터를 마이페이지의 해당 요소에 표시
  document.querySelector(".nickname").textContent = data.nickname;
  document.querySelector(".email").textContent = data.email;
  document.querySelector(".phone").textContent = data.phone;
}

//쿠키에서 토큰 정보 가져오기
function getTokenFromCookie(name = "token") {
  const cookie = document.cookie
    .split("; ")
    .find((row) => row.startsWith(name + "="));
  return cookie ? cookie.split("=")[1] : null;
}

// 사용자 정보 수정 버튼과 관련된 이벤트 설정
function setupEditButton() {
  const editBtn = document.querySelector(".edit-btn"); // 수정 버튼
  let editing = false; // 수정 중인지 여부
  let currentData = {}; // 현재 정보 저장

  editBtn.addEventListener("click", () => {
    if (!editing) {
      // 수정 모드로 전환
      editing = true;
      editBtn.textContent = "저장하기";

      // 현재 정보를 저장
      currentData = {
        nickname: document.querySelector(".nickname").textContent,
        email: document.querySelector(".email").textContent,
        phone: document.querySelector(".phone").textContent,
      };

      // 각 정보 항목을 input 요소로 변경
      ["nickname", "email", "phone"].forEach((field) => {
        const h3 = document.querySelector(`.${field}`);
        const input = document.createElement("input");
        input.value = h3.textContent;
        input.id = `new${field.charAt(0).toUpperCase() + field.slice(1)}`; // newNickname 등
        h3.replaceWith(input);
      });

      // 비밀번호 변경 필드 보이기
      document.querySelector(".edit-fields").style.display = "block";
    } else {
      // 저장 모드 - 수정된 정보 수집
      const newNickname = document.getElementById("newNickname").value.trim();
      const newEmail = document.getElementById("newEmail").value.trim();
      const newPhone = document.getElementById("newPhone").value.trim();
      const newPasswd = document.getElementById("newPasswd").value;
      const confirmPasswd = document.getElementById("confirmPasswd").value;

      // 비밀번호 확인 불일치 시 중단
      if (newPasswd && newPasswd !== confirmPasswd) {
        alert("비밀번호가 일치하지 않습니다!");
        return;
      }

      // 변경된 정보만 모아 객체 생성
      const updateData = {};
      if (newNickname && newNickname !== currentData.nickname)
        updateData.newNickname = newNickname;
      if (newEmail && newEmail !== currentData.email)
        updateData.newEmail = newEmail;
      if (newPhone && newPhone !== currentData.phone)
        updateData.newPhone = newPhone;
      if (newPasswd) updateData.newPasswd = newPasswd;

      // 변경사항이 없으면 원상복구
      if (Object.keys(updateData).length === 0) {
        alert("변경된 정보가 없습니다.");
        editing = false;
        editBtn.textContent = "내 정보 수정";

        // input을 다시 h3로 복원
        ["nickname", "email", "phone"].forEach((field) => {
          const input = document.getElementById(
            `new${field.charAt(0).toUpperCase() + field.slice(1)}`
          );
          const h3 = document.createElement("h3");
          h3.className = field;
          h3.textContent = currentData[field];
          input.replaceWith(h3);
        });

        // 비밀번호 입력창 숨김
        document.querySelector(".edit-fields").style.display = "none";
        return;
      }

      // 서버에 수정된 정보 전송
      fetch("/user/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(updateData),
      })
        .then(async (res) => {
          const data = await res.json();
          if (res.status === 200) {
            alert(data.message); // 성공 시 메시지 표시
          } else if (res.status === 409) {
            alert(data.message); // 중복 등 충돌 메시지
          } else {
            alert("오류가 발생했습니다.");
          }
        })
        .then(() => {
          location.reload(); // 새로고침으로 변경된 내용 반영
        })
        .catch((err) => alert(err.message));
    }
  });
}

// DOM 로딩 완료 후 사이드 메뉴 이벤트 연결(개인정보, 친구관리)
document.addEventListener("DOMContentLoaded", () => {
  const personalInfoBtn = document.querySelector(".mypage-side-item1"); // 개인 정보
  const friendManageBtn = document.querySelector(".mypage-side-item2"); // 친구 관리
  const mypageMain = document.querySelector(".mypage-main");

  // 친구 관리 버튼 클릭 시 친구 목록 렌더링
  friendManageBtn.addEventListener("click", () => {
    renderFriendList(mypageMain);
  });

  // 개인 정보 버튼 클릭 시 서버에서 정보 재요청 → 다시 그리기
  personalInfoBtn.addEventListener("click", async () => {
    try {
      const res = await fetch("/user/me", { credentials: "include" });
      const data = await res.json();

      // 마이페이지 영역에 사용자 정보 HTML 렌더링
      mypageMain.innerHTML = `
        <div class="profile-icon">👤</div>
        <div class="info-list">
          <h2>닉네임</h2>
          <h3 class="nickname">${data.nickname}</h3>
          <h2>이메일</h2>
          <h3 class="email">${data.email}</h3>
          <h2>폰번호</h2>
          <h3 class="phone">${data.phone}</h3>
          <div class="edit-fields" style="display: none">
            <h2>새 비밀번호</h2>
            <input
              type="password"
              id="newPasswd"
              placeholder="변경하지 않을시 공백"
            />
            <h2>비밀번호 확인</h2>
            <input
              type="password"
              id="confirmPasswd"
              placeholder="변경하지 않을시 공백"
            />
          </div>
        </div>
        <button class="edit-btn">내 정보 수정</button>
      `;

      // 수정 버튼 이벤트 설정
      setupEditButton();
    } catch (err) {
      console.error(err);
      alert("개인 정보를 불러오는 데 실패했습니다.");
    }
  });
});

// 친구 목록 탭 렌더링 함수
async function renderFriendList(mypageMain) {
  try {
    // 친구 목록 요청
    const res = await fetch("/user/get-friend", { credentials: "include" });
    const data = await res.json(); // data = { friends: [...] }
    const friends = data.friends; // friends만 꺼냄

    // HTML 생성
    let html = `
      <div class="profile-icon">👥</div>
      <div class="info-list">
        <h2>친구 목록</h2>
        <ul class="friend-list">
          ${friends
            .map(
              (f) =>
                `<li>
                  ${f} 
                  <button class="delete-friend-btn" data-nickname="${f}">삭제</button>
                </li>`
            )
            .join("")}
        </ul>
        <input type="text" id="newFriend" placeholder="닉네임으로 친구 추가" />
        <button id="addFriendBtn">친구 추가</button>
      </div>
    `;

    // 마이페이지에 출력
    mypageMain.innerHTML = html;

    // 친구 추가 버튼 클릭 이벤트
    document
      .querySelector("#addFriendBtn")
      .addEventListener("click", async () => {
        const newFriend = document.querySelector("#newFriend").value;
        if (!newFriend) return alert("닉네임을 입력해주세요.");

        try {
          const res = await fetch("/user/add-friend", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ friendNickname: newFriend }),
          });

          const data = await res.json();

          if (res.ok) {
            alert(data.message);
            renderFriendList(mypageMain); //추가후 목록 갱신
          } else {
            alert(data.message);
          }
        } catch (err) {
          console.error(err);
          alert("친구 추가 중 오류가 발생했습니다.");
        }
      });

    // 친구 삭제 버튼 클릭 이벤트
    document.querySelectorAll(".delete-friend-btn").forEach((btn) => {
      btn.addEventListener("click", async (e) => {
        const nicknameToDelete = e.target.dataset.nickname;

        if (!confirm(`${nicknameToDelete}님을 친구 목록에서 삭제하시겠습니까?`))
          return;

        try {
          const res = await fetch("/user/remove-friend", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ friendNickname: nicknameToDelete }),
          });

          const data = await res.json();

          if (res.ok) {
            alert(data.message);
            renderFriendList(mypageMain); // 삭제 후 목록 갱신
          } else {
            alert(data.message);
          }
        } catch (err) {
          console.error(err);
          alert("친구 삭제 중 오류가 발생했습니다.");
        }
      });
    });
  } catch (err) {
    console.error(err);
    alert("친구 목록을 불러오는 데 실패했습니다.");
  }
}

//마이페이지에 사용자 정보 띄우기
//1. 마이페이지버튼 클릭시 동작
document.addEventListener("DOMContentLoaded", () => {
  const mypageBtn = document.querySelector(".mypage-btn");
  mypageBtn.addEventListener("click", async () => {
    const chatContent = document.querySelector(".chat-content");
    const mypageHTML = await getMypageHTML(); // 마이페이지 HTML 문자열
    chatContent.innerHTML = mypageHTML;

    setupEditButton(); // 수정 버튼 연결

    // ✅ 사이드 메뉴 버튼 이벤트도 여기서 다시 연결
    const personalInfoBtn = document.querySelector(".mypage-side-item1");
    const friendManageBtn = document.querySelector(".mypage-side-item2");
    const mypageMain = document.querySelector(".mypage-main");

    personalInfoBtn.addEventListener("click", async () => {
      try {
        const res = await fetch("/user/me", { credentials: "include" });
        const data = await res.json();
        mypageMain.innerHTML = `
        <div class="profile-icon">👤</div>
        <div class="info-list">
          <h2>닉네임</h2>
          <h3 class="nickname">${data.nickname}</h3>
          <h2>이메일</h2>
          <h3 class="email">${data.email}</h3>
          <h2>폰번호</h2>
          <h3 class="phone">${data.phone}</h3>
          <div class="edit-fields" style="display: none">
            <h2>새 비밀번호</h2>
            <input type="password" id="newPasswd" placeholder="변경하지 않을시 공백" />
            <h2>비밀번호 확인</h2>
            <input type="password" id="confirmPasswd" placeholder="변경하지 않을시 공백" />
          </div>
        </div>
        <button class="edit-btn">내 정보 수정</button>
      `;
        setupEditButton(); // 수정 버튼 재연결
      } catch (err) {
        alert("개인 정보 불러오기 실패");
      }
    });

    friendManageBtn.addEventListener("click", () => {
      renderFriendList(mypageMain);
    });

    // 채팅방 active 해제
    document
      .querySelectorAll(".chat-room")
      .forEach((el) => el.classList.remove("active"));
  });
});
// 마이페이지 HTML 부분만 다시 가져오는 함수 (서버에서 사용자 정보 가져와서 HTML 구성)
async function getMypageHTML() {
  try {
    const res = await fetch("/user/me", { credentials: "include" });
    const data = await res.json();
    document.querySelector(".chat-header").innerHTML = `
      <div class="chat-header-title">마이 페이지</div>
      <button class="hamburger">&#9776;</button>
    `;
    //햄버거 버튼 이벤트 재연결
    const hamburger = document.querySelector(".hamburger");
    const sidebar = document.querySelector(".sidebar");

    if (hamburger && sidebar) {
      hamburger.addEventListener("click", () => {
        sidebar.classList.toggle("show");
      });
    }
    return `
      <div class="mypage">
        <div class="mypage-side">
          <h1>내 정보</h1>
          <h2 class="mypage-side-item1">개인 정보</h2>
          <hr />
          <h2 class="mypage-side-item2">친구 관리</h2>
          <a href="/" class="logout">로그 아웃</a>
        </div>
        <div class="mypage-main">
          <div class="profile-icon">
            <i class="fa-solid fa-user-tie"></i>
          </div>
          <div class="info-list">
            <h2>닉네임</h2>
            <h3 class="nickname">${data.nickname}</h3>
            <h2>이메일</h2>
            <h3 class="email">${data.email}</h3>
            <h2>폰번호</h2>
            <h3 class="phone">${data.phone}</h3>
            <div class="edit-fields" style="display: none">
              <h2>새 비밀번호</h2>
              <input type="password" id="newPasswd" placeholder="변경하지 않을시 공백" />
              <h2>비밀번호 확인</h2>
              <input type="password" id="confirmPasswd" placeholder="변경하지 않을시 공백" />
            </div>
          </div>
          <button class="edit-btn">내 정보 수정</button>
        </div>
      </div>
    `;
  } catch (err) {
    alert("마이페이지 정보를 불러오는 데 실패했습니다.");
    return "";
  }
}

// 2. 로그인한 사용자의 채팅방 목록 불러와서 .chat-list에 렌더링
async function loadChatRooms() {
  try {
    const res = await fetch("/chatRoom/get", { credentials: "include" });
    if (!res.ok) throw new Error("채팅방 목록 불러오기 실패");
    const data = await res.json();
    const chatListDiv = document.querySelector(".chat-list");
    chatListDiv.innerHTML = ""; // 기존 목록 초기화

    data.forEach((room) => {
      const roomEl = document.createElement("h3");
      roomEl.className = "chat-room";
      roomEl.textContent = room.name;
      roomEl.dataset.roomId = room._id;
      chatListDiv.appendChild(roomEl);
    });

    // 각 채팅방 클릭 시 이벤트 연결 (3번과 관련)
    setupChatRoomClick();
  } catch (err) {
    alert(err.message);
  }
}

// 채팅방 검색창에 검색시 검색한 채팅방만 필터링
document.addEventListener("DOMContentLoaded", () => {
  const searchInput = document.querySelector(".search-room input[type='text']");

  searchInput.addEventListener("input", () => {
    const keyword = searchInput.value.trim().toLowerCase();

    document.querySelectorAll(".chat-room").forEach((room) => {
      const roomName = room.textContent.toLowerCase();
      room.style.display = roomName.includes(keyword) ? "" : "none";
    });
  });
});

// 3. 채팅방 클릭 시 해당 채팅방 내용 불러와서 .chat-content에 출력
function setupChatRoomClick() {
  document.querySelectorAll(".chat-room").forEach((roomEl) => {
    roomEl.addEventListener("click", async () => {
      // 선택한 방 active 표시
      document
        .querySelectorAll(".chat-room")
        .forEach((el) => el.classList.remove("active"));
      roomEl.classList.add("active");

      const roomId = roomEl.dataset.roomId;

      // 마이페이지 영역 지우기
      const chatContent = document.querySelector(".chat-content");
      chatContent.innerHTML = "";

      // 서버에서 채팅 내용 불러오기
      try {
        // 1. 채팅 메시지 요청 (POST 방식)
        const res = await fetch("/message/load", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({ chatroomId: roomId }),
        });

        if (!res.ok)
          throw new Error(
            "채팅 내용을 불러오는데 실패했습니다. 페이지를 새로고침해서 채팅방이 삭제되었는지 확인하세요."
          );
        const messages = await res.json(); // 메시지 배열

        // 2. 사용자 nickname 매핑 요청
        const userRes = await fetch("/user/user-map", {
          credentials: "include",
        });
        const userMap = await userRes.json(); // 예: { "kim0527": "kim", .... }

        // 3. 채팅 헤더 설정
        const activeRoom = document.querySelector(".chat-room.active");
        if (!activeRoom) {
          alert("채팅방이 선택되지 않았습니다.");
          return;
        }
        const chatroomId = activeRoom.dataset.roomId;
        const memberRes = await fetch(
          `/chatRoom/members?roomId=${chatroomId}`,
          {
            credentials: "include",
          }
        );
        const members = await memberRes.json();
        socket.on(
          "memberListUpdated",
          ({ roomId: updatedRoomId, nicknames }) => {
            const activeRoom = document.querySelector(".chat-room.active");
            if (!activeRoom || activeRoom.dataset.roomId !== updatedRoomId)
              return;
            const chatHeader = document.querySelector(".chat-header");
            const headerMain = chatHeader.querySelector("div");
            if (headerMain) {
              const roomName = activeRoom.textContent.trim();
              headerMain.innerHTML = `
      ${roomName} 채팅방 | 👥 참가자: ${nicknames.join(", ")}
    `;
            }
          }
        );
        const chatHeader = document.querySelector(".chat-header");
        chatHeader.innerHTML = `
          <div>${roomEl.textContent} 채팅방 | 👥 참가자: ${members.join(
          ", "
        )}</div>
          
          <div class="chat-header-actions">
            <button class="invite-btn">초대</button>
            <button class="leave-btn">나가기</button>
            <button class="hamburger">&#9776;</button>
          </div>
        `;
        //햄버거 버튼 이벤트 재연결
        const hamburger = document.querySelector(".hamburger");
        const sidebar = document.querySelector(".sidebar");

        if (hamburger && sidebar) {
          hamburger.addEventListener("click", () => {
            sidebar.classList.toggle("show");
          });
        }
        // 채팅방 나가기 버튼 연결
        chatHeader
          .querySelector(".leave-btn")
          .addEventListener("click", async () => {
            if (!confirm("정말 이 채팅방을 나가시겠습니까?")) return;

            const activeRoom = document.querySelector(".chat-room.active");
            if (!activeRoom) {
              alert("채팅방이 선택되지 않았습니다.");
              return;
            }

            const roomId = activeRoom.dataset.roomId;

            try {
              const res = await fetch("/chatRoom/leave", {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                credentials: "include",
                body: JSON.stringify({ roomId }),
              });

              if (!res.ok) throw new Error("채팅방 나가기 실패");

              alert("채팅방을 나갔습니다.");

              // UI에서 채팅방 제거 또는 비활성화 처리
              activeRoom.remove();
              document.querySelector(".chat-content").innerHTML = "";

              chatHeader.innerHTML = `
                <div>채팅방을 선택해 주세요</div>
                <div class="chat-header-actions">
                  <button class="hamburger">&#9776;</button>
                </div>
              `;
              //햄버거 버튼 이벤트 재연결
              const hamburger = document.querySelector(".hamburger");
              const sidebar = document.querySelector(".sidebar");

              if (hamburger && sidebar) {
                hamburger.addEventListener("click", () => {
                  sidebar.classList.toggle("show");
                });
              }
            } catch (err) {
              alert(err.message);
            }
          });

        // 4. 채팅방내의 친구 초대
        chatHeader
          .querySelector(".invite-btn")
          .addEventListener("click", async () => {
            try {
              // 1. 서버에서 친구 목록(닉네임 배열) 받아오기
              const res = await fetch("/user/get-friend", {
                credentials: "include", // 쿠키 포함 요청
              });
              if (!res.ok) throw new Error("친구 목록 불러오기 실패");

              const data = await res.json();
              const friendNicknames = data.friends; // 닉네임 배열 예: ["kim", "lee", "park"]
              console.log("get-friend 응답:", friendNicknames);

              // 2. 초대 모달 띄우기 및 친구 리스트 초기화
              const modal = document.getElementById("invite-modal");
              const friendList = modal.querySelector(".friend-list");
              friendList.innerHTML = ""; // 기존 목록 초기화

              // 3. 닉네임 목록을 체크박스 목록으로 변환하여 모달에 추가
              friendNicknames.forEach((nickname) => {
                const div = document.createElement("div");
                div.innerHTML = `
          <label>
            <input type="checkbox" name="invitees" value="${nickname}">
            ${nickname}
          </label>
        `;
                friendList.appendChild(div);
              });

              // 4. 모달 보이기 (숨김 해제)
              modal.classList.remove("hidden");

              // 5. 초대 확인 버튼 이벤트 핸들러 등록
              document
                .querySelector(".invite-submit-btn")
                .addEventListener("click", async (e) => {
                  e.preventDefault(); // 폼 제출 기본 동작 막기

                  // 6. 체크된 친구 닉네임들 수집
                  const checked = document.querySelectorAll(
                    'input[name="invitees"]:checked'
                  );
                  const selectedNicknames = Array.from(checked).map(
                    (el) => el.value
                  );

                  // 7. 선택된 친구 없으면 경고 후 종료
                  if (selectedNicknames.length === 0) {
                    alert("초대할 친구를 선택해주세요.");
                    return;
                  }

                  // 8. 현재 활성화된 채팅방 찾기 (초대할 방 ID 확인용)
                  const activeRoom =
                    document.querySelector(".chat-room.active");
                  if (!activeRoom) {
                    alert("채팅방이 선택되지 않았습니다.");
                    return;
                  }
                  const chatroomId = activeRoom.dataset.roomId;

                  try {
                    // 9. 닉네임 배열을 서버에 보내 userId 배열로 변환 요청
                    const resIds = await fetch("/user/nicknames-to-ids", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      credentials: "include",
                      body: JSON.stringify({ nicknames: selectedNicknames }),
                    });

                    if (!resIds.ok) throw new Error("닉네임 변환 실패");

                    // 10. 변환된 userId 배열 받기
                    const { userids } = await resIds.json();

                    // 11. userId 배열과 채팅방 ID를 포함해 초대 API 호출
                    const inviteRes = await fetch("/chatRoom/invite", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      credentials: "include",
                      body: JSON.stringify({
                        roomId: chatroomId,
                        InviteUser: userids,
                      }),
                    });

                    if (!inviteRes.ok) throw new Error("초대 실패");

                    // 12. 초대 성공 알림 및 모달 닫기
                    alert("초대 완료!");
                    modal.classList.add("hidden");
                    // 4-1. 취소 버튼 이벤트 핸들러 등록
                    const cancelBtn = modal.querySelector(".invite-cancel-btn");
                    cancelBtn.addEventListener("click", () => {
                      modal.classList.add("hidden");
                    });
                  } catch (err) {
                    // 오류 발생 시 경고창 띄우기
                    alert(err.message);
                  }
                });
            } catch (err) {
              // 친구 목록 불러오기 실패 시 경고창 띄우기
              alert(err.message);
            }
          });

        // 메시지 렌더링
        messages.forEach(({ sender, content, createdAt }) => {
          const msgDiv = document.createElement("div");
          msgDiv.classList.add("chat-message");

          const nickname = userMap[sender] || sender; // 못 찾으면 sender(userId) 그대로
          //샌더가 본인일 경우 mine클래스 추가
          if (nickname === myNickname) {
            msgDiv.classList.add("mine");
          }

          msgDiv.innerHTML = `
          <div class="message-bubble">
            <strong class="sendernickname">${nickname}</strong>
            <div class="message-text">${content}</div>
            <span class="time">${new Date(
              createdAt
            ).toLocaleTimeString()}</span>
          </div>
          `;
          chatContent.appendChild(msgDiv);
        });
        scrollToBottom();

        setupSocket(roomId, chatContent); // 소켓 연결
      } catch (err) {
        alert(err.message);
      }
    });
  });
}

// 4. 채팅방 생성 버튼 클릭 시 친구 목록 띄우고 멤버 선택 후 채팅방 생성 요청 처리
function setupNewChatButton() {
  const newChatBtn = document.querySelector(".new-chat");
  newChatBtn.addEventListener("click", async () => {
    try {
      // 1. 친구 목록 받아오기 (닉네임 배열)
      const res = await fetch("/user/get-friend", { credentials: "include" });
      if (!res.ok) throw new Error("친구 목록을 불러오는 데 실패했습니다.");
      const data = await res.json();
      const friends = data.friends; // 닉네임 배열

      // 2. 모달 요소 가져오기
      const modal = document.getElementById("new-chat-modal");
      const friendList = modal.querySelector(".friend-list");
      const roomNameInput = modal.querySelector('input[name="room-name"]');
      friendList.innerHTML = "";
      roomNameInput.value = "";

      // 3. 친구 닉네임별 체크박스 생성
      friends.forEach((nickname) => {
        const div = document.createElement("div");
        div.innerHTML = `
          <label>
            <input type="checkbox" name="members" value="${nickname}">
            ${nickname}
          </label>
        `;
        friendList.appendChild(div);
      });

      // 4. 모달 보여주기
      modal.classList.remove("hidden");

      // 5. 생성 버튼 이벤트 핸들러 (중복 등록 방지 위해 기존 이벤트 제거 후 재등록)
      const submitBtn = modal.querySelector(".new-chat-submit");
      submitBtn.onclick = async (e) => {
        e.preventDefault();

        // 6. 체크된 친구 닉네임 수집
        const checked = modal.querySelectorAll('input[name="members"]:checked');
        const selectedNicknames = Array.from(checked).map((el) => el.value);

        if (selectedNicknames.length === 0) {
          alert("채팅방에 초대할 친구를 선택하세요.");
          return;
        }

        // 7. 방 이름 입력값 가져오기
        const roomName = roomNameInput.value.trim();
        if (!roomName) {
          alert("채팅방 이름을 입력하세요.");
          return;
        }

        try {
          // 8. 닉네임 -> userid 변환 요청
          const res2 = await fetch("/user/nicknames-to-ids", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ nicknames: selectedNicknames }),
          });
          if (!res2.ok) throw new Error("닉네임에서 사용자 ID 변환 실패");
          const data2 = await res2.json();

          // 9. 채팅방 생성 요청
          const res3 = await fetch("/chatRoom/create", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({
              name: roomName,
              members: data2.userids,
            }),
          });

          const data3 = await res3.json();
          if (res3.ok) {
            alert("채팅방이 생성되었습니다.");
            modal.classList.add("hidden");
            loadChatRooms(); // 채팅방 목록 갱신 함수 호출
          } else {
            alert(data3.message || "채팅방 생성에 실패했습니다.");
          }
        } catch (err) {
          alert(err.message);
        }
      };

      // 닫기 버튼 이벤트 핸들러 등록
      const closeBtn = modal.querySelector(".modal-close-btn");
      closeBtn.onclick = () => {
        modal.classList.add("hidden");
      };
    } catch (err) {
      alert(err.message);
    }
  });
}

// 5. 소켓 연결 및 실시간 메시지 수신 처리
function setupSocket(roomId, chatContent) {
  //소켓이 없을 때
  if (!window.socket) {
    const token = getTokenFromCookie(); // 쿠키에서 직접 가져오기
    console.log("🔑 소켓 연결용 토큰:", token);
    window.socket = io({
      auth: { token },
    });
  }
  window.socket.on("connect", () => {
    console.log("소켓 연결 성공:", window.socket.id);
  });

  window.socket.on("connect_error", (err) => {
    console.error("소켓 연결 실패:", err.message);
  });

  const socket = window.socket;

  // 방 나가기 및 입장 재설정 등 처리
  socket.emit("joinRoom", roomId);

  // 기존 리스너 제거 (중복 수신 방지)
  socket.off("chatMessage");

  // 메시지 수신 이벤트 처리
  socket.on("chatMessage", (msg) => {
    if (msg.roomId !== roomId) return;

    const msgDiv = document.createElement("div");
    msgDiv.classList.add("chat-message");
    if (msg.nickname === myNickname) {
      msgDiv.classList.add("mine");
    }

    msgDiv.innerHTML = `
          <div class="message-bubble">
            <strong class="sendernickname">${msg.nickname}</strong>
            <div class="message-text">${msg.message}</div>
            <span class="time">${new Date(
              msg.createdAt
            ).toLocaleTimeString()}</span>
          </div>`;

    chatContent.appendChild(msgDiv);
    scrollToBottom();

    //내 닉네임과 메세지 보낸사람의 닉네임이 같지 않은경우 TTS 실행
    if (msg.nickname !== myNickname) {
      playTTS(msg.message);
    }
  });

  socket.on("newChatRoom", (room) => {
    console.log("🟢 newChatRoom 이벤트 수신:", room);
    const chatListDiv = document.querySelector(".chat-list");

    const exists = Array.from(chatListDiv.children).some(
      (el) => el.dataset.roomId === room._id
    );
    if (exists) return;

    const roomEl = document.createElement("h3");
    roomEl.className = "chat-room";
    roomEl.textContent = room.name;
    roomEl.dataset.roomId = room._id;

    chatListDiv.appendChild(roomEl);
    setupChatRoomClick();
  });

  // 메시지 전송 버튼 이벤트도 여기서 연결할 수 있음
  setupSendMessage(roomId, chatContent);
}

// 6. 메시지 입력 및 전송 처리 함수
function setupSendMessage(roomId, chatContent) {
  const input = document.querySelector(".chat-input-area input[type=text]");
  const sendBtn = document.querySelector(".send-btn");

  async function sendMessage() {
    const msg = input.value.trim();
    if (!msg) return;

    if (isCommandMode) {
      const msg = input.value.trim();

      //명령어 목록 확인인
      if (msg === "?") {
        try {
          const html = `
            <h2>명령어 목록 및 설명</h2><br/>
            <h3>1. 날씨</h3><br/>
            <p>현재 날씨 정보를 출력해 줍니다.</p><br/>
            <h3>2. 뉴스</h3><br/>
            <p>현재 최신 뉴스 정보를 출력해 주고 뉴스 기사로 이동이 가능합니다.</p><br/>
            <h3>3. 검색</h3><br/>
            <p>검색엔진에 따른 검색 결과 페이지를 연결해 드립니다.</p><br/>
            <p>유튜브 검색엔진의 경우, 화면에 검색어에 해당하는 영상을 송출해 드립니다.</p><br/>
            <h3>4. 게임</h3><br/>
            <p>가위바위보, 숫자맞추기, 반응속도 테스트 3가지의 간단한 미니게임 플레이 가능</p><br/>
          `;
          showCommandModal(html);
        } catch (err) {
          showCommandModal("<p>❗ 날씨 정보를 가져오지 못했습니다.</p>");
        }
      }
      //명령어가 날씨 일때
      else if (msg === "날씨") {
        try {
          const res = await fetch("/weather");
          const data = await res.json();

          const html = `
            <h2>🌤️ 현재 날씨</h2>
            <ul>
              <li><strong>현재 기온:</strong> ${parseFloat(data.temp).toFixed(
                1
              )}℃</li>
              <li><strong>체감 온도:</strong> ${data.feels_like}℃</li>
              <li><strong>습도:</strong> ${data.humidity}%</li>
              <li><strong>최저 기온:</strong> ${data.temp_min}℃</li>
              <li><strong>최고 기온:</strong> ${data.temp_max}℃</li>
              <li><strong>현재 대기압:</strong> ${data.pressure}hPa</li>
            </ul>
          `;
          showCommandModal(html);
        } catch (err) {
          showCommandModal("<p>❗ 날씨 정보를 가져오지 못했습니다.</p>");
        }
      }
      //명령어가 뉴스일때
      else if (msg === "뉴스") {
        try {
          const res = await fetch("/news"); // 백엔드에서 위 JSON 반환
          const data = await res.json();

          // HTML 구성
          let html = `<h2>📰 실시간 뉴스 순위</h2><ul style="padding-left: 0;">`;

          data.forEach((newsItem) => {
            html += `
              <li style="list-style: none; margin-bottom: 1em; display: flex; align-items: flex-start;">
                <div>
                  <a href="${
                    newsItem.url
                  }" target="_blank" style="font-weight: bold; color: #007acc; text-decoration: none;">
                    ${newsItem.num}. ${newsItem.headline}
                  </a><br />
                  <small>${newsItem.date} · ${newsItem.views.replace(
              "\n",
              " "
            )}</small>
                </div>
              </li>
            `;
          });

          html += `</ul>`;

          showCommandModal(html);
        } catch (err) {
          showCommandModal("<p>뉴스를 불러오는 데 실패했습니다.</p>");
        }
      }
      //명령어가 검색 일때
      else if (msg === "검색") {
        const html = `
            <h2>🔍 검색 엔진 선택</h2><br/><br/>
            <form id="searchForm">
              <label><input type="radio" name="engine" value="google" checked> 구글</label><br/>
              <label><input type="radio" name="engine" value="naver"> 네이버</label><br/>
              <label><input type="radio" name="engine" value="youtube"> 유튜브</label><br/><br/>
              <p>검색엔진에 따른 검색어 결과 페이지를 연결해 드립니다.</p><br/>
              <p>유튜브의 경우 검색어에 따른 동영상이 화면에 재생됩니다.</p><br/><br/>
      
              <input type="text" id="searchKeyword" placeholder="검색어를 입력하세요" style="width: 90%; padding: 5px;" required/>
              <br/><br/>
              <button type="submit" style="padding: 5px 10px;">검색</button>
            </form>
          `;

        showCommandModal(html);

        setTimeout(() => {
          const form = document.getElementById("searchForm");
          form.addEventListener("submit", async (e) => {
            e.preventDefault();

            const engine = form.engine.value;
            const keyword = document
              .getElementById("searchKeyword")
              .value.trim();
            if (!keyword) {
              alert("검색어를 입력해주세요.");
              return;
            }
            //검색엔진이 youtbe일 경우에는 API로 유튜브 영상을 받아와서 화면에 재생
            if (engine === "youtube") {
              try {
                const res = await fetch(
                  `/youtube?query=${encodeURIComponent(keyword)}`
                );
                const data = await res.json();

                if (!data.videoId)
                  throw new Error("유튜브 영상 ID를 찾을 수 없습니다.");

                const html = `
                <div style="display: flex; flex-direction: column; align-items: center; padding: 1rem;">
                  <h2>🎬 유튜브 영상 결과</h2><br/>
                  <iframe
                    width="1600"
                    height="800"
                    src="https://www.youtube.com/embed/${data.videoId}"
                    frameborder="0"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowfullscreen
                    style="max-width: 1600px; width: 100%; border-radius: 12px;"
                  ></iframe>
                </div>
                `;
                showCommandModal(html);
              } catch (err) {
                showCommandModal(
                  `<p>❗ 유튜브 영상 로딩 실패: ${err.message}</p>`
                );
              }
            }
            //나머지 검색엔진의 경우 검색어 결과페이지를 새창에서 열기
            else {
              try {
                let url = "";
                switch (engine) {
                  case "google":
                    url = `https://www.google.com/search?q=${encodeURIComponent(
                      keyword
                    )}`;
                    break;
                  case "naver":
                    url = `https://search.naver.com/search.naver?query=${encodeURIComponent(
                      keyword
                    )}`;
                    break;
                }

                const newWindow = window.open(url, "_blank");
                if (
                  !newWindow ||
                  newWindow.closed ||
                  typeof newWindow.closed === "undefined"
                ) {
                  throw new Error(
                    "팝업 차단 등으로 인해 새 창을 열 수 없습니다."
                  );
                }
              } catch (err) {
                showCommandModal(
                  `<p>❗ 검색 페이지를 열 수 없습니다: ${err.message}</p>`
                );
              }
            }
          });
        }, 100);
      }
      // 명령어가 게임 일때
      else if (msg === "게임") {
        try {
          const html = `
          <h2>🎮 게임 선택</h2>
          <p>원하는 게임을 선택하세요:</p>
            <div style="display: flex; gap: 1rem; margin-top: 1rem;">
              <button onclick="loadGame('rps')">가위바위보</button>
              <button onclick="loadGame('guess')">숫자 맞히기</button>
              <button onclick="loadGame('reaction')">반응 속도</button>
            </div>
            <div id="game-area" style="margin-top: 2rem;"></div>
          `;
          showCommandModal(html);
        } catch (err) {
          showCommandModal("<p>❗ 게임 로딩에 실패했습니다.</p>");
        }
      }
      //등록되지 않은 명령어 일때
      else {
        showCommandModal(`<p>❗ 알 수 없는 명령어입니다: <b>${msg}</b></p>`);
      }

      input.value = "";
      return;
    }

    // 일반 채팅 메시지 전송
    if (!window.socket) return alert("소켓 연결이 없습니다.");
    window.socket.emit("chatMessage", { roomId, message: msg });
    input.value = "";
  }

  sendBtn.onclick = sendMessage;
  input.onkeydown = (e) => {
    if (e.key === "Enter") sendMessage();
  };
}

// 마이크 입력 구현
// 마이크 버튼과 입력창 참조
const micBtn = document.querySelector(".mic-btn");
const messageInput = document.querySelector(
  '.chat-input-area input[type="text"]'
);

// SpeechRecognition 객체 생성 (브라우저 호환 처리)
const SpeechRecognition =
  window.SpeechRecognition || window.webkitSpeechRecognition;

if (SpeechRecognition) {
  const recognition = new SpeechRecognition();
  recognition.lang = "ko-KR"; // 한국어
  recognition.interimResults = true; // 중간 결과도 받을지 여부
  recognition.continuous = false; // 한 문장 인식하고 멈춤

  let isListening = false;

  micBtn.classList.add(isListening ? "mic-on" : "mic-off");

  micBtn.addEventListener("click", () => {
    if (!isListening) {
      recognition.start();
      micBtn.innerHTML = '<i class="fa-solid fa-microphone"></i>'; // 버튼 상태 표시
    } else {
      recognition.stop();
      micBtn.innerHTML = '<i class="fa-solid fa-microphone-slash"></i>'; // 기본 텍스트 복원
    }

    micBtn.classList.toggle("mic-on", !isListening);
    micBtn.classList.toggle("mic-off", isListening);
    isListening = !isListening;
  });

  recognition.onresult = (event) => {
    const transcript = Array.from(event.results)
      .map((result) => result[0].transcript)
      .join("");
    messageInput.value = transcript;
  };

  recognition.onerror = (event) => {
    console.error("음성 인식 오류:", event.error);
    alert("음성 인식 중 오류가 발생했습니다.");
    micBtn.innerHTML = '<i class="fa-solid fa-microphone-slash"></i>';

    micBtn.classList.add("mic-off", isListening);

    isListening = false;
  };

  recognition.onend = () => {
    micBtn.innerHTML = '<i class="fa-solid fa-microphone-slash"></i>';

    micBtn.classList.add("mic-off", isListening);

    isListening = false;
  };
} else {
  alert("이 브라우저는 음성 인식을 지원하지 않습니다.");
}

// 명령어 입력모드 전환 함수
let isCommandMode = false; // 기본은 채팅 모드

// 명령어 버튼 클릭 시 모드 토글
document.querySelector(".command-btn").addEventListener("click", () => {
  isCommandMode = !isCommandMode;

  const input = document.querySelector(".label-placeholder");
  input.innerHTML = isCommandMode
    ? '<b>커맨드 모드:</b> <i>명령어목록 확인은 "?" 입력</i>'
    : "채팅을 입력하세요...";
  input.classList.toggle("command-mode", isCommandMode);
  document
    .querySelector(".command-btn")
    .classList.toggle("command-mode-active", isCommandMode);
});

// 명령어 결과 출력 모달 컨트롤 함수
function showCommandModal(html) {
  const modal = document.getElementById("command-modal");
  const resultDiv = document.getElementById("command-result");
  const closeBtn = modal.querySelector(".modal-close");

  resultDiv.innerHTML = html;
  modal.classList.remove("hidden");

  closeBtn.onclick = () => modal.classList.add("hidden");
  window.onclick = (e) => {
    if (e.target === modal) modal.classList.add("hidden");
  };
}

//TTS 음성 목록 로딩
let koreanVoice = null;

// TTS 음성 목록 로딩 후 한국어 음성 선택
window.speechSynthesis.onvoiceschanged = () => {
  const voices = speechSynthesis.getVoices();
  koreanVoice = voices.find((v) => v.lang === "ko-KR");

  if (!koreanVoice) {
    console.warn("한국어 음성을 찾을 수 없습니다. 기본 음성을 사용합니다.");
  }
};
//TTS 함수
function playTTS(message) {
  if (!isTTSEnabled) return; // TTS OFF시 실행 안함
  if (!window.speechSynthesis) {
    console.warn("이 브라우저는 TTS를 지원하지 않습니다.");
    return;
  }

  window.speechSynthesis.cancel(); // 기존 음성 재생 중단 (겹침 방지)

  const utterance = new SpeechSynthesisUtterance(message);
  utterance.lang = "ko-KR";
  utterance.pitch = 1;
  utterance.rate = 1;
  utterance.volume = 1;

  if (koreanVoice) utterance.voice = koreanVoice;

  window.speechSynthesis.speak(utterance);
}
//TTS ON/OFF 기능
let isTTSEnabled = true; //TTS ON/OFF 기본은 ON

document.addEventListener("DOMContentLoaded", () => {
  const ttsBtn = document.querySelector(".tts-toggle-btn");
  if (ttsBtn) {
    // 초기 상태 클래스 설정
    ttsBtn.classList.add(isTTSEnabled ? "tts-on" : "tts-off");
    ttsBtn.innerHTML = isTTSEnabled
      ? '<i class="fa-solid fa-volume-high"></i>'
      : '<i class="fa-solid fa-volume-xmark"></i>';

    ttsBtn.addEventListener("click", () => {
      isTTSEnabled = !isTTSEnabled;

      // 텍스트 변경
      ttsBtn.innerHTML = isTTSEnabled
        ? '<i class="fa-solid fa-volume-high"></i>'
        : '<i class="fa-solid fa-volume-xmark"></i>';

      // 클래스 토글
      ttsBtn.classList.toggle("tts-on", isTTSEnabled);
      ttsBtn.classList.toggle("tts-off", !isTTSEnabled);
    });
  }
});

//게임 삽입용 js 함수
function loadGame(type) {
  const area = document.getElementById("game-area");
  if (!area) return;

  if (type === "rps") {
    area.innerHTML = `
      <h3>✊✋✌️ 가위바위보</h3>
      <button onclick="playRPS('rock')">✊</button>
      <button onclick="playRPS('paper')">✋</button>
      <button onclick="playRPS('scissors')">✌️</button>
      <p id="rps-result"></p>
    `;
  } else if (type === "guess") {
    area.innerHTML = `
      <h3>🔢 숫자 맞히기 (1~100)</h3>
      <input type="number" id="guess-input" placeholder="숫자 입력" style="width: 100px;" />
      <button onclick="checkGuess()">확인</button>
      <p id="guess-result"></p>
    `;
    window.answer = Math.floor(Math.random() * 100) + 1; // 정답 초기화
  } else if (type === "reaction") {
    area.innerHTML = `
      <h3>⚡ 반응 속도 측정</h3>
      <button id="start-btn" onclick="startReaction()">시작</button>
      <button id="click-btn" onclick="endReaction()" style="display:none;">지금 클릭!</button>
      <p id="reaction-result"></p>
    `;
  }
}

//게임 로직 함수들
//가위 바위 보 게임
function playRPS(user) {
  const choices = ["rock", "paper", "scissors"];
  const computer = choices[Math.floor(Math.random() * 3)];
  const result =
    user === computer
      ? "비김!"
      : (user === "rock" && computer === "scissors") ||
        (user === "paper" && computer === "rock") ||
        (user === "scissors" && computer === "paper")
      ? "승리!"
      : "패배!";
  document.getElementById(
    "rps-result"
  ).innerText = `컴퓨터: ${computer} → ${result}`;
}
//숫자 맞추기 게임
function checkGuess() {
  const input = parseInt(document.getElementById("guess-input").value);
  const result = document.getElementById("guess-result");
  if (isNaN(input)) {
    result.innerText = "숫자를 입력하세요.";
  } else if (input === window.answer) {
    result.innerText = "🎉 정답입니다!";
  } else if (input < window.answer) {
    result.innerText = "🔼 더 큰 수!";
  } else {
    result.innerText = "🔽 더 작은 수!";
  }
}

let startTime;
function startReaction() {
  document.getElementById("start-btn").style.display = "none";
  document.getElementById("reaction-result").innerText = "준비 중...";
  setTimeout(() => {
    document.getElementById("click-btn").style.display = "inline-block";
    document.getElementById("reaction-result").innerText = "지금 클릭!";
    startTime = Date.now();
  }, Math.random() * 3000 + 2000);
}
//반응속도 게임
function endReaction() {
  const reactionTime = Date.now() - startTime;
  document.getElementById("click-btn").style.display = "none";
  document.getElementById("start-btn").style.display = "inline-block";
  document.getElementById(
    "reaction-result"
  ).innerText = `⏱️ 반응 속도: ${reactionTime}ms`;
}

//햄버거 버튼 이벤트
document.addEventListener("DOMContentLoaded", () => {
  const hamburger = document.querySelector(".hamburger");
  const sidebar = document.querySelector(".sidebar");

  if (hamburger && sidebar) {
    hamburger.addEventListener("click", () => {
      sidebar.classList.toggle("show");
    });
  }
});

//스크롤 하단고정 함수
function scrollToBottom() {
  const chatWindow = document.querySelector(".chat-window");
  if (!chatWindow) return;

  // 연속적으로 스크롤 시도 (모바일에서 안 먹히는 경우 대응)
  let attempts = 0;
  const maxAttempts = 10;

  const interval = setInterval(() => {
    chatWindow.scrollTop = chatWindow.scrollHeight;
    attempts++;
    if (attempts >= maxAttempts) {
      clearInterval(interval);
    }
  }, 50); // 짧은 간격으로 반복 시도
}

function initializeSocketForNewRoom() {
  if (!window.socket) {
    const token = getTokenFromCookie();
    window.socket = io({
      auth: { token },
    });
  }

  const socket = window.socket;

  socket.on("connect", () => {
    console.log("소켓 연결됨:", socket.id);
  });

  socket.on("connect_error", (err) => {
    console.error("소켓 연결 오류:", err.message);
  });

  // 전역 채팅방 추가 이벤트 등록
  socket.on("newChatRoom", (room) => {
    console.log("새 채팅방 도착:", room);

    const chatListDiv = document.querySelector(".chat-list");

    const exists = Array.from(chatListDiv.children).some(
      (el) => el.dataset.roomId === room._id
    );
    if (exists) return;

    const roomEl = document.createElement("h3");
    roomEl.className = "chat-room";
    roomEl.textContent = room.name;
    roomEl.dataset.roomId = room._id;
    chatListDiv.appendChild(roomEl);

    setupChatRoomClick(); // 클릭 이벤트 재등록
  });
}
