require("dotenv").config();
const express = require("express");
const ejs = require("ejs");
const mongoose = require('mongoose');
const passport = require("passport");
const session = require('express-session');
const passportLocalMongoose = require("passport-local-mongoose");

const app = express();

app.set('view engine', 'ejs');

// ---- MIDDLEWARE SETUP ----

app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(session({
    secret: 'Our little secret.',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        maxAge: 60000
    }
}));

/*  PASSPORT SETUP  */

app.use(passport.initialize());
app.use(passport.session());

/*  MONGOOSE SETUP  */

mongoose.connect('mongodb://localhost:27017/userDB', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
    .then(() => console.log('Connected successfully to userDB'))
    .catch(err => console.error(err));

mongoose.set('useCreateIndex', true);

const userSchema = new mongoose.Schema({
    email: String,
    password: String
});
userSchema.plugin(passportLocalMongoose);

const User = new mongoose.model('User', userSchema);

/* PASSPORT LOCAL AUTHENTICATION */

passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

/*  ROUTES  */

app.get("/", (req, res) => {
    res.render('home');
})
app.route("/login")

    .get((req, res) => {
        res.render('login');
    })

    .post(passport.authenticate("local", {successRedirect: "/secrets", failureRedirect: "/login" } )); 

app.route("/register")

    .get((req, res) => {
        res.render('register');
    })

    .post((req, res) => {
        User.register({ username: req.body.username }, req.body.password, (err, user) => {
            if (err) {
                console.error(err);
                res.redirect("/register");
            } else {
                passport.authenticate('local', { successFlash: "Sucessfully registered" })(req, res, () => {
                    res.redirect("/secrets");
                })
            }
        })
    })

app.route("/secrets")
    .get((req, res) => {
        if (req.isAuthenticated()) {
            res.render("secrets");
        } else {
            res.redirect("/login");
        }
    });

app.route("/logout")
    .get((req, res) => {
        req.logout();
        res.redirect("/");
    });

app.listen(3000, () => {
    console.log('Server started at port 3000');
});
