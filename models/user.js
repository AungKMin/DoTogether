const mongoose = require('mongoose'),
	passportLocalMongoose = require('passport-local-mongoose')

const UserSchema = new mongoose.Schema({
	username: String,
	password: String,
	avatar: String,
	firstName: String,
	lastName: String, 
	email: String,
	bio: String
})

UserSchema.plugin(passportLocalMongoose)

module.exports = mongoose.model('User', UserSchema)
