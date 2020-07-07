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
	seedDB = require('./seeds')

// requring routes
const activityRoutes = require('./routes/activities'),
	commentRoutes = require('./routes/comments'),
	indexRoutes = require('./routes/index')

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

app.get('*', function(req, res) { 
	res.status(404).render('404')
})

// port
let port = process.env.PORT || '3000'
app.listen(port, process.env.IP, function() { 
	console.log('Server Started')
})
