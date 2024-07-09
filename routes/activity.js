import express from "express";
import moment from "moment-timezone";
import db from "./../utils/connect-mysql.js";

// 要做的：

// 活動列表：渲染資料、搜尋、篩選 
// 活動列表：收藏

// 活動細節頁：渲染資料、收藏
// 活動細節頁：藝人追蹤（類似收藏)

const dateFormat = "YYYY-MM-DD";
const router = express.Router();

const getListData = async (req) => {
  let success = false;
  let redirect = "";

  let keyword = req.query.keyword || "";
  let date_begin = req.query.date_begin || "";
  let date_end = req.query.date_end || "";

  // 搜尋的 sql
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
      where += ` AND birthday >= '${m.format(dateFormat)}' `;
    }
  }
  if (date_end) {
    const m = moment(date_end);
    if (m.isValid()) {
      where += ` AND birthday <= '${m.format(dateFormat)}' `;
    }
  }

  // 搜尋結果（預設 All 活動）
  const t_sql = `SELECT COUNT(1) totalRows FROM activity ${where}`;
  console.log(t_sql);
  const [[{ totalRows }]] = await db.query(t_sql);
  // let totalPages = 0; // 總頁數, 預設值
  // let rows = []; // 分頁資料
  if (totalRows) {
    totalPages = Math.ceil(totalRows / perPage);
    if (page > totalPages) {
      redirect = `?page=${totalPages}`;
      return { success, redirect };
    }
    // 取得分頁資料
    const sql = `SELECT * FROM \`activity\` ${where} ORDER BY actid DESC LIMIT ${(page - 1) * perPage
      },${perPage}`;
    console.log(sql);
    [rows] = await db.query(sql);
    rows.forEach((el) => {
      el.birthday = moment(el.birthday).format(dateFormat);
      const m = moment(el.birthday);
      // 無效的日期格式，使用空字串
      el.birthday = m.isValid() ? m.format(dateFormat) : "";
    });
  }
  success = true;
  return {
    success,
    perPage,
    page,
    totalRows,
    totalPages,
    rows,
    qs: req.query,
  };
};



/*
// middleware
router.use((req, res, next) => {
  let u = req.url.split("?")[0];
  if (["/", "/api"].includes(u)) {
    return next();
  }
  if (req.session.admin) {
    //有登入，就通過
    next();
  } else {
    // 沒有登入, 就跳到登入頁
    res.redirect("/login");
  }
});
*/

router.get("/", async (req, res) => {
  res.locals.title = "活動列表 | " + res.locals.title;
  res.locals.pageName = "act_list";
  const data = await getListData(req);
  if (data.redirect) {
    return res.redirect(data.redirect);
  }
  if (data.success) {
    res.render("address-book/list", data);
  }
});

router.get("/api", async (req, res) => {
  const data = await getListData(req);
  res.json(data);
});

router.get("/add", async (req, res) => {
  res.locals.title = "新增通訊錄 | " + res.locals.title;
  res.locals.pageName = "ab_add";
  res.render("address-book/add");
});
/*
// 處理 multipart/form-data
router.post("/add", [upload.none()], async (req, res) => {
  res.json(req.body);
});
*/

router.post("/add", async (req, res) => {
  // TODO: 欄位資料的檢查

  /*
  const sql = "INSERT INTO activity (`name`, `email`, `mobile`, `birthday`, `address`, `created_at`) VALUES (?, ?, ?, ?, ?, NOW())";
  const [ result ] = await db.query(sql, [
    req.body.name,
    req.body.email,
    req.body.mobile,
    req.body.birthday,
    req.body.address,
  ]);
*/

  let body = { ...req.body };
  body.created_at = new Date();

  const m = moment(body.birthday);
  body.birthday = m.isValid() ? m.format(dateFormat) : null;

  const sql = "INSERT INTO activity SET ?";
  const [result] = await db.query(sql, [body]);

  res.json({
    result,
    success: !!result.affectedRows
  });
  /*
  {
    "fieldCount": 0,
    "affectedRows": 1,
    "insertId": 5007,
    "info": "",
    "serverStatus": 2,
    "warningStatus": 0,
    "changedRows": 0
  }
  */
});

// // 刪除資料的 API
// router.delete("/api/:actid", async (req, res) => {
//   const output = {
//     success: false,
//     code: 0,
//     result: {}
//   };

//   if (!req.my_jwt?.id) {
//     //沒有登入
//     output.code = 470
//     return res.json(output)
//   }

//   const actid = +req.params.actid || 0;
//   if (!actid) {
//     output.code = 480
//     return res.json(output);
//   }

//   const sql = `DELETE FROM activity WHERE actid=${actid}`;
//   const [result] = await db.query(sql);
//   output.result = result;
//   output.success = !!result.affectedRows;

//   res.json(output);
// });

// 編輯的表單頁
// router.get("/edit/:actid", async (req, res) => {
//   const actid = +req.params.actid || 0;
//   if (!actid) {
//     return res.redirect("/address-book");
//   }

//   const sql = `SELECT * FROM activity WHERE actid=${actid}`;
//   const [rows] = await db.query(sql);
//   if (!rows.length) {
//     //沒有該筆資料
//     return res.redirect("/address-book");
//   }

//   //res.json(rows[0]);

//   rows[0].birthday = moment(rows[0].birthday).format(dateFormat);
//   res.render("address-book/edit", rows[0]);
// });

// 取得單項資料的 API
router.get("/api/:actid", async (req, res) => {
  const actid = +req.params.actid || 0;
  if (!actid) {
    return res.json({ success: false, error: "沒有編號" });
  }
  const sql = `SELECT * FROM activity WHERE actid=${actid}`;
  const [rows] = await db.query(sql);
  if (!rows.length) {
    // 沒有該筆資料
    return res.json({ success: false, error: "沒有該筆資料" });
  }
  const m = moment(rows[0].birthday);
  rows[0].a_date = m.isValid() ? m.format(dateFormat) : '';
  res.json({ success: true, data: rows[0] });
});

// //處理編輯的表單
// router.put("/api/:actid", upload.none(), async (req, res) => {
//   const output = {
//     success: false,
//     code: 0,
//     result: {}
//   };

//   const actid = +req.params.actid || 0;
//   if (!actid) {
//     return res.json(output);
//   }

//   let body = { ...req.body }
//   const m = moment(body.birthday);
//   body.birthday = m.isValid() ? m.format(dateFormat) : null;

//   try {
//     const sql = "UPDATE `activity` SET ? WHERE actid=? ";
//     const [result] = await db.query(sql, [body, actid]);
//     output.result = result;
//     output.success = !!(result.affectedRows && result.changedRows);
//   } catch (ex) {
//     output.error = ex;
//   }
//   res.json(output);
// });
export default router;