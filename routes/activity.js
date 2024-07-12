import express from "express"
import moment from "moment-timezone"
import db from "./../utils/connect-mysql.js"

// 檢查空物件, 轉換req.params為數字
import { getIdParam } from '#db-helpers/db-tool.js'

// 資料庫使用
import sequelize from '#configs/db.js'
const { Activity } = sequelize.models
import { QueryTypes, Op } from 'sequelize'

const router = express.Router()
// const dateFormat = "YYYY-MM-DD"
// const timeFormat = "HH:mm"

// const getListData = async (req) => {
//   let success = false
//   // let redirect = ""

//   let keyword = req.query.keyword || ""
//   let date_begin = req.query.date_begin || ""
//   let date_end = req.query.date_end || ""
//   let time_begin = req.query.time_begin || ""
//   let time_end = req.query.time_end || ""

//   let where = " WHERE 1 "
//   if (keyword) {
//     // where += ` AND \`name\` LIKE '%${keyword}%' ` // 沒有處理 SQL injection
//     const keyword_ = db.escape(`%${keyword}%`)
//     console.log(keyword_)
//     where += ` AND (\`name\` LIKE ${keyword_} OR \`location\` LIKE ${keyword_}OR \`descriptions\` LIKE ${keyword_})` // 處理 SQL injection
//   }
//   if (date_begin) {
//     const m = moment(date_begin)
//     if (m.isValid()) {
//       where += ` AND actdate >= '${m.format(dateFormat)}' `
//     }
//   }

//   if (date_end) {
//     const m = moment(date_end)
//     if (m.isValid()) {
//       where += ` AND actdate >= '${m.format(dateFormat)}' `
//     }
//   }

//   if (time_begin) {
//     const t = moment(time_begin)
//     if (t.isValid()) {
//       where += ` AND acttime >= '${t.format(timeFormat)}' `
//     }
//   }

//   if (time_end) {
//     const t = moment(time_end)
//     if (t.isValid()) {
//       where += ` AND acttime >= '${t.format(timeFormat)}' `
//     }
//   }

//   const sql = `SELECT * FROM \`activity\` JOIN \`artist\` ON activity.artist_id = artist.id ${where} ORDER BY actid ASC`
//   console.log(sql)
//   const [rows] = await db.query(sql)

//   rows.forEach((el) => {
//     const m = moment(el.actdate)
//     const t = moment(el.acttime, 'HH:mm:ss')
//     // 無效的日期格式，使用空字串
//     el.actdate = m.isValid() ? m.format(dateFormat) : null
//     el.acttime = t.isValid() ? t.format(timeFormat) : null
//   })

//   success = true
//   return {
//     success,
//     rows,
//     qs: req.query,
//   }
// }

// {
//   "actid": 1,
//   "class": "concert",
//   "name": "一生到底 One Life, One Shot",
//   "actdate": "2024-06-15",
//   "acttime": "19:30",
//   "a_datetime": "2024-06-15T11:30:00.000Z",
//   "location": "臺北流行音樂中心",
//   "area": "北部",
//   "address": "台北市南港區市民大道8段99號",
//   "descriptions": "一生到底 One Life,One Shot人生像場一鏡到底的電影，時間不曾為誰停下，",
//   "organizer": "火氣音樂",
//   "artist_id": 5,
//   "picture": "https://i.postimg.cc/v8Vr7zcZ/temp-Image-GXQJZ9.avif",
//   "cover": "https://i.postimg.cc/tTVx5qRM/temp-Image-GTMpop.avif",
//   "created_at": "2024-07-08T08:26:37.000Z",
//   "updated_at": "2024-07-08T08:26:37.000Z",
//   "id": 5,
//   "art_name": "薄暮 Evenfall",
//   "photo": null,
//   "followers": 362,
//   "introduction": "性別：",
//   "debutDate": "2022-08-30T16:00:00.000Z",
//   "album": 4,
//   "albumDate": "2024-02-21T16:00:00.000Z"
// }
router.get("/", async (req, res) => {
  const genConcatRegexp = (param, column) => {
    return sequelize.where(
      sequelize.fn('CONCAT', ',', sequelize.col(column), ','),
      {
        [Op.regexp]: `,(${param.split(',').join('|')}),`,
      }
    )
  }

  // 建立各where條件從句用
  const genClause = (key, value) => {
    switch (key) {
      case 'name_like':
        return {
          name: {
            [Op.like]: `%${value}%`,
          },
        }
      case 'actClass':
        return genConcatRegexp(value, 'actClass')
      case 'area':
        return genConcatRegexp(value, 'area')
      // case 'price_gte':
      //   // 會有'0'字串的情況，注意要跳過此條件
      //   if (!Number(value)) return ''

      //   return {
      //     price: {
      //       [Op.gte]: Number(value),
      //     },
      //   }
      // case 'price_lte':
      //   // 會有'0'字串的情況，注意要跳過此條件
      //   if (!Number(value)) return ''

      //   return {
      //     price: {
      //       [Op.lte]: Number(value),
      //     },
      //   }
      default:
        return ''
    }
  }

  // where各條件(以AND相連)
  const conditions = []
  for (const [key, value] of Object.entries(req.query)) {
    if (value) {
      conditions.push(genClause(key, value))
    }
  }
  // console.log(conditions)

  // // 排序用
  // const orderDirection = req.query.order || 'ASC'
  // const order = req.query.sort
  //   ? [[req.query.sort, orderDirection]]
  //   : [['id', 'ASC']]

  // 避免sql查詢錯誤導致後端當掉，使用try/catch語句
  try {
    const { count, rows } = await Activity.findAndCountAll({
      where: { [Op.and]: conditions },
      raw: true, // 只需要資料表中資料,
      // logging: (msg) => console.log(msg.bgWhite),
      // offset,
      // limit,
      // order,
    })

    if (req.query.raw === 'true') {
      return res.json(rows)
    }

    return res.json({
      status: 'success',
      data: {
        total: count,
        activity: rows,
      },
    })
  } catch (e) {
    console.log(e)

    return res.json({
      status: 'error',
      message: '無法查詢到資料，查詢字串可能有誤',
    })
  }
})

// 獲得單筆資料
router.get('/:id', async (req, res, next) => {
  // 轉為數字
  const actid = getIdParam(req)

  // 只會回傳單筆資料
  const activity = await Activity.findByPk(actid, {
    raw: true, // 只需要資料表中資料
  })

  return res.json({ status: 'success', data: { activity } })
})

//取得單項資料的 API // 點入單筆資料的話是用這個渲染嗎？
// router.get("/:actid", async (req, res) => {
//   const actid = +req.params.actid || 0
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