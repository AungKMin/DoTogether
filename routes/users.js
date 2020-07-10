const express = require('express')
const router = express.Router()
const passport = require('passport')
const User = require('../models/user')
const middleware = require('../middleware')
const multer = require('multer');
require('dotenv').config()

var storage = multer.diskStorage({
  filename: function(req, file, callback) {
    callback(null, Date.now() + file.originalname);
  }
});
var imageFilter = function (req, file, cb) {
    // look for .image_file_name at the end of the file name (case insensitive)
    if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/i)) {
        return cb(new Error('Only image files are allowed!'), false);
    }
    cb(null, true);
};
var upload = multer({ storage: storage, fileFilter: imageFilter})

var cloudinary = require('cloudinary').v2;
cloudinary.config({ 
  cloud_name: 'dl4dkmste', 
  api_key: process.env.CLOUDINARY_API_KEY, 
  api_secret: process.env.CLOUDINARY_API_SECRET
});

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
router.put('/:id', middleware.checkProfileOwnership, upload.single('image'), function(req, res) { 
	User.findById(req.params.id, async function(err, user) { 
		if (err || !user) { 
			req.flash('error', 'error updating profile')
			res.redirect('/users/' + req.params.id + '/edit')
		} else { 
			if (!req.body.username || !req.body.firstName || !req.body.lastName) { 
				req.flash('error', 'One or more required fields are empty')
				return res.redirect('/users/' + req.params.id)
			}
			if (req.file) { 
				try { 
					await cloudinary.uploader.destroy({public_id: user.avatarId}) 
					let result = await cloudinary.uploader.upload(req.file.path) 
					user.avatarId = result.public_id
					user.avatar = result.secure_url
				} catch(err) { 
					console.log(err)
					req.flash('error', err.message)
					return res.redirect('back')
				}
			}
			let username = req.body.username.trim()
			let firstName = req.body.firstName.trim()
			let lastName = req.body.lastName.trim()
			let bio = req.body.bio
			user.username = username
			user.firstName = firstName
			user.lastName = lastName
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

