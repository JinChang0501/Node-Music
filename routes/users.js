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

// ✅ 使用 Cloudinary 上傳頭像
import multer from 'multer'
import { v2 as cloudinary } from 'cloudinary'
import { CloudinaryStorage } from 'multer-storage-cloudinary'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})
console.log('Cloudinary name:', process.env.CLOUDINARY_CLOUD_NAME)

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'avatar',
    allowed_formats: ['jpg', 'jpeg', 'png'],
    public_id: (req, file) => req.user.id + '-' + Date.now(),
  },
})
const upload = multer({ storage })

// GET - 得到所有會員資料
router.get('/', async function (req, res) {
  const users = await Member.findAll({ logging: console.log })
  return res.json({ status: 'success', data: { users } })
})

// GET - 得到單筆資料
router.get('/:id', authenticate, async function (req, res) {
  const id = getIdParam(req)
  if (req.user.id !== id) {
    return res.json({ status: 'error', message: '存取會員資料失敗' })
  }
  const user = await Member.findByPk(id, { raw: true })
  delete user.password
  return res.json({ status: 'success', data: { user } })
})

// POST - 新增會員資料
router.post('/', async function (req, res) {
  const newUser = req.body
  if (!newUser.name || !newUser.email || !newUser.password) {
    return res.json({ status: 'error', message: '缺少必要資料' })
  }
  const [user, created] = await Member.findOrCreate({
    where: {
      [Op.or]: [{ username: newUser.name }, { email: newUser.email }],
    },
    defaults: {
      name: newUser.name,
      email: newUser.email,
      password: newUser.password,
    },
  })
  if (!created) {
    return res.json({ status: 'error', message: '建立會員失敗' })
  }
  return res.status(201).json({ status: 'success', data: null })
})

// ✅ POST - 上傳會員頭像到 Cloudinary
router.post(
  '/upload-avatar',
  authenticate,
  upload.single('avatar'),
  async function (req, res) {
    try {
      if (!req.file) {
        return res
          .status(400)
          .json({ status: 'fail', message: 'No file uploaded' })
      }

      const id = req.user.id
      const data = { avatar: req.file.path }
      const [affectedRows] = await Member.update(data, { where: { id } })
      if (!affectedRows) {
        return res.status(400).json({
          status: 'error',
          message: '更新失敗或沒有資料被更新',
        })
      }

      return res.json({ status: 'success', data: { avatar: req.file.path } })
    } catch (error) {
      console.error('Upload avatar error:', error)
      return res.status(500).json({ status: 'error', message: error.message })
    }
  }
)

// PUT - 更新會員密碼
router.put('/:id/password', authenticate, async function (req, res) {
  const id = getIdParam(req)
  if (req.user.id !== id) {
    return res.json({ status: 'error', message: '存取會員資料失敗' })
  }
  const userPassword = req.body
  if (!id || !userPassword.origin || !userPassword.new) {
    return res.json({ status: 'error', message: '缺少必要資料' })
  }
  const dbUser = await Member.findByPk(id, { raw: true })
  if (!dbUser) {
    return res.json({ status: 'error', message: '使用者不存在' })
  }
  const isValid = await compareHash(userPassword.origin, dbUser.password)
  if (!isValid) {
    return res.json({ status: 'error', message: '密碼錯誤' })
  }
  const [affectedRows] = await Member.update(
    { password: userPassword.new },
    { where: { id }, individualHooks: true }
  )
  if (!affectedRows) {
    return res.json({ status: 'error', message: '更新失敗' })
  }
  return res.json({ status: 'success', data: null })
})

// PUT - 更新會員資料
router.put('/:id/profile', authenticate, async function (req, res) {
  const id = getIdParam(req)
  if (req.user.id !== id) {
    return res.json({ status: 'error', message: '存取會員資料失敗' })
  }
  const user = req.body
  if (!id || !user.name) {
    return res.json({ status: 'error', message: '缺少必要資料' })
  }
  const dbUser = await Member.findByPk(id, { raw: true })
  if (!dbUser) {
    return res.json({ status: 'error', message: '使用者不存在' })
  }
  if (!user.birthday) delete user.birthday
  const [affectedRows] = await Member.update(user, { where: { id } })
  if (!affectedRows) {
    return res.json({ status: 'error', message: '更新失敗或沒有資料被更新' })
  }
  const updatedUser = await Member.findByPk(id, { raw: true })
  delete updatedUser.password
  return res.json({ status: 'success', data: { user: updatedUser } })
})

// DELETE - 刪除會員
router.delete('/:id', async function (req, res) {
  const id = getIdParam(req)
  const affectedRows = await Member.destroy({ where: { id } })
  if (!affectedRows) {
    return res.json({ status: 'fail', message: 'Unable to detele.' })
  }
  return res.json({ status: 'success', data: null })
})

export default router
