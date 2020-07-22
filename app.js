const express = require('express'),
	app = express(),
	bodyParser = require('body-parser'),
	mongoose = require('mongoose'),
	flash = require('connect-flash'),
	passport = require('passport'),
	LocalStrategy = require('passport-local'),
	methodOverride = require('method-override')
	Activity = require('./models/activity'),
	Comment = require('./models/comment'),
	User = require('./models/user'),
	Conversation = require('./models/conversation'),
	seedDB = require('./seeds'),
	moment = require('moment')

// requring routes
const activityRoutes = require('./routes/activities'),
	commentRoutes = require('./routes/comments'),
	indexRoutes = require('./routes/index'),
	userRoutes = require('./routes/users'),
	messageRoutes = require('./routes/messages')

// connect to MongoDB service 
let url = process.env.DATABASEURL || 'mongodb://localhost:27017/test_together' 
mongoose.connect(url, {useNewUrlParser: true, useUnifiedTopology: true})

// include requirements to express
app.use(bodyParser.urlencoded({extended: true}))
app.set("view engine", "ejs")
app.use(express.static(__dirname + '/public'))
app.use(methodOverride('_method'))
app.use(flash())
//seedDB()

// set up express session
app.use(require('express-session')({ 
	secret: 'Super Secret Secret', 
	resave: false, 
	saveUninitialized: false
}))

// add moment to deal with date
app.locals.moment = require('moment')

// set up passport
app.use(passport.initialize())
app.use(passport.session())
passport.use(new LocalStrategy(User.authenticate()))
passport.serializeUser(User.serializeUser())
passport.deserializeUser(User.deserializeUser())
   
// categories for activities
let categories = ['Sport', 'Learning', 'Reading', 'Tabletop', 'Gaming', 'Social', 'Music', 'Art','Coding', 'Mindfulness', 'Film', 'Design'] 

// add a middleware to every route
app.use(function(req, res, next) {
	// pass a user to ejs file
	res.locals.currentUser = req.user
	// flash error or success
	res.locals.error = req.flash('error')
	res.locals.success = req.flash('success')
	// activity categories 
	res.locals.categories = categories
	next()
})

// use imported routes
app.use('/activities', activityRoutes)
app.use('/activities/:id/comments', commentRoutes)
app.use(indexRoutes)
app.use('/users', userRoutes)
app.use('/t', messageRoutes)

app.get('*', function(req, res) { 
	res.status(404).render('404')
})

// port
let port = process.env.PORT || '3000'
var server = app.listen(port, process.env.IP, function() { 
	console.log('Server Started')
})

// web sockets for messaging 
var io = require('socket.io').listen(server)

name_id_dict = {}
io.on('connection', (socket) => {

	// receive the username of the socket
	socket.on('username', ({username, to}) => { 
		console.log('User connect: ' + username + ' to ' + to)
		if (!name_id_dict[username]) { 
			name_id_dict[username] = {socketids: [socket.id], tos: [to]}
		} else { 
			name_id_dict[username].socketids.push(socket.id)
			name_id_dict[username].tos.push(to)
		}
		console.log(name_id_dict)
	})

	// receive the message
	socket.on('message', message => { 
		fullMessage = {...message, time: moment(Date.now()).format("YYYY-MM-DD HH:mm a")}

		// Sending user stuff 
		for (let i = 0; i < name_id_dict[message.from].socketids.length; i++) { 
			if (message.to === name_id_dict[message.from].tos[i]) { 
				io.to(name_id_dict[message.from].socketids[i]).emit('message', fullMessage)
			}
		}

		// Receiving user stuff
		if (name_id_dict[message.to]) {
			// If the receiving user is online, 
			for (let i = 0; i < name_id_dict[message.to].socketids.length; i++) {
				// Update the websockets that are currently on this conversation
				if (message.from === name_id_dict[message.to].tos[i]) { 
					io.to(name_id_dict[message.to].socketids[i]).emit('message', fullMessage)
				// Update the websockets that are not on this conversation with notifications
				} else { 
					io.to(name_id_dict[message.to].socketids[i]).emit('notification', message.from)
				}
			}
		}
		console.log(message.from + ' to ' + message.to + ': ' + message.text)
	})
	
	// user disconnects
	socket.on('disconnect', () => { 
		for (const username in name_id_dict) { 
			if (name_id_dict[username] && name_id_dict[username].socketids.includes(socket.id)) { 
				console.log(username + ' disconnected')
				if (name_id_dict[username].socketids.length <= 1) {
					// delete the entire definition
					name_id_dict[username] = null
				} else { 
					// delete the one socket 
					const deleteIndex = name_id_dict[username].socketids.indexOf(socket.id)
					name_id_dict[username].socketids.splice(deleteIndex, 1)
					name_id_dict[username].tos.splice(deleteIndex, 1)
				}
				break
			}
		}
		console.log(name_id_dict)
	})

})
