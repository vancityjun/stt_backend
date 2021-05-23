require('dotenv').config()
const fs = require('fs')
const express = require('express')
const app = express()
const cors = require('cors')
const fileUpload = require('express-fileupload')
const SpeechToTextV1 = require('ibm-watson/speech-to-text/v1')
const { IamAuthenticator } = require('ibm-watson/auth')
const mongoose = require('mongoose')
const argon2 = require('argon2')
const {user, sttRequest} = require('./model')
const jwt = require('jsonwebtoken')

const {DB_PASSWORD,DB_NAME, SERVICE_URL, API_KEY, PRIVATE_KEY} = process.env

const url = `mongodb+srv://jun:${DB_PASSWORD}@test.tixoj.azure.mongodb.net/${DB_NAME}?retryWrites=true&w=majority`

const port = 4000

app.use(cors())
app.use(fileUpload({
  useTempFiles: true
}))
app.use(express.json({
  type: ['application/json', 'text/plain']
}))

mongoose.connect(url, {useNewUrlParser: true, useUnifiedTopology: true}).catch(err => handleError(err))

mongoose.connection.on('error', err => {
  logError(err);
})

app.listen(port, () => {
  if(!process.env) {
    console.error("can't find environment variables")
  }
  console.log(`Example app listening at http://localhost:${port} \n press ctrl + c to terminate`)
})

const currentUser = async (authorization) => {
  const token = jwt.verify(authorization, PRIVATE_KEY)
  return await user.findOne({email: token.email})
}

const speechToText = new SpeechToTextV1({
  authenticator: new IamAuthenticator({
    apikey: API_KEY,
  }),
  serviceUrl: SERVICE_URL,
})

app.post('/transcript', async (req, res) => {
  const {languageCode, fileDuration} = req.body
  const {tempFilePath, mimetype} = req.files.file

  const recognizeParams = {
    audio: fs.createReadStream(tempFilePath),
    contentType: mimetype,
    model: languageCode,
    wordAlternativesThreshold: 0.9,
  }

  if(!recognizeParams.contentType.indexOf('audio')){
    res.status(403).send('the file must be audio format')
  }
  const userRecord = await currentUser(req.headers.authorization)

  speechToText.recognize(recognizeParams)
    .then(({status, result}) => {
      fs.unlink(tempFilePath, (err => {
        err && console.error(err)
      }))

      if(!userRecord){
        return res.status(401).send({error: 'can not verify user'})
      }

      sttRequest.create({
        userId: userRecord._id,
        createdAt: new Date(),
        fileDuration: fileDuration,
        languageCode: languageCode
      })

      res.status(status).send(result)
    })
    .catch(err => {
      res.status(400).send('error:', err)
    })
})

app.post('/register', async (req, res) => {
  const {userParams} = req.body
  userParams.password = await argon2.hash(userParams.password)

  const userRecord = await user.create(userParams)

  if(userRecord) {
    res.status(200).send({
      user: userRecord.forReturn(),
      token: jwt.sign(userRecord.forReturn(), PRIVATE_KEY)
    })
  }
})

app.post('/login', async (req, res) => {
  const {userParams} = req.body
  
  const userRecord = await user.findOne({email: userParams.email})
  if(!userRecord){
    res.status(401).send({message: 'user not found'})
  }
  
  if ( await argon2.verify(userRecord.password, userParams.password) ) {
    res.send({
      user: userRecord.forReturn(),
      token: jwt.sign(userRecord.forReturn(), PRIVATE_KEY)
    })
  } else {
    res.status(401).send({message: 'invalid password'})
  }
})

app.post('/password-reset', async (req, res) => {
  const {userParams} = req.body
  
  const userRecord = await user.findOne({email: userParams.email})

  if(!userRecord){
    res.status(401).send({message: 'user not found'})
  }

  if ( await userRecord.update({password: await argon2.hash(userParams.password)}) ) {
    res.send({ message: 'password changed, try login with new password'})
  } else {
    res.status(401).send({message: 'invalid password'})
  }
})

app.get('/current-user', async (req, res) => {
  const {authorization} = req.headers
  let result = null
  if (authorization) {
    const userRecord = await currentUser(authorization)
    if(userRecord){
      result = userRecord.forReturn()
    }
  }
  res.send({user: result})
})
