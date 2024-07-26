import express from 'express'
import 'dotenv/config.js'
import authenticate from '#middlewares/authenticate.js'
import { v4 as uuidv4 } from 'uuid'
import db from '../utils/connect-mysql.js'
import crypto from 'crypto'
import nodemailer from 'nodemailer'

const router = express.Router()

const MerchantID = process.env.ECPAY_MERCHANT_ID
const HashKey = process.env.ECPAY_HASH_KEY
const HashIV = process.env.ECPAY_HASH_IV
const algorithm = 'sha256'
const digest = 'hex'
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_TO_EMAIL,
    pass: process.env.SMTP_TO_PASSWORD,
  },
})

function formatDate(dateString, timeString) {
  const date = new Date(dateString)
  const [year, month, day] = [
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate(),
  ]
  const [hours, minutes, seconds] = timeString.split(':')

  const formattedMonth = month.toString().padStart(2, '0')
  const formattedDay = day.toString().padStart(2, '0')
  const formattedHours = hours.padStart(2, '0')
  const formattedMinutes = minutes.padStart(2, '0')
  const formattedSeconds = seconds.padStart(2, '0')

  return `${year}/${formattedMonth}/${formattedDay} ${formattedHours}:${formattedMinutes}:${formattedSeconds}`
}

function formatDateTime(dateTimeString) {
  const date = new Date(dateTimeString)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')

  return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`
}

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

router.post('/', authenticate, async (req, res) => {
  try {
    const userId = req.user.id
    const { selectedSeatDetails, amount, products, actid } = req.body

    if (!selectedSeatDetails || selectedSeatDetails.length === 0) {
      return res
        .status(400)
        .json({ status: 'error', message: '選擇的座位詳細信息缺失' })
    }

    const MerchantTradeNo = generateRandomString(7)
    const packageId = uuidv4()

    // 要傳送給 ECPay 的訂單資訊
    const order = {
      id: MerchantTradeNo,
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
      MerchantTradeNo,
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
      [MerchantTradeNo]
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

    res.json({ status: 'success', params: AllParams })
  } catch (error) {
    console.error('處理訂單時出錯:', error)
    res.status(500).json({ status: 'error', message: '處理訂單時發生錯誤' })
  }
})

router.post('/callback', async (req, res) => {
  try {
    const { MerchantTradeNo, RtnCode, PaymentType, TradeDate } = req.body

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
      status = '已付款'
      created_at = TradeDate.slice(0, 19).replace('T', ' ')
    } else {
      status = '付款失敗'
      payment = null
      created_at = null
    }

    // 判斷付款方式並設置 payment 欄位
    switch (PaymentType) {
      case 'Credit_CreditCard':
        payment = '信用卡付款'
        break
      case 'Flexible_Installment':
        payment = '圓夢彈性分期'
        break
      case 'TWQR_OPAY':
        payment = '歐付寶行動支付'
        break
      case 'BNPL_URICH':
        payment = '裕富數位無卡分期'
        break
      case 'WebATM_TAISHIN':
        payment = 'WebATM (台新)'
        break
      case 'WebATM_ESUN':
        payment = '玉山銀行WebATM'
        break
      case 'WebATM_BOT':
        payment = '台灣銀行WebATM'
        break
      case 'WebATM_FUBON':
        payment = '台北富邦WebATM'
        break
      case 'WebATM_CHINATRUST':
        payment = '中國信託WebATM'
        break
      case 'WebATM_FIRST':
        payment = '第一銀行WebATM'
        break
      case 'WebATM_CATHAY':
        payment = '國泰世華WebATM'
        break
      case 'WebATM_MEGA':
        payment = '兆豐銀行WebATM'
        break
      case 'WebATM_LAND':
        payment = 'WebATM (土地)'
        break
      case 'WebATM_TACHONG':
        payment = '大眾銀行WebATM'
        break
      case 'WebATM_SINOPAC':
        payment = '永豐銀行WebATM'
        break
      case 'ATM_TAISHIN':
        payment = '台新銀行ATM'
        break
      case 'ATM_ESUN':
        payment = '玉山銀行ATM'
        break
      case 'ATM_BOT':
        payment = '台灣銀行ATM'
        break
      case 'ATM_FUBON':
        payment = '台北富邦ATM'
        break
      case 'ATM_CHINATRUST':
        payment = '中國信託ATM'
        break
      case 'ATM_FIRST':
        payment = '第一銀行ATM'
        break
      case 'ATM_LAND':
        payment = '土地銀行ATM'
        break
      case 'ATM_CATHAY':
        payment = '國泰世華銀行ATM'
        break
      case 'ATM_TACHONG':
        payment = '大眾銀行ATM'
        break
      case 'ATM_PANHSIN':
        payment = '板信銀行ATM'
        break
      case 'CVS_CVS':
        payment = '超商代碼繳款'
        break
      case 'CVS_OK':
        payment = 'OK超商代碼繳款'
        break
      case 'CVS_FAMILY':
        payment = '全家超商代碼繳款'
        break
      case 'CVS_HILIFE':
        payment = '萊爾富超商代碼繳款'
        break
      case 'CVS_IBON':
        payment = '7-11 ibon代碼繳款'
        break
      case 'BARCODE_BARCODE':
        payment = '超商條碼繳款'
        break
      default:
        payment = '其他付款方式'
    }

    // 更新資料表
    await db.query(
      'UPDATE ticket SET payment = ?, created_at = ?, status = ? WHERE order_num = ?',
      [payment, created_at, status, MerchantTradeNo]
    )

    // 獲取 actid
    const actid = orderRecord.activity_id

    // 跳轉回結果頁面
    const redirectUrl = `http://localhost:3000/ticket/concert/finish/${actid}?order_num=${MerchantTradeNo}`
    res.redirect(redirectUrl)
  } catch (error) {
    console.error('處理回調時出錯:', error)
    res.status(500).json({ status: 'error', message: '處理回調時發生錯誤' })
  }
})

