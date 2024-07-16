import express from 'express'
import db from '../utils/connect-mysql.js'

const router = express.Router()

const getTicketData = async (req) => {
  let success = false
  const sql = `SELECT * FROM ticket`

  console.log(sql)
  const [rows] = await db.query(sql)

  success = true
  return {
    success,
    rows,
    qs: req.query,
  }
}

router.get('/', async (req, res) => {
  try {
    const data = await getTicketData(req)
    res.json(data)
  } catch (error) {
    console.error('Error api route', error)
    res.status(500).json({ success: false, error: 'Internet Server Error ' })
  }
})

export default router
