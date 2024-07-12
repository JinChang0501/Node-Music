import express from 'express'
const router = express.Router()

// 中介軟體，存取隱私會員資料用
import authenticate from '#middlewares/authenticate.js'

// 檢查空物件, 轉換req.params為數字
import { getIdParam } from '#db-helpers/db-tool.js'

// 資料庫使用
import { Op } from 'sequelize'
import sequelize from '#configs/db.js'
const { Member } = sequelize.models

// 驗証加密密碼字串用
import { compareHash } from '#db-helpers/password-hash.js'

const sql =
  // GET - 得到單筆資料(注意，有動態參數時要寫在GET區段最後面)
  router.get('/:id', authenticate, async function (req, res) {
    // 轉為數字
    const id = getIdParam(req)

    // 檢查是否為授權會員，只有授權會員可以存取自己的資料
    if (req.user.id !== id) {
      return res.json({ status: 'error', message: '存取會員資料失敗' })
    }

    const user = await Member.findByPk(id, {
      raw: true, // 只需要資料表中資料
    })

    // 不回傳密碼
    delete user.password

    return res.json({ status: 'success', data: { user } })
  })

// PUT - 更新會員資料(密碼更新用)
router.put('/:id/password', authenticate, async function (req, res) {
  const id = getIdParam(req)

  // 檢查是否為授權會員，只有授權會員可以存取自己的資料
  if (req.user.id !== id) {
    return res.json({ status: 'error', message: '存取會員資料失敗' })
  }

  // user為來自前端的會員資料(準備要修改的資料)
  const userPassword = req.body

  // 檢查從前端瀏覽器來的資料，哪些為必要(name, ...)，從前端接收的資料為
  // {
  //   originPassword: '', // 原本密碼，要比對成功才能修改
  //   newPassword: '', // 新密碼
  // }
  if (!id || !userPassword.origin || !userPassword.new) {
    return res.json({ status: 'error', message: '缺少必要資料' })
  }

  // 查詢資料庫目前的資料
  const dbUser = await Member.findByPk(id, {
    raw: true, // 只需要資料表中資料
  })

  // null代表不存在
  if (!dbUser) {
    return res.json({ status: 'error', message: '使用者不存在' })
  }

  // compareHash(登入時的密碼純字串, 資料庫中的密碼hash) 比較密碼正確性
  // isValid=true 代表正確
  const isValid = await compareHash(userPassword.origin, dbUser.password)

  // isValid=false 代表密碼錯誤
  if (!isValid) {
    return res.json({ status: 'error', message: '密碼錯誤' })
  }

  // 對資料庫執行update
  const [affectedRows] = await Member.update(
    { password: userPassword.new },
    {
      where: {
        id,
      },
      individualHooks: true, // 更新時要加密密碼字串 trigger the beforeUpdate hook
    }
  )

  // 沒有更新到任何資料 -> 失敗
  if (!affectedRows) {
    return res.json({ status: 'error', message: '更新失敗' })
  }

  // 成功，不帶資料
  return res.json({ status: 'success', data: null })
})

// PUT - 更新會員資料(排除更新密碼)
router.put('/:id/profile', authenticate, async function (req, res) {
  const id = getIdParam(req)

  // 檢查是否為授權會員，只有授權會員可以存取自己的資料
  if (req.user.id !== id) {
    return res.json({ status: 'error', message: '存取會員資料失敗' })
  }

  // user為來自前端的會員資料(準備要修改的資料)
  const user = req.body

  // 檢查從前端瀏覽器來的資料，哪些為必要(name, ...)
  if (!id || !user.name) {
    return res.json({ status: 'error', message: '缺少必要資料' })
  }

  // 查詢資料庫目前的資料
  const dbUser = await Member.findByPk(id, {
    raw: true, // 只需要資料表中資料
  })

  // null代表不存在
  if (!dbUser) {
    return res.json({ status: 'error', message: '使用者不存在' })
  }

  // 有些特殊欄位的值沒有時要略過更新，不然會造成資料庫錯誤
  if (!user.birthday) {
    delete user.birthday
  }

  // 對資料庫執行update
  const [affectedRows] = await Member.update(user, {
    where: {
      id,
    },
  })

  // 沒有更新到任何資料 -> 失敗或沒有資料被更新
  if (!affectedRows) {
    return res.json({ status: 'error', message: '更新失敗或沒有資料被更新' })
  }

  // 更新成功後，找出更新的資料，updatedUser為更新後的會員資料
  const updatedUser = await Member.findByPk(id, {
    raw: true, // 只需要資料表中資料
  })

  // password資料不需要回應給瀏覽器
  delete updatedUser.password
  //console.log(updatedUser)
  // 回傳
  return res.json({ status: 'success', data: { user: updatedUser } })
})

// --------------------------------

export default router
