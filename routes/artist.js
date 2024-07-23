import express from 'express'
import db from '../utils/connect-mysql.js'

const router = express.Router()

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

// 0714改寫，單項的頁面我還是需要fetch多筆，需注意藝人部分是多個

router.get('/:actid', async (req, res) => {
  const actid = +req.params.actid || 0 // 轉換為數字
  if (!actid) {
    return res.json({ success: false, error: '沒有編號' })
  }
  const t_sql = `
  SELECT actid, class, actname, eaid, event_id, event_artists.artist_id, id, art_name, photo 
  FROM \`activity\` 
  JOIN \`event_artists\` ON activity.actid = event_artists.event_id 
  JOIN \`artist\` ON event_artists.artist_id = artist.id 
  WHERE actid=${actid} 
  ORDER BY actdate 
  ASC`
  const [rows2] = await db.query(t_sql)
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
