let sessionId = "";

function SignupClick() {
  const form = document.getElementById("signupForm");
  const userid = form.querySelector('input[name="userid"]').value.trim();
  const nickname = form.querySelector('input[name="nickname"]').value.trim();
  const email = form.querySelector('input[name="email"]').value.trim();
  const phone = form.querySelector('input[name="phone"]').value.trim();
  const pw = document.getElementById("PW").value;
  const checkpw = document.getElementById("CheckPW").value;

  // 1. 공백 확인
  if (!userid || !nickname || !email || !phone || !pw || !checkpw) {
    alert("모든 항목을 입력해주세요.");
    return;
  }

  // 2. 비밀번호 확인
  if (pw !== checkpw) {
    alert("비밀번호가 일치하지 않습니다.");
    return;
  }

  // 3. 형식 유효성 검사
  if (userid.length < 4 || !/^[a-zA-Z0-9]+$/.test(userid)) {
    alert("아이디는 4자 이상, 영문/숫자만 입력해주세요.");
    return;
  }
  if (pw.length < 6) {
    alert("비밀번호는 6자 이상 입력해주세요.");
    return;
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    alert("이메일 형식을 확인해주세요.");
    return;
  }
  if (!/^\d+$/.test(phone)) {
    alert("전화번호는 숫자만 입력해주세요.");
    return;
  }

  // 4. 중복 확인
  fetch("/user/check", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userid, nickname, email, phone }),
  })
    .then(async (res) => {
      const data = await res.json();
      if (res.status === 200) {
        // 5. 인증번호 전송
        return fetch("/user/send-signupcode", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone }),
        });
      } else {
        throw new Error(data.message || "중복 확인 실패");
      }
    })
    .then((res) => res.json())
    .then((data) => {
      if (data.sessionId) {
        sessionId = data.sessionId;
        document.getElementById("verifyModal").style.display = "block";
      } else {
        alert("인증번호 전송 실패: " + (data.message || "오류"));
      }
    })
    .catch((err) => {
      alert(err.message);
    });
}

// 인증 완료 후 실제 폼 제출하는 함수
function submitForm() {
  const authNum = document.getElementById("AuthNum").value;

  //인증번호 공백 확인
  if (!authNum || authNum.trim() === "") {
    alert("인증번호를 입력해주세요.");
    return;
  }

  // 인증번호 검증
  fetch("/user/verify-code", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId: sessionId,
      code: authNum,
    }),
  })
    .then((res) => res.json())
    .then((verifyResult) => {
      if (verifyResult.message === "인증 성공") {
        // 인증 성공 시 → 회원가입 요청
        const form = document.getElementById("signupForm");
        const formData = new FormData(form);
        const data = {};
        formData.forEach((value, key) => {
          data[key] = value;
        });
        // sessionId 포함 데이터에 세션아이디를 포함
        data.sessionId = sessionId;

        //회원가입 정보 보내기
        fetch("/user/signup", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(data),
        })
          .then((res) => res.json())
          .then((signupResult) => {
            if (signupResult.token) {
              alert("회원가입이 완료되었습니다!");
              window.location.href = "/";
            } else {
              alert("회원가입 실패: " + (signupResult.message || "오류"));
            }
          })
          .catch((err) => {
            console.error("회원가입 요청 오류:", err);
            alert("회원가입 중 문제가 발생했습니다.");
          });
      } else {
        alert("인증 실패: " + (verifyResult.message || "인증 오류"));
      }
    })
    .catch((err) => {
      console.error("인증번호 확인 중 오류:", err);
      alert("서버 오류: 인증 확인 중 문제가 발생했습니다.");
    });
}
