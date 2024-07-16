import express from 'express'
import db from '../utils/connect-mysql.js'

const router = express.Router()

// 获取与活动 ID 相匹配的 Ticket 数据
router.get('/activity/:actid', async (req, res) => {
  const { actid } = req.params

  try {
    const sql = `SELECT * FROM ticket WHERE activity_id = ?`
    const [rows] = await db.query(sql, [actid])
    res.json({
      success: true,
      tickets: rows,
    })
  } catch (error) {
    console.error('Error fetching ticket data:', error)
    res.status(500).json({ success: false, error: 'Internal Server Error' })
  }
})

export default router
