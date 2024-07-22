import express from 'express'
import 'dotenv/config.js'
import authenticate from '#middlewares/authenticate.js'
import { v4 as uuidv4 } from 'uuid'
import db from '../utils/connect-mysql.js'
import crypto from 'crypto'

const router = express.Router()

const MerchantID = process.env.ECPAY_MERCHANT_ID // 必填
const HashKey = process.env.ECPAY_HASH_KEY // 必填
const HashIV = process.env.ECPAY_HASH_IV // 必填
const isStage = process.env.ECPAY_TEST === 'true' // 測試環境： true；正式環境：false
const stage = isStage ? '-stage' : ''
const algorithm = 'sha256'
const digest = 'hex'
const APIURL = `https://payment${stage}.ecpay.com.tw/Cashier/AioCheckOut/V5`

function generateRandomString(length) {
  const characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length)
    result += characters[randomIndex]
  }
  return result
}

function CheckMacValueGen(parameters, algorithm, digest) {
  // const crypto = require('crypto')
  let Step0

  Step0 = Object.entries(parameters)
    .map(([key, value]) => `${key}=${value}`)
    .join('&')

  function DotNETURLEncode(string) {
    const list = {
      '%2D': '-',
      '%5F': '_',
      '%2E': '.',
      '%21': '!',
      '%2A': '*',
      '%28': '(',
      '%29': ')',
      '%20': '+',
    }

    Object.entries(list).forEach(([encoded, decoded]) => {
      const regex = new RegExp(encoded, 'g')
      string = string.replace(regex, decoded)
    })

    return string
  }

  const Step1 = Step0.split('&')
    .sort((a, b) => {
      const keyA = a.split('=')[0]
      const keyB = b.split('=')[0]
      return keyA.localeCompare(keyB)
    })
    .join('&')
  const Step2 = `HashKey=${HashKey}&${Step1}&HashIV=${HashIV}`
  const Step3 = DotNETURLEncode(encodeURIComponent(Step2))
  const Step4 = Step3.toLowerCase()
  const Step5 = crypto.createHash(algorithm).update(Step4).digest(digest)
  const Step6 = Step5.toUpperCase()
  return Step6
}

