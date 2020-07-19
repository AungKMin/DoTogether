const mongoose = require('mongoose')
const Activity = require('./models/activity')
const Comment = require('./models/comment')

const data = [
	{name: 'Playing golf in China', 
		description: 'Looking for someone to play golf with this Sunday' },
	{name: 'Learning machine learning', 
		description: 'Looking for someone to dive into machine learning with'}, 
	{name: 'Eating at MacDonalds', 
		description: 'Looking for someone to eat with this Monday lunch'}
]

function seedDB() { 

	Activity.deleteMany({}, function(err) { 
		if (err) { 
			console.log(err)	
		} else { 		
			console.log('deleted stuff')
			data.forEach(function(activity) { 
				Activity.create(activity, function(err, activity) { 
					if (err) { 
						console.log(err)
					} else { 
						console.log('Added an activity')
						Comment.create (
							{
								text: 'Interested!',
								author: 'Bob Smith - bobsmith@gmail.com'
							}, function(err, comment) { 
								if (err) { 
									console.log(err)
								} else { 
									activity.comments.push(comment)
									activity.save()
									console.log('created comment')
								}
							})
					}
				})
			})
		}
	})
}

module.exports = seedDB;
