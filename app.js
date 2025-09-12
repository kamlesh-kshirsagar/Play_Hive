const express = require("express"),
    mongoose = require("mongoose"),
    bodyParser = require("body-parser");
const passport = require('passport');
const session = require("express-session");
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const Razorpay = require('razorpay');
const MongoStore = require('connect-mongo');

const User = require("./model/User");
const Tournament = require("./model/Tournament");
const Transaction = require("./model/Transaction");

let app = express();

// Use environment variable for MongoDB URI
mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://kamleshkshirsagar80:whTthlQRbsPUkKHV@cluster0.u9ubrnw.mongodb.net/playhiveDB');
mongoose.connection.once('open', () => console.log('Connected to MongoDB'));

// Initialize Razorpay with env variables
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_KEY_HERE', 
    key_secret: process.env.RAZORPAY_KEY_SECRET || 'SECRET_KEY_HERE'
});

// Session configuration
app.use(session({
    secret: "playhive-secret-key",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI }),
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
app.use(async (req, res, next) => {
    if (req.session.user && req.session.user.id) {
        const user = await User.findById(req.session.user.id);
        if (user) {
            res.locals.currentUser = {
                id: user._id,
                username: user.username,
                isAdmin: user.isAdmin
            };
        } else {
            res.locals.currentUser = null;
        }
    } else {
        res.locals.currentUser = null;
    }
    next();
});

// Home route
app.get("/", function (req, res) {
    res.render("home");
});

// Tournament route
app.get("/tournament", isLoggedIn, async function (req, res) {
    const tournaments = await Tournament.find({}).sort({ date: -1 });
    res.render('tournament', { username: req.session.user.username, tournaments });
});

// About route
app.get("/about", function (req, res) {
    res.render("about");
});

// Contact route
app.get("/contact", function (req, res) {
    res.render("contact");
});

// Leaderboard route
app.get("/leaderboard", function (req, res) {
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
        
        const user = await User.findOne({ username });
        
        if (!user) {
            return res.render('login', { error: 'Invalid username or password' });
        }
        const isMatch = await user.comparePassword(password);
        
        if (!isMatch) {
            return res.render('login', { error: 'Invalid username or password' });
        }
        
        req.session.user = {
            id: user._id,
            username: user.username,
        };
        
        return res.redirect('/');
        
    } catch (error) {
        console.error('Login error:', error);
        return res.render('login', { error: 'An error occurred during login. Please try again.' });
    }
});

// Join tournament routes
app.get("/join", isLoggedIn, async function (req, res) {
    const tournamentId = req.query.id;
    let tournament = null;
    if (tournamentId) {
        tournament = await Tournament.findById(tournamentId);
    }
    res.render("join", { tournament });
});

// Create Razorpay order
app.post('/create-order', isLoggedIn, async (req, res) => {
    try {
        const { amount, tournamentId, tournamentName } = req.body;
        
        // Create a Razorpay order
        const options = {
            amount: amount * 100, // amount in paise
            currency: 'INR',
            receipt: `receipt_${Date.now()}`,
            notes: {
                tournamentId: tournamentId,
                tournamentName: tournamentName,
                userId: req.session.user.id,
                username: req.session.user.username
            }
        };
        
        const order = await razorpay.orders.create(options);
        
        res.json({
            success: true,
            order: order
        });
    } catch (error) {
        console.error('Order creation error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create order'
        });
    }
});

// Payment verification route
app.post('/verify-payment', isLoggedIn, async (req, res) => {
    try {
        const { paymentId, orderId, signature, tournamentId, tournamentName, amount } = req.body;
        
        
        // Create a new transaction record
        const transaction = await Transaction.create({
            userId: req.session.user.id,
            username: req.session.user.username,
            tournamentId: tournamentId,
            tournamentName: tournamentName,
            amount: amount,
            paymentId: paymentId,
            orderId: orderId,
            status: 'completed',
            paymentMethod: 'razorpay'
        });
        
        // Register the user for the tournament
        const tournament = await Tournament.create({
            tname: tournamentId,
            username: req.session.user.username,
        });
        
        return res.json({ success: true, message: 'Payment verified successfully' });
    } catch (error) {
        console.error('Payment verification error:', error);
        return res.status(500).json({ success: false, message: 'Payment verification failed' });
    }
});

app.get('/transactions', isLoggedIn, async (req, res) => {
    try {
        const transactions = await Transaction.find({ userId: req.session.user.id })
            .sort({ createdAt: -1 });
        
        res.render('transactions', { transactions });
    } catch (error) {
        console.error('Error fetching transactions:', error);
        res.status(500).send('Failed to fetch transaction history');
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

// Admin authentication middleware
function isAdmin(req, res, next) {
    if (req.session && req.session.user) {
        // Fetch user from DB to check isAdmin
        User.findById(req.session.user.id).then(user => {
            if (user && user.isAdmin) {
                return next();
            } else {
                return res.status(403).send('Forbidden: Admins only');
            }
        }).catch(() => res.status(403).send('Forbidden: Admins only'));
    } else {
        res.redirect('/login');
    }
}

// Admin panel route
app.get('/admin', isAdmin, async (req, res) => {
    const tournaments = await Tournament.find({}).sort({ date: -1 });
    res.render('admin', { tournaments });
});

// Add tournament (admin)
app.post('/admin/tournament', isAdmin, async (req, res) => {
    try {
        const { tname, gamename, gameid, date, entryFee, prize1, prize2, prize3 } = req.body;
        await Tournament.create({ tname, gamename, gameid, date, entryFee, prize1, prize2, prize3 });
        res.redirect('/admin');
    } catch (err) {
        res.status(500).send('Failed to add tournament');
    }
});

// Delete tournament (admin)
app.post('/admin/tournament/delete/:id', isAdmin, async (req, res) => {
    try {
        await Tournament.findByIdAndDelete(req.params.id);
        res.redirect('/admin');
    } catch (err) {
        res.status(500).send('Failed to delete tournament');
    }
});

// Only this should be at the end:
module.exports = app;



