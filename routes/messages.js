const express = require('express')
const router = express.Router()
const middleware = require('../middleware')
const User = require('../models/user')
const Conversation = require('../models/conversation')

// When user clicks on messages
router.get('/entry', middleware.isLoggedIn, function(req, res) { 
	if (req.user.conversations.length !== 0) {
		return res.redirect('/t/message/0')
	}
	// *** Have some kind of no convos page here
	res.render('messages/nomessages', {conversations: req.user.conversations, currentConversation: null})
})

// Get page for user message
router.get('/message/:index', middleware.isLoggedIn, function(req, res) { 
	if (!req.user.conversations[Number(req.params.index)]) { 
		return res.redirect('back')
	}
	Conversation.findById(req.user.conversations[Number(req.params.index)].id, function(err, conversation) { 
		if (err) { 
			console.log(err)
			return res.redirect('back')
		} 
		// set conversation checked to true
		req.user.conversations[Number(req.params.index)].numUnchecked = 0
		req.user.save()
		res.render('messages/chatroom', {conversations: req.user.conversations, currentConversation: conversation, index: req.params.index})
	})
})

// When user clicks to message a specific user
// *** make it so it can't be yourself 
router.post('/message/new/:id', middleware.isLoggedIn, function(req, res) { 
	User.findById(req.params.id, function(err, user) {
		if(err) { 
			console.log(err)
			req.flash('error', err.message)
			return res.redirect('back')
		}
		if (user._id.equals(req.user._id)) { 
			req.flash('error', 'You cannot message yourself!')
			return res.redirect('back')
		}
		let otherUserIndex = req.user.conversations.findIndex(conversation => conversation.to.id.equals(user._id))
		if (otherUserIndex !== -1) { 
			return res.redirect('/t/message/' + String(otherUserIndex))
		}  
		let conversation = { 
			users: [],
			messages: []
		}
		conversation.users.push({ 
			id: req.user._id,
			username: req.user.username
		}) // logged in user
		conversation.users.push({
			id: user._id,
			username: user.username
		}) // the other user
		Conversation.create(conversation, function(err, newConversation) { 
			if (err) { 
				console.log(err)
				req.flash('error', err.message)
				return res.redirect('back')
			}
			req.user.conversations.unshift({id: newConversation._id, to: {id: user._id, username: user.username}})
			user.conversations.push({id: newConversation._id, to: {id: req.user._id, username: req.user.username}})
			req.user.save()
			user.save()
			return res.redirect('/t/message/0')
		})
		
	})
})

// Sending one message
router.post('/message/send/:index', function(req, res) { 
	if (!req.user.conversations[Number(req.params.index)]) { 
		return res.redirect('back')
	}
	Conversation.findById(req.user.conversations[Number(req.params.index)].id).populate('users.id').exec(function(err, conversation) { 
		if (err) { 
			console.log(err)
			return res.redirect('back')
		} 
		// define the other user
		var otherUser
		if (conversation.users[0].id.equals(req.user._id)) { 
			otherUser = conversation.users[1].id
		} else if (conversation.users[1].id.equals(req.user._id)) { 
			otherUser = conversation.users[0].id
		} else { 
			// if the current user doesn't belong in this conversation, redirect back
			req.flash('error', "You're not in this conversation!")
			return res.redirect('back')
		}

		// change conversation checked to true for the user that sent the message
		req.user.conversations[Number(req.params.index)].numUnchecked = 0
		// change conversation checked to false for the user that is receiving the message
		var otherUserConversationIndex = otherUser.conversations.findIndex((thisConversation) => thisConversation.id.equals(conversation._id))
		otherUser.conversations[otherUserConversationIndex].numUnchecked += 1
		req.user.save()
		otherUser.save() 

		conversation.messages.push({text: req.body.messageBody, from: {id: req.user, username: req.user.username}})
		conversation.save()
	})
})

module.exports = router
