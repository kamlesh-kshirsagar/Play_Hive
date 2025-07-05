const express = require("express"),
    mongoose = require("mongoose"),
    bodyParser = require("body-parser");
const passport = require('passport');
const session = require("express-session");
const bcrypt = require('bcrypt');

const User = require("./model/User");
const Tournament = require("./model/Tournament");

let app = express();
mongoose.connect('mongodb://localhost:27017/playhiveDB');
mongoose.connection.once('open', () => console.log('Connected to MongoDB'));

// Session configuration
app.use(session({
    secret: "playhive-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 3600000, // 1 hour
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true
    }
}));

app.use(passport.initialize());
app.use(passport.session());
app.set("view engine", "ejs");
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));

// Middleware to make user data available to all templates
app.use((req, res, next) => {
    res.locals.currentUser = req.session.user;
    next();
});

// Home route
app.get("/", function (req, res) {
    res.render("home");
});

// Tournament route
app.get("/tournament", isLoggedIn, function (req, res) {
    res.render('tournament', { username: req.session.user.username });
});

// About route
app.get("/about", function (req, res) {
    res.render("about");
});

// Contact route
app.get("/contact", isLoggedIn, function (req, res) {
    res.render("contact");
});

// Leaderboard route
app.get("/leaderboard", isLoggedIn, function (req, res) {
    res.render("leaderboard");
});

// Secret route
app.get("/secret", isLoggedIn, function (req, res) {
    res.render("secret");
});

// Registration routes
app.get("/register", function (req, res) {
    res.render("register");
});

app.post("/register", async (req, res) => {
    try {
        // Check if user already exists
        const existingUser = await User.findOne({ 
            $or: [
                { username: req.body.username },
                { email: req.body.email }
            ]
        });

        if (existingUser) {
            return res.render("register", { 
                error: "Username or email already exists",
                formData: req.body
            });
        }

        // Create new user
        const user = await User.create({
            username: req.body.username,
            password: req.body.password, // Will be hashed by the pre-save hook
            fname: req.body.fname,
            lname: req.body.lname,
            gameid: req.body.gameid,
            gamename: req.body.gamename,
            email: req.body.email,
            phone: req.body.phone
        });

        // Set up session
        req.session.user = {
            id: user._id,
            username: user.username,
        };

        return res.redirect('/tournament');
    } catch (error) {
        console.error('Registration error:', error);
        return res.render("register", { 
            error: "Registration failed. Please try again.",
            formData: req.body
        });
    }
});

// Login routes
app.get("/login", function (req, res) {
    res.render("login");
});

app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    
    try {
        // Find user by username
        const user = await User.findOne({ username });
        
        if (!user) {
            return res.render('login', { error: 'Invalid username or password' });
        }
        
        // Verify password
        const isMatch = await user.comparePassword(password);
        
        if (!isMatch) {
            return res.render('login', { error: 'Invalid username or password' });
        }
        
        // Set up session
        req.session.user = {
            id: user._id,
            username: user.username,
        };
        
        // Redirect to home page
        return res.redirect('/');
        
    } catch (error) {
        console.error('Login error:', error);
        return res.render('login', { error: 'An error occurred during login. Please try again.' });
    }
});

// Join tournament routes
app.get("/join", isLoggedIn, function (req, res) {
    res.render("join");
});

app.post('/join', isLoggedIn, async (req, res) => {
    try {
        const { tname } = req.body;
        const username = req.session.user.username;

        const tournament = await Tournament.create({
            tname: tname,
            username: username,
        });

        res.send(`Tournament "${tournament.tname}" joined successfully by ${tournament.username}!`);
    } catch (error) {
        console.error('Error saving tournament:', error);
        res.status(500).send('Failed to join tournament');
    }
});

// Logout route
app.get("/logout", function (req, res) {
    req.session.destroy(err => {
        if (err) {
            console.error('Logout error:', err);
            return res.redirect('/');
        }
        res.redirect('/');
    });
});

// Authentication middleware
function isLoggedIn(req, res, next) {
    if (req.session && req.session.user) {
        return next();
    }
    res.redirect('/login');
}

let port = process.env.PORT || 3000;
app.listen(port, function () {
    console.log("Server Has Started! at http://localhost:3000");
});