router.get('/order/:order_num', async (req, res) => {
  try {
    const { order_num } = req.params
    const [rows] = await db.query('SELECT * FROM ticket WHERE order_num = ?', [
      order_num,
    ])
    const orderRecord = rows[0]

    if (!orderRecord) {
      return res
        .status(404)
        .json({ status: 'error', message: '訂單資料未找到' })
    }

    res.json(orderRecord)
  } catch (error) {
    console.error('獲取訂單資料時出錯:', error)
    res.status(500).json({ status: 'error', message: '獲取訂單資料時發生錯誤' })
  }
})

router.post('/send-email', async (req, res) => {
  const { order_num, email } = req.body

  if (!order_num || !email) {
    return res
      .status(400)
      .json({ status: 'error', message: '訂單號或電子郵件地址缺失' })
  }

  try {
    // 獲取訂單資料及相關信息
    const [rows] = await db.query(
      `
      SELECT t.*, a.actname, a.actdate, a.acttime, a.location, a.picture, ar.art_name, m.name as member_name, m.email as member_email
      FROM ticket t
      JOIN activity a ON t.activity_id = a.actid
      LEFT JOIN artist ar ON a.artist_id = ar.id
      LEFT JOIN member m ON t.member_id = m.id
      WHERE t.order_num = ?
    `,
      [order_num]
    )
    const orderRecord = rows[0]

    if (!orderRecord) {
      return res
        .status(404)
        .json({ status: 'error', message: '訂單資料未找到' })
    }

    const formattedDateTime = formatDate(
      orderRecord.actdate,
      orderRecord.acttime
    )

    const formattedPaymentTime = formatDateTime(orderRecord.created_at)

    const seatDetails = rows.map((seat) => ({
      name: `${seat.seat_area} 區 ${seat.seat_row} 排 ${seat.seat_number} 號`,
    }))

    const itemNames = seatDetails.map((seat) => `[ ${seat.name} ]`).join('、')

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: `MaK'in 製噪`,
      html: `
        <img src="${orderRecord.picture}" alt="活動圖片" />
        <h1>${orderRecord.actname}</h1>
        <h2>${orderRecord.art_name}</h2>
        <h2>座位 : ${itemNames}</h2>
        <h2>總價 : $ ${orderRecord.amount}</h2>
        <h3>活動地點: ${orderRecord.location}</h3>
        <h3>活動日期: ${formattedDateTime}</h3>
        <h4>訂單狀態: ${orderRecord.status}</h4>
        <h4>付款方式: ${orderRecord.payment}</h4>
        <h4>付款時間: ${formattedPaymentTime}</h4>
        <p>更多詳情: <a href="http://localhost:3000/member/ticket-detail/${order_num}">點此查看訂單</a></p>
      `,
    }

    // 發送郵件
    await transporter.sendMail(mailOptions)

    res.json({ status: 'success', message: '郵件已發送' })
  } catch (error) {
    console.error('發送郵件時出錯:', error)
    res.status(500).json({ status: 'error', message: '發送郵件時發生錯誤' })
  }
})

export default router
