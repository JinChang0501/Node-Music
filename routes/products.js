import express from 'express'
const router = express.Router()
import authenticate from '#middlewares/authenticate.js'

// 檢查空物件, 轉換req.params為數字
import { getIdParam } from '#db-helpers/db-tool.js'

// 資料庫使用
import sequelize from '#configs/db.js'
const { Product } = sequelize.models
import { QueryTypes, Op } from 'sequelize'
import db from '#configs/mysql.js'

/* 
測試連結:
/products?page=3&perpage=10&brand_ids=1,2,4&cat_ids=4,5,6,10,11,12&color_ids=1,2&size_ids=2,3&tag_ids=1,2,4&name_like=e&price_gte=1500&price_lte=10000&sort=price&order=asc
*/
// GET 獲得所有資料，加入分頁與搜尋字串功能，單一資料表處理
router.get('/', async (req, res) => {
  const sql = `select * from product order by id asc`

  const data = await db.query(sql)
  try {
    return res.json(data[0])
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
  const id = getIdParam(req)

  // 只會回傳單筆資料
  const product = await Product.findByPk(id, {
    raw: true, // 只需要資料表中資料
  })

  return res.json({ status: 'success', data: { product } })
})

// 獲得所有資料(測試用，不適合資料太多使用)
// router.get('/', async (req, res, next) => {
//   const products = await Product.findAll({ raw: true })
//   res.json({ status: 'success', data: { products } })
// })

// 前端到后端
router.post('/post', authenticate, async (req, res) => {
  const idm = +req.user.id

  function generateRandomString() {
    const length = 7
    const characters =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''

    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length)
      result += characters.charAt(randomIndex)
    }

    return result
  }

  const randomString = generateRandomString()

  // 提取请求体中的数据
  const { items = [] } = req.body
  const store711 = JSON.parse(req.body.storageKey2)
  console.log('store711:', store711)

  // 确保 items 是数组并包含数据
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({
      status: 'error',
      message: 'Items is required and should be an array',
    })
  }

  // 处理每个 item
  try {
    const insertPromises = items.map(async (item) => {
      const {
        product_id,
        quantity,
        // payment_method,
        // pickup_method,
      } = item

      const sql =
        'INSERT INTO `order_detail`( `order_num`, `member_id`, `product_id`, `quantity`, `payment_method`, `pickup_method`, `TempVar`, `outside`, `ship`, `storeid`, `storename`, `storeaddress`, `created_at`) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,NOW());'

      // 执行数据库操作
      const [result] = await db.query(sql, [
        randomString,
        idm,
        product_id,
        quantity,
        '現金',
        '7-11',
        store711.TempVar,
        store711.outside,
        store711.ship,
        store711.storeid,
        store711.storename,
        store711.storeaddress,
      ])
      return {
        randomString, // 获取插入记录的 ID
      }
    })

    const results = await Promise.all(insertPromises)

    return res.json({
      status: 'success',
      message: '訂單寫入成功',
      data: { results },
    })
  } catch (error) {
    console.error('Database query error:', error)
    res.status(500).json({
      status: 'error',
      message: 'Database query error',
    })
  }
})
export default router
