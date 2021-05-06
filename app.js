require('dotenv').config();

const express = require("express");
const app = express();
const ejs = require("ejs");
const mongoose = require("mongoose");
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const session = require('express-session');
const encrypt = require('mongoose-encryption');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const md5 = require('md5');
const findOrCreate = require('mongoose-findorcreate');

//body parser
app.use(express.json());
app.use(express.urlencoded({
    extended: true
}));

app.use(express.static("public"));
app.set("view engine", 'ejs');

app.use(session({
    secret: "Our little secret.",
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect('mongodb://localhost:27017/userDB', {useNewUrlParser: true, useUnifiedTopology: true});
mongoose.set('useCreateIndex', true);

//Schema
const userSchema = new mongoose.Schema({
    email: String, 
    password: String,
    googleId: String,
    facebookId: String,
    secret: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

//Model
const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy());

    passport.serializeUser(function(user, done) {
        done(null, user.id);
    });
  
    passport.deserializeUser(function(id, done) {
    User.findById(id, function(err, user) {
        done(err, user);
    });
});

//GOOGLE LOGIN
passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

//AUTH FOR GOOGLE
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile'] })
);

//FINAL LOGIN SEQUENCE FOR GOOGLE
app.get('/auth/google/secrets', 
  passport.authenticate('google', { failureRedirect: '/login' }),
  (req, res) => {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
});

//FACEBOOK LOGIN
passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_CLIENT_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: "http://localhost:3000/auth/facebook/secrets"
  },
  function(accessToken, refreshToken, profile, done) {
    User.findOrCreate({ facebookId: profile.id }, function(err, user) {
      if (err) { return done(err); }
      done(null, user);
    });
  }
));

//AUTH FOR FACEBOOK
app.get('/auth/facebook', passport.authenticate('facebook'));

//FINAL AUTH FOR FACEBOOK
app.get('/auth/facebook/secrets',
  passport.authenticate('facebook', { successRedirect: '/secrets', failureRedirect: '/login' }));

app.get('/', (req, res) => {
    res.render('home');
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.get('/register', (req, res) => {
    res.render('register');
});

app.get("/logout", (req, res) => {
    req.logout();
    res.redirect('/');
})

//Check if the user is authenticated
app.get("/secrets", (req, res) => {
    User.find({'secret': {$ne: null}}, (err, foundSecrets) => {
        if (err) {
            console.log(err);
        }
        else {
            if (foundSecrets) {
                res.render('secrets', {usersWithSecrets: foundSecrets})
            }
        }
    });
});

app.get('/submit', (req, res) => {
    if (req.isAuthenticated()) {
        res.render("submit");
    } 
    else {
        res.redirect('/login');
    }
});

app.post("/register", (req,res) => {
    
    User.register({username: req.body.username}, req.body.password, (err, user) => {
        if (err) {
            console.log(err);
            res.redirect('/register');
        }
        else {
            passport.authenticate('local')(req, res, () => {
                res.redirect("/secrets");
            })
        }
    })

});

app.post('/login', (req,res) => {

    const user = new User({
        username: req.body.username,
        password: req.body.password
    });

    req.login(user, (err) => {
        (err) ? console.log(err) :
        passport.authenticate("local")(req, res, () => {
            res.redirect("/secrets");
        })
    });
});

app.post('/submit', (req, res) => {
    const submittedSecret = req.body.secret;

    User.findById(req.user.id, (err, foundUser) => {
        if (err) {
            console.log(err);
        } 
        else {
            if (foundUser) {
                foundUser.secret = submittedSecret;
                foundUser.save( () => {
                    res.redirect('secrets');
                })
            }
        }
    });
});



app.listen(3000, () => {
    console.log("Successfully connected to port " + 3000);
})