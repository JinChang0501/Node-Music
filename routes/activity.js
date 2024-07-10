import express from "express";
import moment from "moment-timezone";
import db from "./../utils/connect-mysql.js";

// 要做的：

// 活動列表：渲染資料、搜尋、篩選 
// 活動列表：收藏

// 活動細節頁：渲染資料、收藏
// 活動細節頁：藝人追蹤（類似收藏)

const router = express.Router();
const dateFormat = "YYYY-MM-DD";
const timeFormat = "HH:mm";

const getListData = async (req) => {
  let success = false;
  // let redirect = "";

  let keyword = req.query.keyword || "";
  let date_begin = req.query.date_begin || "";
  let date_end = req.query.date_end || "";
  let time_begin = req.query.time_begin || "";
  let time_end = req.query.time_end || "";

  let where = " WHERE 1 ";
  if (keyword) {
    // where += ` AND \`name\` LIKE '%${keyword}%' `; // 沒有處理 SQL injection
    const keyword_ = db.escape(`%${keyword}%`);
    console.log(keyword_);
    where += ` AND (\`name\` LIKE ${keyword_} OR \`location\` LIKE ${keyword_}OR \`descriptions\` LIKE ${keyword_})`; // 處理 SQL injection
  }
  if (date_begin) {
    const m = moment(date_begin);
    if (m.isValid()) {
      where += ` AND actdate >= '${m.format(dateFormat)}' `
    }
  }

  if (date_end) {
    const m = moment(date_end);
    if (m.isValid()) {
      where += ` AND actdate >= '${m.format(dateFormat)}' `
    }
  }

  if (time_begin) {
    const t = moment(time_begin);
    if (t.isValid()) {
      where += ` AND acttime >= '${t.format(timeFormat)}' `
    }
  }

  if (time_end) {
    const t = moment(time_end);
    if (t.isValid()) {
      where += ` AND acttime >= '${t.format(timeFormat)}' `
    }
  }

  const sql = `SELECT * FROM \`activity\` JOIN \`artist\` on activity.artist_id = artist.id ${where} ORDER BY actid ASC`;
  console.log(sql);
  const [rows] = await db.query(sql);

  rows.forEach((el) => {
    const m = moment(el.actdate);
    const t = moment(el.acttime, 'HH:mm:ss');
    // 無效的日期格式，使用空字串
    el.actdate = m.isValid() ? m.format(dateFormat) : null;
    el.acttime = t.isValid() ? t.format(timeFormat) : null;
  });


  success = true;
  return {
    success,
    rows,
    qs: req.query,
  };
};


router.get("/", async (req, res) => {
  try {
    const data = await getListData(req);
    res.json(data);
  } catch (error) {
    console.error("Error in /api route:", error);
    res.status(500).json({ success: false, error: "Internal Server Error" });
  }
});

//取得單項資料的 API // 先保留，點入單筆資料的話是用這個渲染嗎？
router.get("/:actid", async (req, res) => {
  const actid = +req.params.actid || 0;
  if (!actid) {
    return res.json({ success: false, error: "沒有編號" });
  }
  const t_sql = `SELECT * FROM activity WHERE actid=${actid}`;
  const [rows] = await db.query(t_sql);
  if (!rows.length) {
    // 沒有該筆資料
    return res.json({ success: false, error: "沒有該筆資料" });
  }
  // const m = moment(rows[0].birthday);
  // rows[0].actdate = m.isValid() ? m.format(dateFormat) : '';
  res.json({ success: true, data: rows[0] });
});

// router.get("/", async (req, res) => {
//   try {
//     // res.locals.title = "活動列表 | " + res.locals.title;
//     // res.locals.pageName = "activity";
//     const data = await getListData(req);
//     if (data.success) {
//       res.render("activity", data); // 確認路徑和文件名稱正確
//     } else {
//       res.status(500).send("Failed to get activity list.");
//     }
//   } catch (error) {
//     console.error("Error in / route:", error);
//     res.status(505).send("Internal Server Error");
//   }
// });

export default router;