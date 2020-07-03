const mongoose = require('mongoose')


const activitySchema = new mongoose.Schema({
	name: String,
	image: String,
	description: String,
	dateCreated: {type: Date, default: Date.now},
	date: String,
	category: [String],
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
