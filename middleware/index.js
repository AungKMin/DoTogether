const Activity = require('../models/activity')
const Comment = require('../models/comment')

let middlewareObj = {}

middlewareObj.isLoggedIn = function isLoggedIn(req, res, next) { 
	if (req.isAuthenticated()) { 
		return next()
	}
	req.flash('error', 'You need to be logged in to do that!')
	res.redirect('/login')
}

middlewareObj.checkActivityOwnership = function checkActivityOwnership(req, res, next) { 
	if (req.isAuthenticated()) { 
			Activity.findById(req.params.id, function(err, foundActivity) { 
				if (err || !foundActivity) { 
					req.flash('error', 'Activity not found')
					res.redirect('back')
				} else { 
					if (foundActivity.author.id.equals(req.user._id)) { 
						next()
					} else { 
						req.flash('error', "You don't have permission to do that!")
						res.redirect('back')
					}
				}
			})
		} else { 
			req.flash('error', 'You need to be logged in to do that!')
			res.redirect('back')	
		}
}

middlewareObj.checkCommentOwnership = function checkCommentOwnership(req, res, next) { 
	if (req.isAuthenticated()) { 
		Comment.findById(req.params.comment_id, function(err, comment) { 
			if (err || !comment) { 
				req.flash('error', 'Comment not found')
				res.redirect('back')
			} else { 
				if (comment.author.id.equals(req.user._id)) { 
					next()
				} else { 
					req.flash('error', "You don't have permission to do that!")
					res.redirect('back')
				}
			}
		})
	} else { 
		req.flash('error', 'You need to be logged in to do that!')
		res.redirect('back')
	}
}


module.exports = middlewareObj
