import express from 'express'
import moment from 'moment-timezone'
import db from '../utils/connect-mysql.js'

const router = express.Router()
const dateFormat = 'YYYY-MM-DD'
const timeFormat = 'HH:mm'

const getListData = async (req) => {
  let success = false
  // let redirect = ""

  let keyword = req.query.keyword || ''
  let date_begin = req.query.date_begin || ''
  let date_end = req.query.date_end || ''
  let time_begin = req.query.time_begin || ''
  let time_end = req.query.time_end || ''

  let where = ' WHERE 1 '
  if (keyword) {
    // where += ` AND \`name\` LIKE '%${keyword}%' ` // 沒有處理 SQL injection
    const keyword_ = db.escape(`%${keyword}%`)
    console.log(keyword_)
    where += ` AND (\`name\` LIKE ${keyword_} OR \`location\` LIKE ${keyword_}OR \`descriptions\` LIKE ${keyword_})` // 處理 SQL injection
  }
  if (date_begin) {
    const m = moment(date_begin)
    if (m.isValid()) {
      where += ` AND actdate >= '${m.format(dateFormat)}' `
    }
  }

  if (date_end) {
    const m = moment(date_end)
    if (m.isValid()) {
      where += ` AND actdate >= '${m.format(dateFormat)}' `
    }
  }

  if (time_begin) {
    const t = moment(time_begin)
    if (t.isValid()) {
      where += ` AND acttime >= '${t.format(timeFormat)}' `
    }
  }

  if (time_end) {
    const t = moment(time_end)
    if (t.isValid()) {
      where += ` AND acttime >= '${t.format(timeFormat)}' `
    }
  }

  const sql = `SELECT * FROM \`activity\` JOIN \`artist\` ON activity.artist_id = artist.id ${where} ORDER BY actid ASC`
  console.log(sql)
  const [rows] = await db.query(sql)

  rows.forEach((el) => {
    const m = moment(el.actdate)
    const t = moment(el.acttime, 'HH:mm:ss')
    // 無效的日期格式，使用空字串
    el.actdate = m.isValid() ? m.format(dateFormat) : null
    el.acttime = t.isValid() ? t.format(timeFormat) : null
  })

  success = true
  return {
    success,
    rows,
    qs: req.query,
  }
}

router.get('/', async (req, res) => {
  try {
    const data = await getListData(req)
    res.json(data)
  } catch (error) {
    console.error('Error in /api route:', error)
    res.status(500).json({ success: false, error: 'Internal Server Error' })
  }
})

//取得單項資料的 API // 點入單筆資料的話是用這個渲染嗎？
router.get('/:actid', async (req, res) => {
  const actid = +req.params.actid || 0 // 轉換為數字
  if (!actid) {
    return res.json({ success: false, error: '沒有編號' })
  }
  const t_sql = `SELECT * FROM activity JOIN artist ON activity.artist_id = artist.id WHERE actid=${actid}`
  const [rows] = await db.query(t_sql)
  if (!rows.length) {
    // 沒有該筆資料
    return res.json({ success: false, error: '沒有該筆資料' })
  }
  const m = moment(rows[0].actdate)
  const t = moment(rows[0].acttime, 'HH:mm:ss')
  rows[0].actdate = m.isValid() ? m.format(dateFormat) : ''
  rows[0].acttime = t.isValid() ? t.format(timeFormat) : ''
  res.json({ success: true, data: rows[0] })
})

export default router
