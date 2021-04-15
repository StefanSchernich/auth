require("dotenv").config();
const express = require("express");
const ejs = require("ejs");
const mongoose = require('mongoose');
const passport = require("passport");
const session = require('express-session');
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require( 'passport-google-oauth2' ).Strategy;
const findOrCreate = require('mongoose-findorcreate');

const app = express();

app.set('view engine', 'ejs');

// ---- MIDDLEWARE SETUP ----

app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
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
    password: String,
    googleId: String,
    secret: String
});

/*  SCHEMA PLUGINS  */
userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

const User = new mongoose.model('User', userSchema);

/* PASSPORT LOCAL AUTHENTICATION */
passport.use(User.createStrategy());

/* (DE-)SERIALIZE USER FOR LOCAL & OAUTH AUTHENTICATION */

passport.serializeUser(function(user, done) {
    done(null, user);
  });
  
  passport.deserializeUser(function(user, done) {
    done(null, user);
  });

/* PASSPORT GOOGLE OAUTH 2.0 AUTHENTICATION */

passport.use(new GoogleStrategy({
    clientID:     process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/check",
    passReqToCallback   : true
  },
  function(request, accessToken, refreshToken, profile, done) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return done(err, user);
    });
  }
));

/*  ROUTES  */

app.get("/", (req, res) => {
    res.render('home');
});

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
    });

app.get("/auth/google", passport.authenticate('google', {scope: "profile"}));

app.get("/auth/google/check", 
    passport.authenticate('google', { successRedirect: "/secrets", failureRedirect: "/login" }));

app.route("/submit")
    .get((req, res) => {
        if (req.isAuthenticated()) {
            res.render("submit");
        } else {
            res.render("login");
        }
    })

    .post(async (req, res) => {
        try {
            if (req.isAuthenticated()) {
            const submittedSecret = req.body.secret;
            const foundUser = await User.findById(req.user._id);
            foundUser.secret = submittedSecret;
            foundUser.save(() => {
                res.redirect("/secrets");
            })
            } else {
                res.redirect("/login");
            }
        } catch (err) {
            console.error(err);
        }
    });

app.route("/secrets")
    .get(async (req, res) => {
        const usersWithSecrets = await User.find({secret: {$ne: null}});
        res.render("secrets", {usersWithSecrets: usersWithSecrets});
    });

app.route("/logout")
    .get((req, res) => {
        req.logout();
        res.redirect("/");
    });

app.listen(3000, () => {
    console.log('Server started at port 3000');
});
