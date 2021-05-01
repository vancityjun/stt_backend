const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
  firstName: String,
  lastName: String,
  email: String,
  password: String
})

userSchema.methods.forReturn = function() {
  return {
    firstName: this.firstName,
    lastName: this.lastName,
    email: this.email,  
  }
}

const user = mongoose.model('user', userSchema)

const sttRequestSchema = new mongoose.Schema({
  userId: String,
  createdAt: Date,
  fileDuration: Number,
  languageCode: String
})

const sttRequest = mongoose.model('sttRequest', sttRequestSchema)

module.exports = {user, sttRequest}
