const express = require('express')
const router = express.Router()
const Activity = require('../models/activity')
const Comment = require('../models/comment')
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
router.post("/", middleware.isLoggedIn, upload.single('image'), function(req, res) { 
	if (req.file) { 
		cloudinary.uploader.upload(req.file.path, function(err, result) {
			if (err) { 
				console.log(err);
				req.flash('error', err.message);
				return res.redirect('back')
			}
			// add cloudinary url for the image to the activity object under image property
			req.body.activity.image = result.secure_url;
			// add author to activity
			req.body.activity.imageId = result.public_id;
			req.body.activity.author = {
				id: req.user._id,
				username: req.user.username
			}
			Activity.create(req.body.activity, function(err, activity) {
				if (err) {
					req.flash('error', err.message);
					return res.redirect('back');
				}
				req.flash('success', 'Activity posted!')
				res.redirect('/activities/' + activity.id);
			});
		});
	} else { 
		req.body.activity.author = {
			id: req.user._id,
			username: req.user.username
		}
		Activity.create(req.body.activity, function(err, activity) { 
			if (err) { 
				req.flash('error', err.emssage)
				return res.redirect('back')
			}
			req.flash('success', 'Activity posted!')
			res.redirect('/activities/' + activity.id)
		})
	}
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
router.put('/:id', middleware.checkActivityOwnership, upload.single('image'), function(req, res) { 
	Activity.findById(req.params.id, req.body.activity, async function(err, activity) { 
		if (err) { 
			req.flash('error', err.message)
			res.redirect('back')
		} else { 
			if (req.file) { 
				try { 
					await cloudinary.uploader.destroy({public_id: activity.imageId}) 
					let result = await cloudinary.uploader.upload(req.file.path) 
					activity.imageId = result.public_id
					activity.image = result.secure_url
				} catch(err) { 
					console.log(err)
					req.flash('error', err.message)
					return res.redirect('back')
				}
			}
			activity.name = req.body.activity.name
			activity.description = req.body.activity.description
			activity.date = req.body.activity.date
			activity.category = req.body.activity.category
			await activity.save()
			req.flash('success', 'Successfully updated activity')
			res.redirect('/activities/' + req.params.id)
		}
	})
})

// destroy the activity
router.delete('/:id', middleware.checkActivityOwnership, function(req, res) {
	Activity.findById(req.params.id, async function(err, activity) { 
		if (err) { 
			console.log(err)
			req.flash('error', err.message)
			return res.redirect('back')
		} 
		try {
			activity.comments.forEach(async function(comment) { 
				await Comment.findByIdAndRemove(comment)
			})
			await cloudinary.uploader.destroy(activity.imageId)
			await activity.remove()
			req.flash('success', 'Activity deleted')
			res.redirect('/activities')
		} catch (err) { 
			req.flash('error', err.message)
			return res.redirect('back')
		}
	})
})

//fuzzy search regex function
function escapeRegex(text) {
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
};

// export
module.exports = router
