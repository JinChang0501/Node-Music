import express from 'express'
import moment from 'moment-timezone'
import db from '../utils/connect-mysql.js'

const router = express.Router()
const dateFormat = 'YYYY-MM-DD'

const getListData = async (req) => {
  let success = false

  let keyword = req.query.keyword || ''
  let genres = req.query.genres || ''

  let where = ' WHERE 1 '
  if (keyword) {
    // where += ` AND \`actname\` LIKE '%${keyword}%' ` // 沒有處理 SQL injection
    const keyword_ = db.escape(`%${keyword}%`)
    console.log(keyword_)
    where += ` AND \`art_name\` LIKE ${keyword_} ` // 處理 SQL injection
  }

  if (genres) {
    if (genres === '0') {
      where += ` AND \`genres\` = "搖滾" `
    } else if (genres === '1') {
      where += ` AND \`genres\` = "獨立" `
    } else if (genres === '2') {
      where += ` AND \`genres\` = "龐克" `
    } else if (genres === '3') {
      where += ` AND \`genres\` = "流行" `
    } else if (genres === '4') {
      where += ` AND \`genres\` = "金屬" `
    } else if (genres === '5') {
      where += ` AND \`genres\` = "民謠" `
    } else if (genres === '6') {
      where += ` AND \`genres\` = "爵士藍調" `
    } else {
      // 全部，就不篩
    }
  }

  const sql = `
    SELECT * FROM \`artist\` ${where} `
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
    const data = await getListData(req)
    res.json(data)
  } catch (error) {
    console.error('Error in /api route:', error)
    res.status(500).json({ success: false, error: 'Internal Server Error' })
  }
})

// 單項的頁面要fetch多筆，藝人可能參與多個活動

router.get('/:artid', async (req, res) => {
  const artid = req.params.artid || 0 // spotify_id 是字串
  if (!artid) {
    return res.json({ success: false, error: '沒有編號' })
  }
  const t_sql = `
  SELECT e.actid, e.actname, e.actdate, e.picinfrontend, ea.eaid, ea.event_id, ea.artist_id, a.id, a.art_name, a.photo, a.photoname, a.album, a.shortDes, a.spotify_id 
  FROM \`activity\` as e
  JOIN \`event_artists\` as ea ON e.actid = ea.event_id 
  JOIN \`artist\` as a ON ea.artist_id = a.id 
  WHERE a.spotify_id="${artid}" 
  ORDER BY e.actdate 
  ASC`
  const [rows2] = await db.query(t_sql)

  rows2.forEach((el) => {
    const m = moment(el.actdate)
    // 無效的日期格式，使用空字串
    el.actdate = m.isValid() ? m.format(dateFormat) : ''
  })

  if (!rows2.length) {
    // 沒有該筆資料
    return res.json({ success: false, error: '沒有該筆資料' })
  }
  res.json({ success: true, rows2: rows2 })
})

// 取得單項資料的 API // 點入單筆資料的話是用這個渲染嗎？
// router.get("/:actid", async (req, res) => {
//   const actid = +req.params.actid || 0 // 轉換為數字
//   if (!actid) {
//     return res.json({ success: false, error: "沒有編號" })
//   }
//   const t_sql = `SELECT * FROM activity JOIN artist ON activity.artist_id = artist.id WHERE actid=${actid}`
//   const [rows] = await db.query(t_sql)
//   if (!rows.length) {
//     // 沒有該筆資料
//     return res.json({ success: false, error: "沒有該筆資料" })
//   }
//   const m = moment(rows[0].actdate)
//   const t = moment(rows[0].acttime, 'HH:mm:ss')
//   rows[0].actdate = m.isValid() ? m.format(dateFormat) : ''
//   rows[0].acttime = t.isValid() ? t.format(timeFormat) : ''
//   res.json({ success: true, data: rows[0] })
// })

export default router
