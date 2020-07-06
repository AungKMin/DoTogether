const express = require('express')
const router = express.Router()
const passport = require('passport')
const User = require('../models/user')
const Activity = require('../models/activity')
const async = require('async')
const nodemailer = require('nodemailer')
const crypto = require('crypto')
require('dotenv').config()

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
	let newUser = new User({
			username: req.body.username,
			firstName: req.body.firstName, 
			lastName: req.body.lastName, 
			avatar: req.body.avatar, 
			email: req.body.email,
			bio: req.body.bio
		})
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

// Profile
router.get('/users/:id', function(req, res) { 
	User.findById(req.params.id).populate('activities').exec(function(err, foundUser) { 
		if (err) { 
			req.flash(error, 'User not found')
			res.redirect('back')
		} else { 
			res.render('users/show', {user: foundUser})
		}
	})
}) 

// exports
module.exports = router
