const mongoose = require('mongoose')


const activitySchema = new mongoose.Schema({
	name: String,
	image: {type: String, default: "https://blog.bit.ai/wp-content/uploads/2018/01/Team-Activity-Asset-3-bit.ai_.png"},
	description: String,
	author: { 
		id: { 
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User'
		}, 
		username: String
	},
	comments: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Comment'
		}
	]
}) 

module.exports = mongoose.model('Activity', activitySchema)
