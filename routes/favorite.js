import express from 'express'
import moment from 'moment-timezone'
const router = express.Router()

// 檢查空物件, 轉換req.params為數字
import { getIdParam } from '#db-helpers/db-tool.js'

// 登入驗證（不確定我們是用這個嗎）
import authenticate from '#middlewares/authenticate.js'
// 連接 MySQL 資料庫
import db from '../utils/connect-mysql.js'

// 獲得某會員id的 有加入到我的最愛清單中的商品id們
// 此路由只有登入會員能使用 authenticate

const dateFormat = 'YYYY-MM-DD'
const timeFormat = 'HH:mm'

// 加入收藏
router.post('/', authenticate, async (req, res) => {
  const { eventId } = req.body
  const id = +req.user.id

  const p_sql = `INSERT INTO \`favorite\` (member_id, item_id) VALUES (?, ?)`

  try {
    await db.query(p_sql, [id, eventId])
    res.status(201).json({ message: '收藏成功', eventId: { eventId } })
  } catch (error) {
    res.status(500).json({ error: '無法加入收藏' })
  }
})

// 取消收藏
router.delete('/', authenticate, async (req, res) => {
  const { eventId } = req.body
  const id = +req.user.id
  const d_sql = `DELETE FROM \`favorite\` WHERE member_id = ? AND item_id = ?`

  try {
    await db.query(d_sql, [id, eventId])
    res.status(200).json({ message: '取消收藏成功', eventId: { eventId } })
  } catch (error) {
    res.status(500).json({ error: '無法取消收藏' })
  }
})

// 獲取使用者收藏的活動
router.get('/', authenticate, async (req, res) => {
  // const { userId } = req.params
  const id = +req.user.id
  // const sql = `SELECT item_id FROM \`favorite\` WHERE member_id = ?`
  const cal_sql = `SELECT a.actname, a.actdate, a.acttime, f.item_id
  FROM \`activity\` as a
  JOIN \`favorite\` as f
  ON a.actid = f.item_id
  WHERE f.member_id = ?`

  try {
    const [activities] = await db.query(cal_sql, id)
    const favorites = activities.map((row) => row.item_id)
    activities.forEach((el) => {
      // const m = moment(el.actdate)
      const t = moment(el.acttime, 'HH:mm:ss')
      // 無效的日期格式，使用空字串
      // el.actdate = m.isValid() ? m.format(dateFormat) : ""
      el.acttime = t.isValid() ? t.format(timeFormat) : ''
    })
    res.status(200).json({ success: true, rows: { favorites, activities } })
  } catch (error) {
    res.status(500).json({ error: '無法獲取收藏' })
  }
})

export default router
