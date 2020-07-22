const mongoose = require('mongoose')

const conversationSchema = new mongoose.Schema({
	dateCreated: {type: Date, default: Date.now},
	users: [{
		id: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'User'
		}, 
		username: String
	}],
	messages: [
		{ 
			text: String, 
			dateCreated: {type: Date, default: Date.now},
			from: {id: {type: mongoose.Schema.Types.ObjectId, ref: 'User'}, username: String}
		}
	]
}) 

module.exports = mongoose.model('Conversation', conversationSchema)
