import * as fs from 'fs'
import cookieParser from 'cookie-parser'
import cors from 'cors'
import createError from 'http-errors'
import express from 'express'
import logger from 'morgan'
import path from 'path'
import session from 'express-session'

// import axios from 'axios'
// import querystring from 'querystring'
// import dotenv from 'dotenv'
// dotenv.config()
import fetch from 'node-fetch'
import { Buffer } from 'buffer'
const client_id = 'a95421f6a14e4aedb3f416099b3de0ba'
const client_secret = 'e9d4221ebec54d2cb19547003c8660fa'
const redirectUri = 'http://localhost:3005/callback'
const scopes = 'user-read-private user-read-email'

// 使用檔案的session store，存在sessions資料夾
import sessionFileStore from 'session-file-store'
const FileStore = sessionFileStore(session)

// 修正 ESM 中的 __dirname 與 windows os 中的 ESM dynamic import
import { fileURLToPath, pathToFileURL } from 'url'
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// 讓console.log呈現檔案與行號，與字串訊息呈現顏色用
import { extendLog } from '#utils/tool.js'
import 'colors'
extendLog()

// 建立 Express 應用程式
const app = express()

// cors設定，參數為必要，注意不要只寫`app.use(cors())`
app.use(
  cors({
    origin: ['http://localhost:3000', 'https://localhost:9000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  })
)

// 視圖引擎設定
app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'pug')

// 記錄HTTP要求
app.use(logger('dev'))
// 剖析 POST 與 PUT 要求的JSON格式資料
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
// 剖折 Cookie 標頭與增加至 req.cookies
app.use(cookieParser())
// 在 public 的目錄，提供影像、CSS 等靜態檔案
app.use(express.static(path.join(__dirname, 'public')))

// fileStore的選項 session-cookie使用
const fileStoreOptions = { logFn: function () {} }
app.use(
  session({
    store: new FileStore(fileStoreOptions), // 使用檔案記錄session
    name: 'SESSION_ID', // cookie名稱，儲存在瀏覽器裡
    secret: '67f71af4602195de2450faeb6f8856c0', // 安全字串，應用一個高安全字串
    cookie: {
      maxAge: 30 * 86400000, // 30 * (24 * 60 * 60 * 1000) = 30 * 86400000 => session保存30天
      // 以下三行新加，若其他人有被擋掉東西可刪。
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', // 在生產環境中使用 HTTPS
      sameSite: 'lax',
    },
    resave: false,
    saveUninitialized: false,
  })
)

app.get('/callback', async (req, res) => {
  const code = req.query.code

  const tokenResponse = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization:
        'Basic ' +
        Buffer.from(client_id + ':' + client_secret).toString('base64'),
    },
    body: new URLSearchParams({
      code: code,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  })

  if (tokenResponse.ok) {
    const data = await tokenResponse.json()
    const { access_token, refresh_token, expires_in } = data

    // 在這裡保存 tokens，可能存儲在數據庫或安全的會話中
    res.json({ access_token, refresh_token, expires_in })
  } else {
    res.status(tokenResponse.status).json({ error: 'Failed to obtain tokens' })
  }
})
// spotify資料token更新
// app.post('/refresh_token', async function (req, res) {
//   const client_id = process.env.SPOTIFY_CLIENT_ID
//   const client_secret = process.env.SPOTIFY_CLIENT_SECRET
//   const refresh_token = req.body.refresh_token
//   const authOptions = {
//     url: 'https://accounts.spotify.com/api/token',
//     headers: {
//       'Content-Type': 'application/x-www-form-urlencoded',
//       Authorization:
//         'Basic ' +
//         Buffer.from(client_id + ':' + client_secret).toString('base64'),
//     },
//     data: querystring.stringify({
//       grant_type: 'refresh_token',
//       refresh_token: refresh_token,
//     }),
//   }

//   try {
//     const response = await axios.post(authOptions.url, authOptions.data, {
//       headers: authOptions.headers,
//     })
//     res.json({
//       spotify_token: response.data.access_token,
//       refresh_token: response.data.refresh_token || refresh_token,
//     })
//   } catch (error) {
//     res.status(400).json({ error: 'Failed to refresh token' })
//   }
// })

// 載入routes中的各路由檔案，並套用api路由 START
const apiPath = '/api' // 預設路由
const routePath = path.join(__dirname, 'routes')
const filenames = await fs.promises.readdir(routePath)

for (const filename of filenames) {
  const item = await import(pathToFileURL(path.join(routePath, filename)))
  const slug = filename.split('.')[0]
  app.use(`${apiPath}/${slug === 'index' ? '' : slug}`, item.default)
}
// 載入routes中的各路由檔案，並套用api路由 END

// 捕抓404錯誤處理
app.use(function (req, res, next) {
  next(createError(404))
})

// 錯誤處理函式
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message
  res.locals.error = req.app.get('env') === 'development' ? err : {}

  // render the error page
  res.status(err.status || 500)
  // 更改為錯誤訊息預設為JSON格式
  res.status(500).send({ error: err })
})

export default app
