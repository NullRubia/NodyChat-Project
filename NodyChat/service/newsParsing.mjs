import express from "express";
import axios from "axios";
import * as cheerio from "cheerio";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const url = "https://media.naver.com/press/056";
    const response = await axios.get(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });

    const $ = cheerio.load(response.data);
    const newsItems = [];

    $(".ofra_list li.ofra_list_item.as_thumb").each((i, el) => {
      const num = $(el).find("i.ofra_list_num").text().trim();
      const headline = $(el).find(".ofra_list_tx_headline").text().trim();
      const date = $(el).find(".ofra_list_tx_date").text().trim();
      const views = $(el).find(".ofra_list_tx_visit").text().trim();
      const url = $(el).find("a").attr("href");
      const img = $(el).find(".ofra_list_img img").attr("src") || null;

      newsItems.push({ num, headline, date, views, url, img });
    });

    res.json(newsItems.slice(0, 5));
  } catch (err) {
    console.error("뉴스 파싱 오류:", err.message);
    res.status(500).json({ error: "뉴스 데이터 수집 실패" });
  }
});

export default router;
