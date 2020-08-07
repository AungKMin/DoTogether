const mongoose = require('mongoose'),
	passportLocalMongoose = require('passport-local-mongoose')

const UserSchema = new mongoose.Schema({
	username: {type: String, unique: true, required: true},
	password: String,
	avatar: String,
	avatarId: String,
	firstName: String,
	lastName: String, 
	email: {type: String, unique: true, required: true},
	contact: String,
	gender: {type: String, default: "na"},
	birthday: Date,
	resetPasswordToken: String, 
	resetPasswordExpires: Date, 
	verifyEmailToken: String, 
	verifyEmailExpires: Date,
	emailVerified: {type: Boolean, default: false},
	editProfileOnce: {type: Boolean, default: false},
	bio: String,
	activities: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Activity'
		}
	],
	conversations: [ 
		{
			id: { 
				type: mongoose.Schema.Types.ObjectId,
				ref: 'Conversation'
			}, 
			to: { 
				id: { 
					type: mongoose.Schema.Types.ObjectId,
					ref: 'User'
				}, 
				username: String // user that this user is conversing with
			},
			numUnchecked: {type: Number, default: 0}
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
