import express from 'express'
import * as crypto from 'crypto'
import 'dotenv/config.js'
import authenticate from '#middlewares/authenticate.js'
import { v4 as uuidv4 } from 'uuid'
import db from '../utils/connect-mysql.js'

const MerchantID = process.env.ECPAY_MERCHANT_ID //必填
const HashKey = process.env.ECPAY_HASH_KEY //3002607
const HashIV = process.env.ECPAY_HASH_IV //3002607
let isStage = process.env.ECPAY_TEST // 測試環境： true；正式環境：false
const ReturnURL = process.env.ECPAY_RETURN_URL
const OrderResultURL = process.env.ECPAY_ORDER_RESULT_URL
const ReactClientBackURL = process.env.ECPAY_ORDER_CALLBACK_URL

const router = express.Router()

// 其他必要的引入
// import { authenticate } from 'some-auth-middleware';

router.post('/create-order', authenticate, async (req, res) => {
  // 會員id由authenticate中介軟體提供
  const userId = req.user.id

  // 產生 orderId 與 packageId
  function generateOrderId(length) {
    const characters =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
    let result = ''
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * characters.length)
      result += characters[randomIndex]
    }
    return result
  }

  const id = generateOrderId(7)
  const packageId = uuidv4()

  // 要傳送給 line pay 的訂單資訊
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

  // 要儲存到資料庫的訂單資料
  const dbOrder = {
    member_id: userId,
    amount: req.body.amount,
    order_info: JSON.stringify(order),
  }

  try {
    // 儲存到資料庫
    const [result] = await db.query(
      'INSERT INTO ticket (tid, member_id, amount, order_info) VALUES ( ?, ?, ?)',
      [dbOrder.member_id, dbOrder.amount, dbOrder.order_info]
    )

    // 回傳給前端的資料
    res.json({ status: 'success', data: { order } })
  } catch (error) {
    console.error('資料儲存錯誤:', error)
    res.status(500).json({ status: 'error', message: '訂單創建失敗' })
  }
})

router.get('/payment', authenticate, async (req, res, next) => {
  // 從資料庫得到order資料
  const id = req.query.id
  // 從資料庫取得訂單資料
  const orderRecord = await Purchase_Order.findByPk(id, {
    raw: true, // 只需要資料表中資料
  })

  console.log('獲得訂單資料，內容如下：')
  console.log(orderRecord)

  //二、輸入參數
  const TotalAmount = orderRecord.amount
  const TradeDesc = '商店線上付款'
  const ItemName = '訂單編號' + orderRecord.id + '商品一批'

  const ChoosePayment = 'ALL'

  // 以下參數不用改
  const stage = isStage ? '-stage' : ''
  const algorithm = 'sha256'
  const digest = 'hex'
  const APIURL = `https://payment${stage}.ecpay.com.tw/Cashier/AioCheckOut/V5`
  // // 交易編號
  // const MerchantTradeNo =
  //   new Date().toISOString().split('T')[0].replaceAll('-', '') +
  //   crypto.randomBytes(32).toString('base64').substring(0, 12)
  // 生成隨機字母和數字
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
  const MerchantTradeNo = generateRandomString(7)
  // 交易日期時間
  const MerchantTradeDate = new Date().toLocaleDateString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })

  //三、計算 CheckMacValue 之前
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

  //四、計算 CheckMacValue
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
  const CheckMacValue = CheckMacValueGen(ParamsBeforeCMV, algorithm, digest)

  //五、將所有的參數製作成 payload
  const AllParams = { ...ParamsBeforeCMV, CheckMacValue }
  console.log('AllParams:', AllParams)

  const inputs = Object.entries(AllParams)
    .map(function (param) {
      return `<input name=${param[0]} value="${param[1].toString()}"><br/>`
    })
    .join('')

  //六、製作送出畫面
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>全方位金流-測試</title>
</head>
<body>
    <form method="post" action="${APIURL}">
${inputs}
<input type ="submit" value = "送出參數">
    </form>
</body>
</html>
`
  //res.json({ htmlContent })
  res.send(htmlContent)

  // const htmlContent = `
  // <!DOCTYPE html>
  // <html>
  // <head>
  //     <title>全方位金流測試</title>
  // </head>
  // <body>
  //     <form method="post" action="${APIURL}">
  // ${inputs}
  // <input type ="submit" value = "送出參數">
  //     </form>
  // <script>
  //   document.forms[0].submit();
  // </script>
  // </body>
  // </html>
  // `
})














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
