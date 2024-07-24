import express from 'express'

import db from '../utils/connect-mysql.js'

const router = express.Router()

router.get('/', async function (req, res) {
  const sql = `SELECT * from artist`

  const [result] = await db.query(sql)
  // res.json({ result })
  return res.json({ status: 'success', data: { result } })
  // 處理如果沒找到資料
})

export default router
