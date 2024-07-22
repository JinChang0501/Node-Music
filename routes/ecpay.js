import express from 'express'
import * as crypto from 'crypto'
import 'dotenv/config.js'
import authenticate from '#middlewares/authenticate.js'
import { v4 as uuidv4 } from 'uuid'
import db from '../utils/connect-mysql.js'
import { createLinePayClient } from 'line-pay-merchant'

const MerchantID = process.env.ECPAY_MERCHANT_ID //必填
const HashKey = process.env.ECPAY_HASH_KEY //3002607
const HashIV = process.env.ECPAY_HASH_IV //3002607
let isStage = process.env.ECPAY_TEST // 測試環境： true；正式環境：false
const ReturnURL = process.env.ECPAY_RETURN_URL
const OrderResultURL = 'http://localhost:3000/ticket/concert/finish/1'
const ReactClientBackURL = process.env.ECPAY_ORDER_CALLBACK_URL

const linePayClient = createLinePayClient({
  channelId: process.env.LINE_PAY_CHANNEL_ID,
  channelSecretKey: process.env.LINE_PAY_CHANNEL_SECRET,
  env: process.env.NODE_ENV,
})
const router = express.Router()

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

router.post('/create-order', authenticate, async (req, res) => {
  const userId = req.user.id

  const selectedSeatDetails = req.body.selectedSeatDetails

  if (!selectedSeatDetails || selectedSeatDetails.length === 0) {
    return res
      .status(400)
      .json({ status: 'error', message: '選擇的座位詳細信息缺失' })
  }

  const id = generateRandomString(7)
  const packageId = uuidv4()

  // 要傳送給 LINE Pay 的訂單資訊
  const order = {
    id: id,
    currency: 'TWD',
    amount: req.body.amount,
    packages: [
      {
        id: packageId,
        amount: req.body.amount,
        products: req.body.products,
      },
    ],
    options: { display: { locale: 'zh_TW' } },
  }

  // 設置資料庫更新操作
  const updatePromises = selectedSeatDetails.map((seat) => {
    return db.query(
      'UPDATE ticket SET member_id = ?, order_num = ?, amount = ?, order_info = ? WHERE tid = ?',
      [userId, order.id, req.body.amount, JSON.stringify(order), seat.tid]
    )
  })

  try {
    await Promise.all(updatePromises)
    res.json({ status: 'success', data: { order } })
  } catch (error) {
    console.error('資料儲存錯誤:', error)
    res.status(500).json({ status: 'error', message: '訂單創建失敗' })
  }
})

router.get('/payment', authenticate, async (req, res) => {
  const id = req.query.id

  try {
    // 從資料庫取得訂單資料
    const [rows] = await db.query('SELECT * FROM ticket WHERE order_num = ?', [
      id,
    ])
    const orderRecord = rows[0]

    if (!orderRecord) {
      return res
        .status(404)
        .json({ status: 'error', message: '訂單資料未找到' })
    }

    // 從資料庫或其他來源獲取 selectedSeatDetails 資料
    const [seatDetailsRows] = await db.query(
      'SELECT * FROM ticket WHERE order_num = ?',
      [id]
    )
    const selectedSeatDetails = seatDetailsRows.map((seat) => ({
      name: `${seat.seat_area} 區 ${seat.seat_row} 排 ${seat.seat_number} 號`,
      price: seat.price,
    }))

    // 組合 ItemName 字段
    const itemNames = selectedSeatDetails
      .map((seat) => `[${seat.name}]`)
      .join('、')

    const TotalAmount = orderRecord.amount
    const TradeDesc = '商店線上付款'
    const ItemName = `訂單編號: ${orderRecord.order_num}、${itemNames}`
    const ChoosePayment = 'ALL'

    const stage = isStage ? '-stage' : ''
    const algorithm = 'sha256'
    const digest = 'hex'
    const APIURL = `https://payment${stage}.ecpay.com.tw/Cashier/AioCheckOut/V5`

    const MerchantTradeNo = generateRandomString(7)
    const MerchantTradeDate = new Date().toLocaleDateString('zh-TW', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    })

    let ParamsBeforeCMV = {
      MerchantID: MerchantID,
      MerchantTradeNo: MerchantTradeNo,
      MerchantTradeDate: MerchantTradeDate.toString(),
      PaymentType: 'aio',
      EncryptType: 1,
      TotalAmount: TotalAmount,
      TradeDesc: TradeDesc,
      ItemName: ItemName,
      ChoosePayment: ChoosePayment,
      ReturnURL,
      OrderResultURL,
    }

    const CheckMacValue = CheckMacValueGen(ParamsBeforeCMV, algorithm, digest)

    const AllParams = { ...ParamsBeforeCMV, CheckMacValue }
    console.log('AllParams:', AllParams)

    const inputs = Object.entries(AllParams)
      .map(function (param) {
        return `<input name=${param[0]} value="${param[1].toString()}"><br/>`
      })
      .join('')

    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>Mak'in 製噪</title>
</head>
<body>
    <form method="post" action="${APIURL}">
${inputs}
<input type="submit" value="送出參數">
    </form>
</body>
</html>
`

    res.send(htmlContent)
  } catch (error) {
    console.error('取得訂單資料錯誤:', error)
    res.status(500).json({ status: 'error', message: '取得訂單資料失敗' })
  }
})

router.get('/confirm', async (req, res) => {
  const transactionId = req.query.transactionId

  try {
    // 從資料庫取得交易資料
    const [rows] = await db.query(
      'SELECT * FROM ticket WHERE transaction_id = ?',
      [transactionId]
    )
    const dbOrder = rows[0]

    console.log(dbOrder)

    const transaction = JSON.parse(dbOrder.order_info)

    console.log(transaction)

    const amount = transaction.amount

    const linePayResponse = await linePayClient.confirm.send({
      transactionId: transactionId,
      body: {
        currency: 'TWD',
        amount: amount,
      },
    })

    console.log(linePayResponse)

    let status = 'paid'

    if (linePayResponse.body.returnCode !== '0000') {
      status = 'fail'
    }

    await db.query(
      'UPDATE ticket SET status = ?, return_code = ?, confirm = ? WHERE tid = ?',
      [
        status,
        linePayResponse.body.returnCode,
        JSON.stringify(linePayResponse.body),
        dbOrder.tid,
      ]
    )

    return res.json({ status: 'success', data: linePayResponse.body })
  } catch (error) {
    return res.json({ status: 'fail', data: error.data })
  }
})

router.post('/result', async (req, res) => {
  console.log('綠界回傳的資料如下：')
  console.log(req.body)

  res.redirect(
    ReactClientBackURL + '?' + new URLSearchParams(req.body).toString()
  )
})

export default router
