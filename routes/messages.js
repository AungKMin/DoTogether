const express = require('express')
const router = express.Router()

router.get('/entry', function(req, res) { 
	res.render('messages/chatroom')
})

module.exports = router
