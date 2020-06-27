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

//mongoose.connect("mongodb://localhost:27017/test_together", {useNewUrlParser: true, useUnifiedTopology: true})
mongoose.connect("mongodb+srv://testtogether314:Test4Togetheraho@dotogether-z9xfo.mongodb.net/test_together?retryWrites=true&w=majority", {useNewUrlParser: true, useUnifiedTopology: true})
app.use(bodyParser.urlencoded({extended: true}))
app.set("view engine", "ejs")
app.use(express.static(__dirname + '/public'))
app.use(methodOverride('_method'))
app.use(flash())
//seedDB()

app.use(require('express-session')({ 
	secret: 'Super Secret Secret', 
	resave: false, 
	saveUninitialized: false
}))
app.use(passport.initialize())
app.use(passport.session())
passport.use(new LocalStrategy(User.authenticate()))
passport.serializeUser(User.serializeUser())
passport.deserializeUser(User.deserializeUser())
   
app.use(function(req, res, next) { 
	res.locals.currentUser = req.user
	res.locals.error = req.flash('error')
	res.locals.success = req.flash('success')
	next()
})

app.use('/activities', activityRoutes)
app.use('/activities/:id/comments', commentRoutes)
app.use(indexRoutes)

app.listen(process.env.PORT, process.env.IP, function() { 
	console.log('Server Started')
})
