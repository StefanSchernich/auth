require("dotenv").config();
const express = require("express");
const ejs = require("ejs");
const mongoose = require('mongoose');
const bcrypt = require("bcrypt");

const saltRounds = 10;
const app = express();

app.set('view engine', 'ejs');

app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// connect to DB
mongoose.connect('mongodb://localhost:27017/userDB', {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
    .then(() => console.log('Connected successfully to userDB'))
    .catch(err => console.error(err));

const userSchema = new mongoose.Schema({
    email: String,
    password: String
});

const User = new mongoose.model('User', userSchema);


// routes
app.get("/", (req, res) => {
    res.render('home');
})
app.route("/login")
    .get((req, res) => {
        res.render('login');
    })

    .post(async (req, res) => {
        const email = req.body.username;
        const pw = req.body.password;
        const foundUser = await User.findOne({email: email});
        if (!foundUser) {
            console.log('User does not exist!');
            res.redirect('/login');
        } else {
            if (foundUser.password === pw) {
                res.render("secrets");                     
            } else {
                console.log('Password is not correct');
                res.redirect('/login');
            }
        }
    });

app.route("/register")
    .get((req, res) => {
        res.render('register');
    })
    .post((req, res) => {
        bcrypt.hash(req.body.password, saltRounds).then(hash => {
            User.create({
                email: req.body.username,
                password: hash
            })
                .then(() => {
                    console.log('User added to DB');
                    res.render('secrets');
                })
                .catch(err => console.error(err));
        });
    });

app.listen(3000, () => {
    console.log('Server started at port 3000');
});
