const express = require('express')
const router = express.Router()
const passport = require('passport')
const User = require('../models/user')
const middleware = require('../middleware')

// Profile

// show profile
router.get('/:id', function(req, res) { 
	User.findById(req.params.id).populate('activities').exec(function(err, foundUser) { 
		if (err || !foundUser) { 
			req.flash('error', 'User not found')
			res.redirect('back')
		} else { 
			res.render('users/show', {user: foundUser})
		}
	})
}) 

// edit (show form for updating profile) 
router.get('/:id/edit', middleware.checkProfileOwnership, function(req, res) {
	res.render('users/edit', {user: req.user})
})

// update the profile 
router.put('/:id', middleware.checkProfileOwnership, function(req, res) { 
	User.findById(req.params.id, function(err, user) { 
		if (err || !user) { 
			req.flash('error', 'error updating profile')
			res.redirect('/users/' + req.params.id + '/edit')
		} else { 
			if (!req.body.username || !req.body.firstName || !req.body.lastName) { 
				req.flash('error', 'One or more required fields are empty')
				return res.redirect('/users/' + req.params.id)
			}
			let username = req.body.username.trim()
			let firstName = req.body.firstName.trim()
			let lastName = req.body.lastName.trim()
			let avatar = req.body.avatar.trim()
			let bio = req.body.bio
			user.username = username
			user.firstName = firstName
			user.lastName = lastName
			user.avatar = avatar
			user.bio = bio
			user.save(function(err) { 
				if (err) { 
					req.flash('error', 'Something went wrong')
					return res.redirect('/users/' + req.params.id)
				}
				req.flash('success', 'updated profile')
				res.redirect('/users/' + req.params.id)
			})
		}
	})
})

module.exports = router

