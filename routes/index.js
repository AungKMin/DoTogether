const express = require('express')
const router = express.Router()
const passport = require('passport')
const User = require('../models/user')
const Activity = require('../models/activity')
const async = require('async')
const nodemailer = require('nodemailer')
const crypto = require('crypto')
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
router.post("/register", upload.single('image'), function(req, res) { 
	if (req.file) {
		cloudinary.uploader.upload(req.file.path, function(err, result) { 
			if (err) { 
				console.log(err)
				req.flash('error', err.message)
				return res.redirect('back')
			}
			if (!req.body.email || !req.body.username || !req.body.firstName || !req.body.lastName) { 
				req.flash('error', 'One or more required fields empty')
				return res.redirect('back')
			}
			let newUser = new User({
					username: req.body.username.trim(),
					firstName: req.body.firstName.trim(), 
					lastName: req.body.lastName.trim(), 
					avatar: result.secure_url,
					avatarId: result.public_id,
					email: req.body.email.trim(),
					bio: req.body.bio
				})
			User.register(newUser, req.body.password, function(err, user) { 
				if (err) { 
					req.flash('error', err.message)	
					return res.redirect('register')
				}
				passport.authenticate('local')(req, res, function() { 
					req.flash('success', 'Welcome to DoTogether ' + user.username)
					res.redirect('/verify')
				})
			})
		})
	} else { 
		if (!req.body.email || !req.body.username || !req.body.firstName || !req.body.lastName) { 
			req.flash('error', 'One or more required fields empty')
			return res.redirect('back')
		}
		let newUser = new User({
				username: req.body.username.trim(),
				firstName: req.body.firstName.trim(), 
				lastName: req.body.lastName.trim(), 
				email: req.body.email.trim(),
				bio: req.body.bio
			})
		User.register(newUser, req.body.password, function(err, user) { 
			if (err) { 
				req.flash('error', err.message)	
				return res.redirect('register')
			}
			passport.authenticate('local')(req, res, function() { 
				req.flash('success', 'Welcome to DoTogether ' + user.username)
				res.redirect('/verify')
			})
		})
	}
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

// forgot password (form)
router.get('/forgot', function(req, res) {
  res.render('forgot');
});

// forgot password logic
router.post('/forgot', function(req, res, next) {
  async.waterfall([
    function(done) {
      crypto.randomBytes(20, function(err, buf) {
        var token = buf.toString('hex');
        done(err, token);
      });
    },
    function(token, done) {
      User.findOne({ email: req.body.email }, function(err, user) {
        if (!user) {
          req.flash('error', 'No account with that email address exists.');
          return res.redirect('/forgot');
        }

        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

        user.save(function(err) {
          done(err, token, user);
        });
      });
    },
    function(token, user, done) {
      var smtpTransport = nodemailer.createTransport({
        service: 'Gmail', 
        auth: {
          user: 'mail.dotogether@gmail.com',
          pass: process.env.GMAILPW
        }
      });
      var mailOptions = {
        to: user.email,
        from: 'mail.dotogether@gmail.com',
        subject: 'DoTogether Account Password Reset',
        text: 'You are receiving this because you (or someone else) have requested the reset of the password for your account.\n\n' +
          'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
          'http://' + req.headers.host + '/reset/' + token + '\n\n' +
          'If you did not request this, please ignore this email and your password will remain unchanged.\n'
      };
      smtpTransport.sendMail(mailOptions, function(err) {
        console.log('mail sent');
        req.flash('success', 'An e-mail has been sent to ' + user.email + ' with further instructions.');
        done(err,'done');
      });
    }
  ], function(err) {
    if (err) return next(err);
    res.redirect('/forgot');
  });
});

// password reset form
router.get('/reset/:token', function(req, res) {
	User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
    if (!user) {
      req.flash('error', 'Password reset token is invalid or has expired.');
      return res.redirect('/forgot');
    }
    res.render('reset', {token: req.params.token});
  });
});

