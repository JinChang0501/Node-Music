import express from 'express'
import crypto from 'crypto'
import 'dotenv/config.js'
import authenticate from '#middlewares/authenticate.js'
import { v4 as uuidv4 } from 'uuid'
import db from '../utils/connect-mysql.js'

const router = express.Router()

// 生成 7 位訂單編號
function generateOrderId(length) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length)
    result += characters[randomIndex]
  }
  return result
}

// 計算 CheckMacValue
function generateCheckMacValue(params, HashKey, HashIV) {
  const sortedParams = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&')

  const strToSign = `HashKey=${HashKey}&${sortedParams}&HashIV=${HashIV}`
  const checkMacValue = crypto
    .createHash('sha256')
    .update(strToSign)
    .digest('hex')
    .toUpperCase()

  return checkMacValue
}

router.post('/', async (req, res) => {
  try {
    if (req.method !== 'POST') {
      return res.status(405).json({ message: 'Method not allowed' })
    }

    authenticate(req, res, async () => {
      const { selectedSeatDetails, actid } = req.body
      const userId = req.user.id // 從 authenticate 中間件獲取用戶 ID

      const orderNum = generateOrderId(7)

      try {
        // 將訂單資訊寫入資料庫
        for (const seat of selectedSeatDetails) {
          await db.execute(
            'INSERT INTO ticket (activity_id, seat_area, seat_row, seat_number, price, member_id, order_num, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, NOW())',
            [
              actid,
              seat.area,
              seat.row,
              seat.number,
              seat.price,
              userId,
              orderNum,
            ]
          )
        }

        // 計算總金額
        const totalAmount = selectedSeatDetails.reduce(
          (sum, seat) => sum + seat.price,
          0
        )

        // ECPay 相關設定
        const MerchantID = process.env.ECPAY_MERCHANT_ID
        const HashKey = process.env.ECPAY_HASH_KEY
        const HashIV = process.env.ECPAY_HASH_IV
        const PaymentType = 'aio'
        const TotalAmount = totalAmount
        const TradeDesc = '演唱會門票'
        const ItemName = selectedSeatDetails
          .map((seat) => `${seat.area} ${seat.row}排 ${seat.number}號`)
          .join('#')
        const ReturnURL = `${process.env.NEXT_PUBLIC_API_URL}/api/ecpay-callback`
        const ClientBackURL = `${process.env.NEXT_PUBLIC_BASE_URL}/ticket/concert/finish/${actid}`
        const MerchantTradeDate = new Date().toLocaleString('zh-TW', {
          hour12: false,
        })
        const MerchantTradeNo = orderNum

        // 計算 CheckMacValue
        const params = {
          MerchantID,
          MerchantTradeNo,
          MerchantTradeDate,
          PaymentType,
          TotalAmount,
          TradeDesc,
          ItemName,
          ReturnURL,
          ClientBackURL,
          // 其他必要參數...
        }

        const CheckMacValue = generateCheckMacValue(params, HashKey, HashIV)

        // 準備 ECPay 表單資料
        const ecpayForm = {
          ...params,
          CheckMacValue,
          EncryptType: 1,
          // 其他必要欄位...
        }

        res.status(200).json({
          success: true,
          orderNum,
          ecpayForm,
        })
      } catch (error) {
        console.error('Error creating order:', error)
        res
          .status(500)
          .json({ success: false, message: 'Error creating order' })
      }
    })
  } catch (error) {
    console.error('訂單創建錯誤:', error)
    res
      .status(500)
      .json({ success: false, message: '訂單創建失敗', error: error.message })
  }
})

export default router
