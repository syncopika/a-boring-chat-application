// these are all the functions that handle routes (i.e. POST, GET, DELETE)
// all of these routes will be controlled by passport for ensuring proper access for users
// super helpful! https://scotch.io/tutorials/easy-node-authentication-setup-and-local

// load user model
var User = require('../models/user.js');

module.exports = function(app, passport){

	// this will serve the login page to the user first!
	// if login is successful, then the server can serve the chat page
	app.get('/', function(req, res){
		res.render('login.ejs', { message: "" });
	});
	
	app.get('/login', function(req, res){
		res.render('login.ejs', { message: req.flash('loginMessage') });
	});
	
	// when server receives a POST request to /login, need to check form input 
	// and authenticate 
	app.post('/login', passport.authenticate('local-login', {
		failureRedirect: '/login',
		failureFlash: true
	}), function(req, res){
		//console.log(req.user);
		res.render('index.ejs', {user: req.user});
	});
	

	/******

		the app.get and app.post below are for when the user wants to bypass login and just use 
		chat as anonymous user. 
		
	******/
	// so when the client does the post request asking for '/nologin',
	// the server will send back a success (200) response. as a result,
	// the client will then change the url to the '/index.html' page via window.location.
	// then the server will pick up on that change and treat it like a request?? I think so, a get request.
	// that change to the url points to a new blank page, which I think is why when I sendFile('/index.html'),
	// it can get served because there's no html already present. 
	// https://stackoverflow.com/questions/10777246/interweave-ejs-and-javascript-variables-inside-tags
	
	/*
	// skip login option (default user)
	app.post('/nologin', function(req, res){
		res.status(200);
		res.end();
	});
	*/
	
	// show the register page 
	app.get('/register', function(req, res){
		res.render('register.ejs', { message: req.flash('registerMessage') });	
	});
	
	// take care of registering user after form input has been submitted 
	app.post('/register', passport.authenticate('local-register', {
		successRedirect: '/index', // go to chat page 
		failureRedirect: '/register',
		failureFlash: true
	}));

	// show chat page after user has logged in 
	app.get('/index', function(req, res){
		res.render('index.ejs', {
			user: req.user 	// get user name from session and pass to template
		});
	});
	
	// show logout page 
	app.get('/logout', function(req, res){
		req.logout(); 			// this is a passport function
		res.redirect('/');  	// go back to home page 
	
	});
	
	// middleware function to make sure user is logged in
	function isLoggedIn(req, res, next){
		
		// if user is authenticated, then ok
		if(req.isAuthenticated()){
			return next();
		}

		// if not authenticated, take them back to the home page 
		res.redirect('/');
	}
	
	
/****

	this covers the chat functionality of the application

****/
	
	// when user loads page, client page should automatically send a getJSON request to this server
	// the request will ask for a url, which the below will respond to. simply connect to the database
	// and send back the default ascii faces info as the response. 
	app.get('/default', function(req, res){
		
		/*
		// connect with database 
		var url = 'mongodb://127.0.0.1:27017/chatapp';
		MongoClient.connect(url, function(err, db){
			assert.equal(null, err);
			console.log("getting the default ascii faces ^_^...");
			
			// get the default emoticons 
			var defaultSet = db.collection('userData').findOne({"_id": "default"}, function(err, result){
				res.send(result); // send back to client the associative array with all the default emoticons 
			});
			
			db.close();
		});
		*/
	});

	// this is for when user wants to add a new emoticon 
	app.post('/post_ascii', function(req, res){
		
		// keep in mind that some characters, when not properly escaped, will be ignored in the query, i.e
		// chars like '%' and '#' will result in a blank when trying to get the 'selectedFace'. so '#_#' is invalid right now. 
		var category = req.query.category.trim();
		var selectedFace = req.query.face.trim();
		
		// update database with the new info
		var key = "local.ascii_emoticons" + "." + category;
		var addAscii = {};
		addAscii[key] = selectedFace;

		User.findOneAndUpdate(
		                    {'local.username': req.user.local.username }, 
							{"$addToSet": addAscii}, 
							{new: true, upsert: true},
							function(err, user){
								if(err){
									throw err;
								}
								res.send(user);
							});
	});

	// this is for when the user deletes an ascii face 
	// btw, an interesting thing about using variable names for keys in objects:
	// https://stackoverflow.com/questions/2274242/using-a-variable-for-a-key-in-a-javascript-object-literal
	// https://stackoverflow.com/questions/17039018/how-to-use-a-variable-as-a-field-name-in-mongodb-native-findone
	app.delete('/delete_asciiface', function(req, res){
		
		// get the queries' values so we know which ascii face user wants to delete 
		var category = req.query.category.trim();
		var selectedFace = req.query.face.trim();
		
		// this is the key that matches the array with the face to remove 
		var key = "local.ascii_emoticons" + "." + category;
		var removeAscii = {};
		removeAscii[key] = selectedFace;
		
		// delete the selected emoticon from the database 
		User.findOneAndUpdate({'local.username': req.user.local.username },
							  {"$pull": removeAscii},
							  {new: true, upsert: true},
							  function(err, user){
								if(err){
									throw err;
								}
								res.send(user);
							 });
		
	});
}