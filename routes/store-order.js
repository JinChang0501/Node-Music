import express from 'express'
const router = express.Router()

// 中介軟體，存取隱私會員資料用
import authenticate from '#middlewares/authenticate.js'

// 檢查空物件, 轉換req.params為數字
import { getIdParam } from '#db-helpers/db-tool.js'

// 資料庫使用
import db from '../utils/connect-mysql.js'

// GET - 得到所有Ticket資料
// router.get('/', authenticate, async function (req, res) {
//   const sql = `SELECT * FROM ticket`

//   const [result] = await db.query(sql)
//   res.json({ result })
//   // 處理如果沒找到資料
// })

// GET - 得到所有登入之會員的購物紀錄
router.get('/', authenticate, async function (req, res) {
  const id = +req.user.id

  const sql = `SELECT 
    a.order_num,
    MIN(b.picture) AS firstProductPicture,
    MIN(b.name) AS firstProductName,
    COUNT(a.id) AS totalCount,
    sum(b.price) AS totalPrice
FROM 
    order_detail AS a 
JOIN 
    product AS b 
ON 
    a.product_id = b.id 
WHERE 
    a.member_id = ${id}
GROUP BY 
    a.order_num;`

  const [result] = await db.query(sql)
  // res.json({ result })
  return res.json({ status: 'success', data: { result } })
  // 處理如果沒找到資料
})

export default router