router.post('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.id
    const { selectedSeatDetails, amount, products, actid } = req.body

    if (!selectedSeatDetails || selectedSeatDetails.length === 0) {
      return res
        .status(400)
        .json({ status: 'error', message: '選擇的座位詳細信息缺失' })
    }

    const orderNum = generateRandomString(7)
    const packageId = uuidv4()

    // 要傳送給 ECPay 的訂單資訊
    const order = {
      id: orderNum,
      currency: 'TWD',
      amount,
      packages: [
        {
          id: packageId,
          amount,
          products,
        },
      ],
      options: { display: { locale: 'zh_TW' } },
    }

    // 設置資料庫更新操作
    const updatePromises = selectedSeatDetails.map((seat) => {
      return db.query(
        'UPDATE ticket SET member_id = ?, order_num = ?, amount = ?, order_info = ? WHERE tid = ?',
        [userId, order.id, amount, JSON.stringify(order), seat.tid]
      )
    })
    await Promise.all(updatePromises)

    // 從資料庫獲取訂單記錄
    const [rows] = await db.query('SELECT * FROM ticket WHERE order_num = ?', [
      orderNum,
    ])
    const orderRecord = rows[0]

    if (!orderRecord) {
      return res
        .status(404)
        .json({ status: 'error', message: '訂單資料未找到' })
    }

    // 獲取選擇座位的詳細信息
    const [seatDetailsRows] = await db.query(
      'SELECT * FROM ticket WHERE order_num = ?',
      [orderNum]
    )
    const seatDetails = seatDetailsRows.map((seat) => ({
      name: `${seat.seat_area} 區 ${seat.seat_row} 排 ${seat.seat_number} 號`,
      price: seat.price,
    }))

    // 組合 ItemName 字段
    const itemNames = seatDetails.map((seat) => `[${seat.name}]`).join('、')

    const TotalAmount = orderRecord.amount
    const TradeDesc = '商店線上付款'
    const ItemName = `訂單編號: ${orderRecord.order_num}、${itemNames}`
    const ChoosePayment = 'ALL'
    const ReturnURL = `http://localhost:3000/ticket/concert/finish/${actid}`
    const OrderResultURL = 'http://localhost:3005/api/ecpay/callback'

    // 計算 CheckMacValue
    const MerchantTradeNo = `od${new Date().getFullYear()}${(
      new Date().getMonth() + 1
    )
      .toString()
      .padStart(2, '0')}${new Date()
      .getDate()
      .toString()
      .padStart(2, '0')}${new Date()
      .getHours()
      .toString()
      .padStart(2, '0')}${new Date()
      .getMinutes()
      .toString()
      .padStart(2, '0')}${new Date()
      .getSeconds()
      .toString()
      .padStart(2, '0')}${new Date().getMilliseconds().toString().padStart(2)}`

    const MerchantTradeDate = new Date()
      .toISOString()
      .replace('T', ' ')
      .substring(0, 19)
      .replace(/-/g, '/')

    let ParamsBeforeCMV = {
      MerchantID: MerchantID,
      MerchantTradeNo: MerchantTradeNo,
      MerchantTradeDate: MerchantTradeDate.toString(),
      PaymentType: 'aio',
      EncryptType: 1,
      TotalAmount: TotalAmount,
      TradeDesc: TradeDesc,
      ItemName: ItemName,
      ReturnURL: ReturnURL,
      ChoosePayment: ChoosePayment,
      OrderResultURL,
    }

    const CheckMacValue = CheckMacValueGen(ParamsBeforeCMV, algorithm, digest)

    // 將所有的參數製作成 payload
    const AllParams = { ...ParamsBeforeCMV, CheckMacValue }
    const inputs = Object.entries(AllParams)
      .map(function (param) {
        return `<input name=${param[0]} value="${param[1].toString()}"><br/>`
      })
      .join('')

    // 製作送出畫面
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
          <title></title>
      </head>
      <body>
          <form method="post" action="${APIURL}">
      ${inputs}
      <input type="submit" value="送出參數" style="display:none">
          </form>
      <script>
        document.forms[0].submit();
      </script>
      </body>
      </html>
      `

    res.json({ htmlContent })
  } catch (error) {
    console.error('處理訂單時出錯:', error)
    res.status(500).json({ status: 'error', message: '處理訂單時發生錯誤' })
  }
})

// 添加 ECPay 回調處理的路由
router.post('/callback', async (req, res) => {
  try {
    const { MerchantTradeNo, RtnCode, OrderResultURL } = req.body

    // 根據 MerchantTradeNo 獲取訂單資料
    const [rows] = await db.query('SELECT * FROM ticket WHERE order_num = ?', [
      MerchantTradeNo,
    ])
    const orderRecord = rows[0]

    if (!orderRecord) {
      return res
        .status(404)
        .json({ status: 'error', message: '訂單資料未找到' })
    }

    // 判斷付款結果
    let status, payment, created_at
    if (RtnCode === '1') {
      // ECPay 的回調狀態碼 1 代表付款成功
      status = '已付款'
      payment = '信用卡'
      created_at = new Date().toISOString().slice(0, 19).replace('T', ' ')
    } else {
      status = '付款失敗'
      payment = null
      created_at = null
    }

    // 更新資料表
    await db.query(
      'UPDATE ticket SET payment = ?, created_at = ?, status = ? WHERE order_num = ?',
      [payment, created_at, status, MerchantTradeNo]
    )

    // 重定向到完成頁面
    res.redirect(OrderResultURL)
  } catch (error) {
    console.error('處理付款回調時出錯:', error)
    res.status(500).json({ status: 'error', message: '處理付款回調時發生錯誤' })
  }
})

export default router
