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
  let actClass = req.query.actClass || ''
  let area = req.query.area || ''
  let dateRange = req.query.dateRange || ''

  let date_begin = req.query.date_begin || ''
  let date_end = req.query.date_end || ''
  // let time_begin = req.query.time_begin || ""
  // let time_end = req.query.time_end || ""

  let where = ' WHERE 1 '
  if (keyword) {
    // where += ` AND \`actname\` LIKE '%${keyword}%' ` // 沒有處理 SQL injection
    const keyword_ = db.escape(`%${keyword}%`)
    console.log(keyword_)
    where += ` AND (\`actname\` LIKE ${keyword_} OR \`location\` LIKE ${keyword_} OR \`descriptions\` LIKE ${keyword_} OR \`art_name\` LIKE ${keyword_})` // 處理 SQL injection
  }

  if (actClass) {
    if (actClass === '1') {
      where += ` AND \`class\` = "concert" `
    } else if (actClass === '2') {
      where += ` AND \`class\` = "festival" `
    } else {
      // 全部，就不篩
    }
  }

  if (area) {
    if (area === '1') {
      where += ` AND \`area\` = "北部" `
    } else if (area === '2') {
      where += ` AND \`area\` = "中部" `
    } else if (area === '3') {
      where += ` AND \`area\` = "南部" `
    } else {
      // 全部，就不篩
    }
  }

  // 日期 篩選
  let startDate, endDate
  // const today = moment()
  if (dateRange === 'two_weeks') {
    startDate = moment()
    endDate = moment().add(2, 'weeks')
    where += ` AND actdate >= '${startDate.format(dateFormat)}' AND actdate <= '${endDate.format(dateFormat)}' `
  } else if (dateRange === 'this_month') {
    startDate = moment().startOf('month')
    endDate = moment().endOf('month')
    where += ` AND actdate >= '${startDate.format(dateFormat)}' AND actdate <= '${endDate.format(dateFormat)}' `
  } else if (dateRange === 'next_month') {
    startDate = moment().add(1, 'month').startOf('month')
    endDate = moment().add(1, 'month').endOf('month')
    where += ` AND actdate >= '${startDate.format(dateFormat)}' AND actdate <= '${endDate.format(dateFormat)}' `
  }
  // if (dateRange) {
  //   if (dateRange === 'two_weeks') {
  //     startDate = today
  //     endDate = today.clone().add(2, 'weeks')
  //     where += ` AND actdate >= '${startDate.format(dateFormat)}' AND actdate <= '${endDate.format(dateFormat)}' `
  //   } else if (dateRange === 'this_month') {
  //     startDate = today.startOf('month')
  //     endDate = today.endOf('month')
  //     where += ` AND actdate >= '${startDate.format(dateFormat)}' AND actdate <= '${endDate.format(dateFormat)}' `
  //   } else if (dateRange === 'next_month') {
  //     startDate = today.clone().add(1, 'month').startOf('month')
  //     endDate = today.clone().add(1, 'month').endOf('month')
  //     where += ` AND actdate >= '${startDate.format(dateFormat)}' AND actdate <= '${endDate.format(dateFormat)}' `
  //   } else {
  //     // 全部，就不篩
  //   }
  // }

  if (date_begin) {
    const m = moment(date_begin)
    if (m.isValid()) {
      where += ` AND actdate >= '${m.format(dateFormat)}' `
    }
  }

  if (date_end) {
    const m = moment(date_end)
    if (m.isValid()) {
      where += ` AND actdate <= '${m.format(dateFormat)}' `
    }
  }

  const sql = `
    SELECT 
    e.actid, e.class, e.actname, e.actdate, e.acttime, e.location, e.area, e.picture, e.cover, e.picinfrontend, e.mingpic, e.descriptions, GROUP_CONCAT(a.art_name ORDER BY a.art_name SEPARATOR ', ') AS artists
    FROM \`activity\` AS e
    JOIN \`event_artists\` AS ea ON e.actid = ea.event_id
    JOIN \`artist\` AS a ON ea.artist_id = a.id 
    ${where} 
    GROUP BY e.actid, e.class, e.actname, e.actdate, e.acttime, e.location, e.area, e.picture, e.cover, e.picinfrontend, e.mingpic, e.descriptions
    ORDER BY e.actdate
    ASC`
  console.log(sql)
  const [rows] = await db.query(sql)

  rows.forEach((el) => {
    const m = moment(el.actdate)
    const t = moment(el.acttime, 'HH:mm:ss')
    // 無效的日期格式，使用空字串
    el.actdate = m.isValid() ? m.format(dateFormat) : ''
    el.acttime = t.isValid() ? t.format(timeFormat) : ''
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

// 0714改寫，單項的頁面我還是需要fetch多筆，需注意藝人部分是多個

router.get('/:actid', async (req, res) => {
  const actid = +req.params.actid || 0 // 轉換為數字
  if (!actid) {
    return res.json({ success: false, error: '沒有編號' })
  }
  const t_sql = `
  SELECT actid, class, actname, picinfrontend, mingpic, eaid, event_id, event_artists.artist_id, id, art_name, photo, photoname, spotify_id 
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
