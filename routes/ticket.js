import express from 'express'
import db from '../utils/connect-mysql.js'

const router = express.Router()

const getTicketByActivityId = async (req, res) => {
  const { actid } = req.params
  let success = false
  const sql = `SELECT * FROM ticket WHERE activity_id = ?`

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
