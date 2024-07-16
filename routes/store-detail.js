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
router.get('/:order_num', authenticate, async function (req, res) {
  const id = +req.user.id
  let order_num = req.params.order_num || ''
  let where = `a.member_id = ` + id
  if (order_num) {
    where += ` AND a.order_num = '${order_num}'`
  }

  const sql = `SELECT 
    a.order_num,
    c.name AS memberName,
    b.picture,
    a.product_id,
    b.name as productName,
    a.quantity,
    b.price,
    a.payment_method,
    a.pickup_method,
    a.storename,
    (select sum(a.quantity) from order_detail as a 
    WHERE ${where}) as productTotalCount,
    (select sum(a.quantity * b.price) from order_detail as a join product as b on a.product_id = b.id 
    WHERE ${where}) as totalPrice,
    a.created_at
FROM 
    order_detail AS a
JOIN 
    product AS b ON a.product_id = b.id
JOIN 
    member AS c ON a.member_id = c.id
WHERE 
${where}
GROUP BY 
    a.order_num, 
    c.name, 
    b.picture,
    a.product_id, 
    b.name, 
    a.quantity, 
	b.price,
    a.payment_method, 
    a.pickup_method, 
    a.storename, 
    a.created_at;`

  const [result] = await db.query(sql)
  // res.json({ result })
  return res.json({ status: 'success', data: { result } })
  // 處理如果沒找到資料
})

export default router
