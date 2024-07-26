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
    b_min.picture AS firstProductPicture,
    b_min.name AS firstProductName,
    total_stats.totalCount,
    total_stats.totalPrice,
    a.created_at
FROM 
    (SELECT 
         order_num,
         SUM(quantity) AS totalCount,
         SUM(quantity * price) AS totalPrice
     FROM 
         order_detail AS a
     JOIN 
         product AS b
     ON 
         a.product_id = b.id
     WHERE 
         a.member_id = ${id}
     GROUP BY 
         order_num) AS total_stats
JOIN 
    (SELECT 
         order_num, 
         MIN(product_id) AS min_product_id 
     FROM 
         order_detail 
     WHERE 
         member_id = ${id}
     GROUP BY 
         order_num) AS min_products
ON 
    total_stats.order_num = min_products.order_num
JOIN 
    product AS b_min
ON 
    min_products.min_product_id = b_min.id
JOIN 
    order_detail AS a
ON 
    total_stats.order_num = a.order_num
WHERE 
    a.member_id = ${id}
GROUP BY 
    a.order_num, a.created_at, b_min.picture, b_min.name, total_stats.totalCount, total_stats.totalPrice
ORDER BY 
    a.created_at DESC;`

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
    b_min.picture AS firstProductPicture,
    b_min.name AS firstProductName,
    total_stats.totalCount,
    total_stats.totalPrice,
    a.created_at
FROM 
    (SELECT 
         order_num,
         SUM(quantity) AS totalCount,
         SUM(quantity * price) AS totalPrice
     FROM 
         order_detail AS a
     JOIN 
         product AS b
     ON 
         a.product_id = b.id
     WHERE 
         a.member_id = ${id}
     GROUP BY 
         order_num) AS total_stats
JOIN 
    (SELECT 
         order_num, 
         MIN(product_id) AS min_product_id 
     FROM 
         order_detail 
     WHERE 
         member_id = ${id}
     GROUP BY 
         order_num) AS min_products
ON 
    total_stats.order_num = min_products.order_num
JOIN 
    product AS b_min
ON 
    min_products.min_product_id = b_min.id
JOIN 
    order_detail AS a
ON 
    total_stats.order_num = a.order_num
WHERE 
    a.member_id = ${id}
GROUP BY 
    a.order_num, a.created_at, b_min.picture, b_min.name, total_stats.totalCount, total_stats.totalPrice
ORDER BY 
    ${sort};`

  const [result] = await db.query(sql)
  // res.json({ result })
  return res.json({ status: 'success', data: { result } })
  // 處理如果沒找到資料
})

export default router
