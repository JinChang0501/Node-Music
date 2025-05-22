import express from 'express'
import db from '../utils/connect-mysql.js'
import authenticate from '#middlewares/authenticate.js'

const router = express.Router()

// GET - 得到所有登入之會員的購物紀錄
router.get('/', authenticate, async function (req, res) {
  const id = +req.user.id
  const sql = `SELECT * from member where id = ${id}`
  const [result] = await db.query(sql)
  return res.json({ status: 'success', data: { result } })
})

// GET - 依活動 ID 取得票券資料
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

// PUT - 清除所有票券的特定欄位（將其設為 NULL）
router.put('/clear-all', authenticate, async function (req, res) {
  const sql = `
    UPDATE ticket
    SET 
      member_id = NULL,
      payment = NULL,
      order_num = NULL,
      created_at = NULL,
      amount = NULL,
      order_info = NULL,
      status = NULL
    WHERE 
      member_id IS NOT NULL OR
      payment IS NOT NULL OR
      order_num IS NOT NULL OR
      created_at IS NOT NULL OR
      amount IS NOT NULL OR
      order_info IS NOT NULL OR
      status IS NOT NULL
  `

  try {
    const [result] = await db.query(sql)
    if (result.affectedRows > 0) {
      res.json({
        success: true,
        message: '所有票券資料已清除',
        affectedRows: result.affectedRows,
      })
    } else if (result.affectedRows === 0) {
      res.json({
        success: true,
        message: '沒有任何票券被更新',
        affectedRows: 0,
      })
    } else {
      res.json({
        success: false,
        message: '清除票券資料失敗',
      })
    }
  } catch (error) {
    console.error('清除票券資料失敗:', error)
    res.status(500).json({ success: false, message: '資料庫錯誤' })
  }
})

export default router
