import express from 'express'
const router = express.Router()

// 中介軟體，存取隱私會員資料用
import authenticate from '#middlewares/authenticate.js'

// 檢查空物件, 轉換req.params為數字
import { getIdParam } from '#db-helpers/db-tool.js'

// 資料庫使用
import db from '../utils/connect-mysql.js'

// GET - 得到所有登入之會員的購物紀錄
router.get('/', authenticate, async function (req, res) {
  const id = +req.user.id

  const sql = `select b.id as member_id, c.actid as activity_id,c.actname,c.descriptions,c.picture,c.cover,c.class as actClass from favorite as a join member as b on a.member_id = b.id join activity as c on a.item_id = c.actid where a.member_id = ${id};`

  const [result] = await db.query(sql)
  // res.json({ result })
  return res.json({ status: 'success', data: { result } })
  // 處理如果沒找到資料
})

export default router