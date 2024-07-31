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

// GET - 得到所有Ticket資料

router.get('/:order_num', authenticate, async function (req, res) {
  const id = +req.user.id

  let order_num = req.params.order_num || ''
  let where = `a.member_id = ` + id

  if (order_num) {
    where += ` AND a.order_num = '${order_num}'`
  }

  const sql = `SELECT a.order_num,a.status,b.actname, c.art_name,b.location,b.actdate,b.acttime,a.tid,b.picinfrontend, b.mingpic,a.seat_area,a.seat_row,a.seat_number,a.price,a.created_at, d.name,a.payment FROM ticket as a 
join activity as b on a.activity_id = b.actid 
join artist as c on b.artist_id = c.id join member as d on a.member_id = d.id WHERE ${where};`

  const [result] = await db.query(sql)
  // res.json({ result })
  return res.json({ status: 'success', data: { result } })
  // 處理如果沒找到資料
})

export default router
