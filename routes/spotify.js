import express from 'express'
import axios from 'axios'
const router = express.Router()

var spotify_client_id = process.env.SPOTIFY_CLIENT_ID
var spotify_client_secret = process.env.SPOTIFY_CLIENT_SECRET

const generateRandomString = function (length) {
  var text = ''
  var possible =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length))
  }
  return text
}

router.get('/login', (req, res) => {
  var scope =
    'streaming \
     user-read-email \
     user-read-private'

  var state = generateRandomString(16)

  var auth_query_parameters = new URLSearchParams({
    response_type: 'code',
    client_id: spotify_client_id,
    scope: scope,
    //我有修改
    redirect_uri: 'http://localhost:3005/api/spotify/callback',
    state: state,
  })

  res.redirect(
    // 回傳授權碼，用此交換token
    'https://accounts.spotify.com/authorize/?' +
      auth_query_parameters.toString()
  )
})

// router.get('/login', (req, res) => {
//   const scopes = 'streaming user-read-email user-read-private'
//   res.redirect(
//     'https://accounts.spotify.com/authorize' +
//       '?response_type=code' +
//       '&client_id=' +
//       process.env.SPOTIFY_CLIENT_ID +
//       (scopes ? '&scope=' + encodeURIComponent(scopes) : '') +
//       '&redirect_uri=' +
//       encodeURIComponent(process.env.REDIRECT_URI)
//   )
// })

// router.get('/callback', async (req, res) => {
//   const { code } = req.query
//   console.log(code)
//   try {
//     const response = await axios.post(
//       'https://accounts.spotify.com/api/token',
//       null,
//       {
//         params: {
//           grant_type: 'authorization_code',
//           code,
//           redirect_uri: process.env.REDIRECT_URI,
//           client_id: process.env.SPOTIFY_CLIENT_ID,
//           client_secret: process.env.SPOTIFY_CLIENT_SECRET,
//         },
//         headers: {
//           'Content-Type': 'application/x-www-form-urlencoded',
//         },
//       }
//     )

//     const { access_token, refresh_token } = response.data
//     // 在這裡，你可能想要將 tokens 存儲在資料庫中，並為用戶創建一個會話
//     // 為了簡單起見，我們只是將它們發送回客戶端
//     res.json({ access_token, refresh_token })
//   } catch (error) {
//     res.status(400).json({ error: 'Failed to get access token' })
//   }
// })

export default router
