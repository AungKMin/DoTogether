const express = require('express')
const router = express.Router()
const Activity = require('../models/activity')
const Comment = require('../models/comment')
const middleware = require('../middleware')

// index (show all activities)
router.get("/", function(req, res) { 
	if(req.query.search || req.query.category){ 
		// regex for fuzzy search
		const regex = new RegExp(escapeRegex(req.query.search), 'gi');
		// find the activiites with the regex in its name OR description
		//console.log({$setIntersection:[category, req.query.category]})
		Activity.find({$or:[{name: regex},{description: regex}/*,{category:req.query.category}*/]}, function(err, activities) { 
			if (err) { 
				console.log(err)
			} else { 
				// filter the activities returned to the ones that contain all the categories the user searched
				if (req.query.category) {
					// if there is only one category selected, make it into an array
					if (typeof req.query.category === 'string') { 
						req.query.category = [req.query.category]
					} 
					activities = activities.filter(activity =>  
						req.query.category.every(cat =>  
							activity.category.includes(cat)
						) 
					)
				}
				res.render("activities/index", {activities: activities, page: 'activities'})
			} 
		})
	} else { 
		Activity.find({}, function(err, activities) { 
			if (err) { 
				console.log(err)
			} else { 
				res.render("activities/index", {activities: activities, page: 'activities'})
			} 
		})
	}
})

// create an activity
router.post("/", middleware.isLoggedIn, function(req, res) { 
	const name = req.body.name
	const date = req.body.date
	const image = req.body.image
	const description = req.body.description
	const category = req.body.category
	let author = { 
		id: req.user._id, 
		username: req.user.username
	}
	let newActivity = {name: name, image: image, date: date, description: description, category: category, author: author}
	Activity.create(newActivity, function(err, newlyCreated) { 
		if (err) { 
			console.log(err)
		} else { 
			req.user.activities.push(newlyCreated)
			req.user.save()
			req.flash('success', 'Successfully posted Activity')
			res.redirect('/activities')
		} 
	})
})

/*router.post("/", middleware.isLoggedIn, function(req, res) { */
	//const name = req.body.name
	//const image = req.body.image
	//const description = req.body.description
	//let author = { 
		//id: req.user._id, 
		//username: req.user.username
	//}
	//let newActivity = {name: name, image: image, description: description, author: author}
	//Activity.create(newActivity, function(err, newlyCreated) { 
		//if (err) { 
			//console.log(err)
		//} else { 
			//res.redirect('/activities')
		//} 
	//})
/*})*/

// new (show form to create activity)
router.get("/new", middleware.isLoggedIn, function(req, res) { 
	res.render("activities/new")
})

// show an activity
router.get("/:id", function(req, res) { 
	Activity.findById(req.params.id).populate('comments').exec(function(err, activity) { 
		if (err || !activity) { 
			req.flash('error', 'Activity not found')
			res.redirect('back')
		} else { 
			res.render("activities/show", {activity: activity})
		}
	})
} )

// edit (show form for updating activity) 
router.get('/:id/edit', middleware.checkActivityOwnership, function(req, res) {
	Activity.findById(req.params.id, function(err, foundActivity) { 
		res.render('activities/edit', {activity: foundActivity})
	})
})

// update the activity
router.put('/:id', middleware.checkActivityOwnership, function(req, res) { 
	Activity.findByIdAndUpdate(req.params.id, req.body.activity, function(err, activity) { 
		if (err) { 
			res.redirect('/activities')
		} else { 
			res.redirect('/activities/' + req.params.id)
		}
	})
})

// destroy the activity
router.delete('/:id', middleware.checkActivityOwnership, function(req, res) {
	Activity.findById(req.params.id, function(err, activity) { 
		if (err) { 
			console.log(err)
			res.redirect('/activities')
		} else {
			activity.comments.forEach(function(comment) { 
				Comment.findByIdAndRemove(comment, function(err) { 
					if (err) { 
						console.log(err)
						res.redirect('/activities')
					} else { 
					}
				})
			})
		}
	})
	Activity.findByIdAndRemove(req.params.id, function(err) { 
		if (err) { 
			res.redirect('/activities')
		} else { 
			res.redirect('/activities')
		}
	})	
})

//fuzzy search regex function
function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};

// export
module.exports = router
