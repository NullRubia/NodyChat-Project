import express from "express";
import fetch from "node-fetch"; //Node.js 환경에서 fetch API를 사용할 수 있도록 해주는 모듈
import { config } from "../config.mjs";

const router = express.Router();

//YouTube Data API v3 API사용
//YouTube Data API v3는 Google이 제공하는 API로,
//YouTube의 데이터(영상, 채널, 재생목록 등)에 접근하고 조작할 수 있도록 해주는 API
router.get("/", async (req, res) => {
  const { query } = req.query;
  const apiKey = config.youtue.apiKey; //YouTube Data API v3 API KEY

  if (!query) {
    return res.status(400).json({ error: "검색어가 없습니다." });
  }

  const apiUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&maxResults=1&q=${encodeURIComponent(
    query
  )}&key=${apiKey}`;

  try {
    const response = await fetch(apiUrl);
    const result = await response.json();

    const videoId = result.items?.[0]?.id?.videoId;
    if (!videoId) {
      return res.status(404).json({ error: "영상이 없습니다." });
    }

    res.json({ videoId });
  } catch (err) {
    console.error("유튜브 API 에러:", err);
    res.status(500).json({ error: "유튜브 검색 실패" });
  }
});

export default router;