// reset logic
router.post('/reset/:token', function(req, res) {
  async.waterfall([
    function(done) {
			User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
        if (!user) {
          req.flash('error', 'Password reset token is invalid or has expired.');
          return res.redirect('back');
        }
        if(req.body.password === req.body.confirm) {
          user.setPassword(req.body.password, function(err) {
            user.resetPasswordToken = undefined;
            user.resetPasswordExpires = undefined;

            user.save(function(err) {
              req.logIn(user, function(err) {
                done(err, user);
              });
            });
          })
        } else {
            req.flash("error", "Passwords do not match.");
            return res.redirect('back');
        }
      });
    },
    function(user, done) {
      var smtpTransport = nodemailer.createTransport({
        service: 'Gmail', 
        auth: {
          user: 'mail.dotogether@gmail.com',
          pass: process.env.GMAILPW
        }
      });
      var mailOptions = {
        to: user.email,
        from: 'mail.dotogether@gmail.com',
        subject: 'Your password has been changed',
        text: 'Hello,\n\n' +
          'This is a confirmation that the password for your account ' + user.email + ' has just been changed.\n'
      };
      smtpTransport.sendMail(mailOptions, function(err) {
        req.flash('success', 'Success! Your password has been changed.');
        done(err);
      });
    }
  ], function(err) {
		if (err) { 
			req.flash('error', 'Something went wrong.')
		}
    res.redirect('/activities');
  });
});

router.get('/verify', function(req, res, next) { 
	res.render('verify')
})

// verify email request 
router.post('/verify', function(req, res, next) {
  async.waterfall([
    function(done) {
      crypto.randomBytes(20, function(err, buf) {
        var token = buf.toString('hex');
        done(err, token);
      });
    },
    function(token, done) {
			if (!req.user) { 
				req.flash('Please log in');
				return res.redirect('/login')
			}
      User.findOne({ email: req.user.email }, function(err, user) {
        if (!user) {
          req.flash('error', 'No account with that email address exists.');
          return res.redirect('/forgot');
        }

        user.verifyEmailToken = token;
        user.verifyEmailExpires = Date.now() + 3600000; // 1 hour

        user.save(function(err) {
          done(err, token, user);
        });
      });
    },
    function(token, user, done) {
      var smtpTransport = nodemailer.createTransport({
        service: 'Gmail', 
        auth: {
          user: 'mail.dotogether@gmail.com',
          pass: process.env.GMAILPW
        }
      });
      var mailOptions = {
        to: user.email,
        from: 'mail.dotogether@gmail.com',
        subject: 'DoTogether Account Verify Email',
        text: 'Welcome to DoTogether! Please verify your email address\n\n' +
          'Please click on the following link, or paste this into your browser to complete the process:\n\n' +
          'http://' + req.headers.host + '/verify/' + token + '\n\n' +
          'If you did not request this, someone has used your email to sign up for DoTogether\n'
      };
      smtpTransport.sendMail(mailOptions, function(err) {
        console.log('mail sent');
        req.flash('success', 'An e-mail has been sent to ' + user.email + ' with further instructions.');
        done(err,'done');
      });
    }
  ], function(err) {
    if (err) return next(err);
    res.redirect('/verify');
  });
});

// email verify form 
router.get('/verify/:token', function(req, res) {
	User.findOne({ verifyEmailToken: req.params.token, verifyEmailExpires: { $gt: Date.now() } }, function(err, user) {
    if (!user) {
      req.flash('error', 'Email Verification token is invalid or has expired.');
      return res.redirect('/verify');
    }
    res.render('verifyConfirm', {token: req.params.token});
  });
});

// verify logic
router.post('/verify/:token', function(req, res) {
  async.waterfall([
    function(done) {
			User.findOne({ verifyEmailToken: req.params.token, verifyEmailExpires: { $gt: Date.now() } }, function(err, user) {
        if (!user) {
          req.flash('error', 'Verify Email Token is invalid or has expired.');
          return res.redirect('back');
        }
				user.verifyEmailToken = undefined;
				user.verifyEmailExpires = undefined;
				user.emailVerified = true;

				user.save(function(err) {
						done(err, user);
				});
      });
    },
    function(user, done) {
      var smtpTransport = nodemailer.createTransport({
        service: 'Gmail', 
        auth: {
          user: 'mail.dotogether@gmail.com',
          pass: process.env.GMAILPW
        }
      });
      var mailOptions = {
        to: user.email,
        from: 'mail.dotogether@gmail.com',
        subject: 'Your email has been verified',
        text: 'Hello,\n\n' +
          'This is a confirmation that the email for your account ' + user.email + ' has just been verified.\n'
      };
      smtpTransport.sendMail(mailOptions, function(err) {
        req.flash('success', 'Success! Your email has been verified.');
        done(err);
      });
    }
  ], function(err) {
		if (err) { 
			req.flash('error', 'Something went wrong.')
		}
    res.redirect('/activities');
  });
});



// Profile
router.get('/users/:id', function(req, res) { 
	User.findById(req.params.id).populate('activities').exec(function(err, foundUser) { 
		if (err || !foundUser) { 
			req.flash('error', 'User not found')
			res.redirect('back')
		} else { 
			res.render('users/show', {user: foundUser})
		}
	})
}) 

// exports
module.exports = router
