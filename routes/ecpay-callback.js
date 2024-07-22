import express from 'express'
import db from '../utils/connect-mysql.js'

const router = express.Router()

router.post('/', async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' })
  }

  const { MerchantTradeNo, RtnCode, RtnMsg } = req.body

  try {
    // 更新訂單狀態
    await db.execute('UPDATE ticket SET payment = ? WHERE order_num = ?', [
      RtnCode === '1' ? 'paid' : 'failed',
      MerchantTradeNo,
    ])

    // 回應 ECPay
    res.status(200).send('1|OK')

    // 如果支付成功，重定向到完成頁面
    if (RtnCode === '1') {
      const [rows] = await db.execute(
        'SELECT activity_id FROM ticket WHERE order_num = ? LIMIT 1',
        [MerchantTradeNo]
      )
      if (rows.length > 0) {
        const actid = rows[0].activity_id
        res.redirect(
          `${process.env.NEXT_PUBLIC_BASE_URL}/ticket/concert/finish/${actid}?orderNum=${MerchantTradeNo}`
        )
      }
    }
  } catch (error) {
    console.error('Error processing ECPay callback:', error)
    res.status(500).send('0|Error')
  }
})

export default router
