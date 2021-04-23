const fs = require('fs')
const speech = require('@google-cloud/speech')
const express = require('express')
const app = express()
const cors = require('cors')
const fileUpload = require('express-fileupload')

const port = 4000

const client = new speech.SpeechClient()

const corsOption = {
  origin: 'http://localhost:3000/',
  optionsSuccessStatus: 200
}

app.use(cors())
app.use(fileUpload())
app.use(express.json({
  type: ['application/json', 'text/plain']
}))

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port} \n press ctrl + c to terminate`)
})

app.get('/', async (req, res) => {
  res.send('test')
})

app.post('/transcript', async (req, res) => {
  const {file, languageCode} = req.body
  // if (!req.files) {
  //   return res.status(500).send({ msg: "file is not found" })
  // }


  // https://cloud.google.com/speech-to-text/docs/encoding
  const encoding = 'MP3'
  const sampleRateHertz = 16000

  const config = {
    encoding: encoding,
    sampleRateHertz: sampleRateHertz,
    languageCode: languageCode,
  }
  
  // const base64 = fs.readFileSync('/Users/jun/workspace/stt/test.mp3').toString('base64')
  const audio = {
    content: file,
  }
  
  const request = {
    config: config,
    audio: audio,
  };
  
  const [response] = await client.recognize(request)
  
  const transcription = response.results
    .map(result => result.alternatives[0].transcript)
    .join('\n');
  
  res.send(transcription)
})
