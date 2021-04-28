require('dotenv').config()
const fs = require('fs')
const express = require('express')
const app = express()
const cors = require('cors')
const fileUpload = require('express-fileupload')
const SpeechToTextV1 = require('ibm-watson/speech-to-text/v1')
const { IamAuthenticator } = require('ibm-watson/auth')

const port = 4000

app.use(cors())
app.use(fileUpload({
  useTempFiles: true
}))
app.use(express.json({
  type: ['application/json', 'text/plain']
}))

app.listen(port, () => {
  if(!process.env) {
    console.error("can't find environment variables")
  }
  console.log(`Example app listening at http://localhost:${port} \n press ctrl + c to terminate`)
})

app.get('/', async (req, res) => {
  res.send('test')
})

const speechToText = new SpeechToTextV1({
  authenticator: new IamAuthenticator({
    apikey: process.env.API_KEY,
  }),
  serviceUrl: process.env.SERVICE_URL,
})

app.post('/transcript', async (req, res) => {
  const {languageCode} = req.body
  const {tempFilePath, mimetype} = req.files.file

  const recognizeParams = {
    audio: fs.createReadStream(tempFilePath),
    contentType: mimetype,
    model: languageCode,
    wordAlternativesThreshold: 0.9,
  }
  
  speechToText.recognize(recognizeParams)
    .then(({status, result}) => {
      fs.unlink(tempFilePath, (err => {
        err && console.error(err)
      }))
      res.status(status).send(result)
    })
    .catch(err => {
      res.status(400).send('error:', err)
    })
})
