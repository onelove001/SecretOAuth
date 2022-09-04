require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const encrypt = require("mongoose-encryption");

const port = 3000;
const app = express();
app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended:true}));

// setting up database
main().catch(err => console.log(err));
async function main() {
  await mongoose.connect('mongodb://localhost:27017/userDB');
}

// setting up the schema architecture for a user table
const userSchema = new mongoose.Schema({
  email:String,
  password:String
});


// setting up encryption for password
userSchema.plugin(encrypt, {secret:process.env.SECRET, encryptedFields: ['password'] });

const User = mongoose.model("User", userSchema);


app.listen(port, () => {
  console.log("Server running on port "+port)
})


app.get("/", (req, res) => {
  res.render("home")
})


app.get("/login", (req, res) => {
  res.render("login")
})

app.post("/login", (req, res) => {
  const username = req.body.username;
  const password = req.body.password;
  User.findOne({email:username}, (err, foundUser) => {
    if(err){
      console.log(err)
    } else {
      if(foundUser){
        if(foundUser.password === password) {
          res.render("secrets")
        } else {
          console.log("invalid password");
          res.redirect("/")
        }
      } else {
        console.log("Invalid Email")
        res.redirect("/")
      }
    }
  });
});


app.get("/register", (req, res) => {
  res.render("register")
})

app.post("/register", (req, res) => {
  const newUser = new User({
    email:req.body.username,
    password: req.body.password
  })
  newUser.save( (err) => {
    if(!err){
      res.render("secrets")
    } else {
      console.log(err)
    }
  })
})


app.get("/submit", (req, res) => {
  res.render("submit")
})
