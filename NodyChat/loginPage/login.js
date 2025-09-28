// 모달 내 라디오 버튼 선택 시, 해당하는 폼을 동적으로 표시
function toggleFindForm() {
  const selected = document.querySelector(
    'input[name="findOption"]:checked'
  ).value;
  const formArea = document.getElementById("findFormArea");

  // 아이디 찾기 폼
 if (selected === "id") {
  formArea.innerHTML = `
    <input type="email" id="emailInput" placeholder="가입한 이메일을 입력하세요" required />
    <button id="findIdBtn" class="common-btn find-id-btn">아이디 찾기</button>
  `;
  }

  // 비밀번호 찾기 폼 (인증번호 받기 → 인증 → 비밀번호 재설정)
 else if (selected === "pw") {
  formArea.innerHTML = `
    <input type="text" id="phoneInput" placeholder="가입시 사용한 휴대폰 번호를 입력하세요" required />
    <button id="sendResetCodeBtn" class="common-btn send-reset-code-btn">인증번호 받기</button>
    <div id="verifyArea" style="margin-top:10px;"></div>
  `;
 }
}

// 이메일로 아이디 찾기
function findID() {
  const email = document.getElementById("emailInput").value.trim();
  if (!email) {
    alert("이메일을 입력해주세요.");
    return;
  }

  fetch("/user/findID", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.userid) {
        alert(`가입된 아이디는: ${data.userid}`);
      } else {
        alert(
          data.message || "해당 이메일로 가입된 아이디를 찾을 수 없습니다."
        );
      }
    })
    .catch((err) => {
      console.error("아이디 찾기 오류:", err);
      alert("서버 오류가 발생했습니다.");
    });
}

// 비밀번호 재설정 코드 보내기
function sendResetCode() {
  const phone = document.getElementById("phoneInput").value.trim();

  if (!phone) {
    alert("휴대폰 번호를 입력해주세요.");
    return;
  }

  fetch("/user/send-code", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.sessionId) {
        window.sessionId = data.sessionId; // 전역에 세션ID 저장

        // 인증번호 입력 폼 및 인증 버튼 생성
        document.getElementById("verifyArea").innerHTML = `
          <input type="text" id="codeInput" placeholder="인증번호 입력" required />
          <button id="verifyCodeBtn">인증하기</button>
        `;
      } else {
        alert(data.message || "인증번호 발송 실패");
      }
    })
    .catch((err) => {
      console.error("인증번호 요청 오류:", err);
      alert("서버 오류 발생");
    });
}

// 인증번호 인증
function verifyCode() {
  const code = document.getElementById("codeInput").value.trim();

  if (!code) {
    alert("인증번호를 입력해주세요.");
    return;
  }

  fetch("/user/verify-code", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, sessionId: window.sessionId }),
  })
    .then((res) => res.json())
    .then((data) => {
      console.log("서버 응답 (인증 결과):", data); // ✅ 로그로 응답 확인

      if (data.verified) {
        alert("인증 성공! 새 비밀번호를 입력해주세요.");

        const verifyArea = document.getElementById("verifyArea");

        if (verifyArea) {
          verifyArea.innerHTML = `
            <input type="password" id="newPasswordInput" placeholder="새 비밀번호 입력" required />
            <input type="password" id="confirmPasswordInput" placeholder="비밀번호 확인" required />
            <button id="resetPasswordBtn">비밀번호 재설정</button>
          `;
        } else {
          console.error("❌ verifyArea 요소를 찾을 수 없습니다.");
        }
      } else {
        alert(data.message || "인증 실패. 인증번호를 다시 확인해주세요.");
      }
    })
    .catch((err) => {
      console.error("인증 오류:", err);
      alert("서버 오류 발생");
    });
}

// 비밀번호 재설정하기
function resetPassword() {
  const newPassword = document.getElementById("newPasswordInput").value.trim();
  const confirmPassword = document
    .getElementById("confirmPasswordInput")
    .value.trim();

  if (!newPassword || !confirmPassword) {
    alert("모든 비밀번호 입력란을 작성해주세요.");
    return;
  }

  if (newPassword !== confirmPassword) {
    alert("비밀번호가 일치하지 않습니다. 다시 확인해주세요.");
    return;
  }

  fetch("/user/reset-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      newPassword,
      sessionId: window.sessionId,
    }),
  })
    .then((res) => res.json())
    .then((data) => {
      if (data.message === "비밀번호 재설정 완료") {
        alert("비밀번호가 성공적으로 재설정되었습니다.");
        closeModal(); // 모달 닫기
      } else {
        alert(data.message || "비밀번호 재설정 실패");
      }
    })
    .catch((err) => {
      console.error("비밀번호 재설정 오류:", err);
      alert("서버 오류 발생");
    });
}

// 모달 팝업 열기 함수
function openModal() {
  document.getElementById("myModal").style.display = "block";
}

// 모달 팝업 닫기 함수
function closeModal() {
  document.getElementById("myModal").style.display = "none";
}

// 이벤트 위임 방식 추가
// 동적으로 생성된 버튼들의 클릭 이벤트를 위임하여 처리
document.addEventListener("click", function (e) {
  if (e.target) {
    if (e.target.id === "findIdBtn") {
      findID();
    } else if (e.target.id === "sendResetCodeBtn") {
      sendResetCode();
    } else if (e.target.id === "verifyCodeBtn") {
      verifyCode();
    } else if (e.target.id === "resetPasswordBtn") {
      resetPassword();
    }
  }
});

// ✅ DOMContentLoaded 이후 라디오 이벤트 연결 및 초기 폼 렌더링
document.addEventListener("DOMContentLoaded", () => {
  // 1. 페이지 로드 시 현재 선택된 라디오 상태에 따라 폼 표시
  toggleFindForm();

  // 2. 라디오 버튼 변경 시 toggleFindForm 실행
  const radios = document.querySelectorAll('input[name="findOption"]');
  radios.forEach((radio) => radio.addEventListener("change", toggleFindForm));
});
