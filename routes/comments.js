const express = require('express')
const router = express.Router({mergeParams: true})
const Activity = require('../models/activity')
const Comment = require('../models/comment')
const middleware = require('../middleware')

// new (show a form to create a comment)
router.get('/new', middleware.isLoggedIn, function(req, res) { 
	Activity.findById(req.params.id, function(err, activity) { 
		if (err) { 
			console.log(err)
		} else { 
			res.render('comments/new', {activity: activity})
		}
	})
})

// create comment
router.post('/', middleware.isLoggedIn, function(req, res) { 
	Activity.findById(req.params.id, function(err, activity) { 
		if (err) { 
			console.log(err)
			redirect('/activities')
		} else { 
			Comment.create(req.body.comment, async function(err, comment) { 
				if (err) { 
					req.flash('error', 'Something went wrong')
					console.log(err)
				} else { 
					comment.author.id = req.user._id
					comment.author.username = req.user.username
					await comment.save()
					activity.comments.push(comment)
					await activity.save()
					req.flash('success', 'Successfully added comment')
					res.redirect('/activities/' + req.params.id)
				}
			})	
		}
	})
})

// edit (show a form to edit comment)
router.get('/:comment_id/edit', middleware.checkCommentOwnership ,function(req, res) { 
	Activity.findById(req.params.id, function(err, foundActivity) { 
		if (err || !foundActivity) { 
			req.flash('error', 'Activity not found')
			return res.redirect('back')
		}
		Comment.findById(req.params.comment_id, function(err, comment) { 
			if (err) { 
				res.redirect('back')
			} else { 
				res.render('comments/edit', {activity_id: req.params.id, comment: comment})
			}
		})	
	})
})

// update (change the comment)
router.put('/:comment_id', middleware.checkCommentOwnership, function(req, res) { 
	Comment.findByIdAndUpdate(req.params.comment_id, req.body.comment, function(err, comment) { 
		if (err) {
			res.redirect('back')
		} else { 
			res.redirect('/activities/' + req.params.id)
		}
	})
})

// destroy the comment
router.delete('/:comment_id', middleware.checkCommentOwnership, function(req, res) { 
	Comment.findByIdAndRemove(req.params.comment_id, function(err) { 
		if (err) { 
			res.redirect('back')
		} else { 
			req.flash('success', 'Comment deleted')
			res.redirect('/activities/' + req.params.id)
		}
	})
})

// export
module.exports = router
