const mongoose = require('mongoose'),
	passportLocalMongoose = require('passport-local-mongoose')

const UserSchema = new mongoose.Schema({
	username: String,
	password: String,
	avatar: String,
	firstName: String,
	lastName: String, 
	email: String,
	bio: String,
	activities: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Activity'
		}
	]
 /* comments: [*/
		//{
			//type: mongoose.Schema.Types.ObjectId,
			//ref: 'Comment'
		//}
	/*]*/
})

UserSchema.plugin(passportLocalMongoose)

module.exports = mongoose.model('User', UserSchema)
