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
	res.render("register", {page: 'register'})
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
	res.render('login', {page: 'login'})
})

// login logic
router.post('/login', function(req, res, next) {
	passport.authenticate('local', function(err, user, info) {
		if (err) { 
			req.flash('error', err)
			return next(err)
		}
		if (!user) { 
			req.flash('error', info.message)
			return res.redirect('/login')
		}
		req.logIn(user, function(err) { 
			if (err) { 
				req.flash('error', err)
				return next(err)
			}
			return res.redirect(req.session.returnTo || '/activities')
			delete req.session.returnTo
		})
	})(req, res, next); 
})

// -- resort to this for login logic if the above fails (but this doesn't redirect you back to the last page, it redirects you to activities)
//router.post('/login', passport.authenticate('local', {
	//successRedirect: '/activities',
	//failureRedirect: '/login',
	//failureFlash: true
//}), function(req, res) { 
//})

// logout
router.get('/logout', function(req, res) { 
	req.logout()
	req.flash('success', 'You logged out!')
	res.redirect('/activities')
})

// exports
module.exports = router
