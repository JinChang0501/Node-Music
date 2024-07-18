import express from 'express'
const router = express.Router()

// 中介軟體，存取隱私會員資料用
import authenticate from '#middlewares/authenticate.js'

// 檢查空物件, 轉換req.params為數字
import { getIdParam } from '#db-helpers/db-tool.js'

// 資料庫使用
import db from '../utils/connect-mysql.js'

// GET - 得到所有登入之會員的購物紀錄
router.get('/', authenticate, async function (req, res) {
  const id = +req.user.id

  const sql = `SELECT 
    a.order_num,
    MIN(b.picture) AS firstProductPicture,
    MIN(b.name) AS firstProductName,
    COUNT(a.id) AS totalCount,
    sum(b.price) AS totalPrice,
    a.created_at
FROM 
    order_detail as a 
JOIN 
    product as b 
ON 
    a.product_id = b.id 
WHERE 
    a.member_id = ${id}
GROUP BY 
    a.order_num, a.created_at
Order by a.created_at Desc;`

  const [result] = await db.query(sql)
  // res.json({ result })
  return res.json({ status: 'success', data: { result } })
  // 處理如果沒找到資料
})

router.get('/:sortBy', authenticate, async function (req, res) {
  const id = +req.user.id
  let sortBy = req.params.sortBy || ''
  let where = `a.member_id = ` + id
  let sort = 'a.created_at'
  if (sortBy === 'desc') {
    sort += ` desc`
  } else {
    sort = `a.created_at asc`
  }
  const sql = `SELECT 
      a.order_num,
      MIN(b.picture) AS firstProductPicture,
      MIN(b.name) AS firstProductName,
      COUNT(a.id) AS totalCount,
      sum(b.price) AS totalPrice,
      a.created_at
  FROM 
      order_detail AS a 
  JOIN 
      product AS b 
  ON 
      a.product_id = b.id 
  WHERE 
      ${where}
  GROUP BY 
      a.order_num, a.created_at
  Order by ${sort};`

  const [result] = await db.query(sql)
  // res.json({ result })
  return res.json({ status: 'success', data: { result } })
  // 處理如果沒找到資料
})

export default router
