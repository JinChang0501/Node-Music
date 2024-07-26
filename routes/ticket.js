import express from 'express'
import db from '../utils/connect-mysql.js'

const router = express.Router()

import authenticate from '#middlewares/authenticate.js'

// GET - 得到所有登入之會員的購物紀錄
router.get('/', authenticate, async function (req, res) {
  const id = +req.user.id

  const sql = `SELECT * from member where id = ${id}`

  const [result] = await db.query(sql)
  // res.json({ result })
  return res.json({ status: 'success', data: { result } })
  // 處理如果沒找到資料
})

const getTicketByActivityId = async (req, res) => {
  const { actid } = req.params
  let success = false
  const sql = `
    SELECT t.*, a.actname, a.actdate, a.acttime, a.location, a.mingpic, ar.art_name, m.name, m.email
    FROM ticket t
    JOIN activity a ON t.activity_id = a.actid
    LEFT JOIN artist ar ON a.artist_id = ar.id
    LEFT JOIN member m ON t.member_id = m.id
    WHERE t.activity_id = ?
  `

  try {
    const [rows] = await db.query(sql, [actid])
    success = true
    res.json({ success, rows })
  } catch (error) {
    console.error('Error fetching tickets by activity_id', error)
    res.status(500).json({ success: false, error: 'Internet Server Error' })
  }
}

router.get('/Activity/:actid', getTicketByActivityId)

export default router
