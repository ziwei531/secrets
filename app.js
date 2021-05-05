require('dotenv').config();

const express = require("express");
const app = express();
const ejs = require("ejs");
const mongoose = require("mongoose");
const encrypt = require('mongoose-encryption');
const md5 = require('md5');
const bcrypt = require('bcrypt');
const saltRounds = 10;


mongoose.connect('mongodb://localhost:27017/userDB', {useNewUrlParser: true, useUnifiedTopology: true});

//body parser
app.use(express.json());
app.use(express.urlencoded({
    extended: true
}));

//Schema
const userSchema = new mongoose.Schema({
    email: String, 
    password: String
});

const secret = process.env.SECRET;
userSchema.plugin(encrypt, { secret: secret, encryptedFields: ['password'] });


//Model
const User = new mongoose.model("User", userSchema);

app.use(express.static("public"));
app.set("view engine", 'ejs');

app.get('/', (req, res) => {
    res.render('home');
})

app.get('/login', (req, res) => {
    res.render('login');
});

app.get('/register', (req, res) => {
    res.render('register');
});

app.post("/register", (req,res) => {

    bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
        const newUser = new User({
            email: req.body.username,
            password: hash
        });
        
        newUser.save(err => {
            err ? console.log(err) :
            res.render("secrets");
        });
    });
});

app.post('/login', (req,res) => {
    const username = req.body.username;
    const password = req.body.password;

    User.findOne({email: username}, (err, foundUser) => {
        if (err) {
            console.log(err);
        } else {
            if (foundUser) {
                bcrypt.compare(password, foundUser.password, (err, result) => {
                    if (result) {
                        res.render('secrets');
                    }
                });
            }
        }
    });
});

app.listen(3000, () => {
    console.log("Successfully connected to port " + 3000)
})