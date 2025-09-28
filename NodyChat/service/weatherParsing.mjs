import express from "express";
import axios from "axios"; //HTTP 요청을 보내기 위한 모듈 (서버 간 통신, 웹페이지 데이터 요청 등)
import { config } from "../config.mjs";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    // 1. 클라이언트 IP 확인
    const rawIP = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
    const clientIP = Array.isArray(rawIP)
      ? rawIP[0]
      : rawIP.split(",")[0].trim();

    console.log("Client IP:", clientIP); // 디버깅용 출력

    // 2. 위치 API 호출 (ip-api.com은 무료, 하루 45회 제한)
    const geoRes = await axios.get(`http://ip-api.com/json/${clientIP}`);

    if (geoRes.data.status !== "success") {
      return res.status(400).json({ error: "IP 위치 조회 실패" });
    }

    const { lat, lon } = geoRes.data;

    // 3. OpenWeatherMap 호출
    const apikey = config.weather.apiKey;
    const weatherRes = await axios.get(
      `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&lang=kr&units=metric&appid=${apikey}`
    );

    const {
      temp,
      feels_like,
      temp_min,
      temp_max,
      pressure,
      humidity,
      sea_level,
      grnd_level,
    } = weatherRes.data.main;

    res.json({
      temp,
      feels_like,
      temp_min,
      temp_max,
      pressure,
      humidity,
      sea_level,
      grnd_level,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "날씨 정보 조회 실패" });
  }
});

export default router;
