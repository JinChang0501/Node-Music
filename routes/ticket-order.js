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
router.get('/', authenticate, async function (req, res) {
  const id = +req.user.id

  // const sql = `SELECT * FROM ticket where member_id = ${id}`

  // const sql = `SELECT * FROM ticket AS a JOIN activity AS b ON a.activity_id = b.actid where a.member_id = ${id}`

  const sql = `SELECT a.order_num, a.created_at, b.actname, b.location, b.actdate, b.acttime, count(a.order_num) as amount , b.class, b.picinfrontend,a.status,a.payment
FROM ticket AS a
JOIN activity AS b ON a.activity_id = b.actid
WHERE a.member_id = ${id}
GROUP BY a.order_num, a.created_at, b.actname, b.location, b.actdate, b.acttime, b.class,b.picinfrontend ,a.status,a.payment Order by a.created_at desc;`

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
    a.order_num, a.created_at, b.actname, 
    b.location, b.actdate, b.acttime, count(a.order_num) as amount , b.class,b.picinfrontend
    FROM ticket AS a
    JOIN activity AS b ON a.activity_id = b.actid
    WHERE ${where}
    GROUP BY a.order_num, a.created_at, b.actname, b.location, b.actdate, b.acttime, b.class ,b.picinfrontend
    Order by ${sort}`

  const [result] = await db.query(sql)
  // res.json({ result })
  return res.json({ status: 'success', data: { result } })
  // 處理如果沒找到資料
})

export default router
