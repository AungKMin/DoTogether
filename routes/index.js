const express = require('express')
const router = express.Router()
const passport = require('passport')
const User = require('../models/user')

// root
router.get("/", function(req, res) { 
	res.render("landing-page")
})

// ===== Auth Routes ======

// register form
router.get("/register", function(req, res) { 
	res.render("register")
})

// sign up logic
router.post("/register", function(req, res) { 
	let newUser = new User({username: req.body.username})
	User.register(newUser, req.body.password, function(err, user) { 
		if (err) { 
			req.flash('error', err.message)	
			return res.redirect('register')
		}
		passport.authenticate('local')(req, res, function() { 
			req.flash('success', 'Welcome to DoTogether ' + user.username)
			res.redirect('/activities')
		})
	})
})

// login form
router.get('/login', function(req, res) { 
	res.render('login')
})

// login logic
router.post('/login', passport.authenticate('local', {
	successRedirect: '/activities',
	failureRedirect: '/login'
}), function(req, res) { 
})

// logout
router.get('/logout', function(req, res) { 
	req.logout()
	req.flash('success', 'You logged out!')
	res.redirect('/activities')
})

module.exports = router
