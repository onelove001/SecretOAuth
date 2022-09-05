//////// IMPORTANT, THE ARRANGEMENT OF THIS CODE IS IMPORTANT /////////
require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const findOrCreate = require("mongoose-findorcreate");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const FacebookStrategy = require("passport-facebook").Strategy;

const app = express();
const port = 3000;
app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended:true}));


app.use(session({
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: false,
  // cookie: { secure: true }
}))

app.use(passport.initialize())
app.use(passport.session())


// Setting up database
main().catch(err => console.log(err));
async function main() {
  await mongoose.connect('mongodb://localhost:27017/userDB');
}

// setting up the schema architecture for a user table
const userSchema = new mongoose.Schema({
  email:String,
  password:String,
  googleId:String,
  facebookId:String,
  secret: String
});


userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate)

const User = mongoose.model("User", userSchema);

passport.use(User.createStrategy());


// This can be used for all type of authentication both local and third packages
passport.serializeUser( (user, cb) => {
  process.nextTick( () => {
    return cb(null, user.id);
  });
});

passport.deserializeUser((id, cb) => {
  User.findById(id, (err, user) => {
    if (err) {
      return cb(err);
    }
    return cb(null, user);
  });
});


// Setting Up OAuth (open authorization standard using google OAuth)
passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({googleId: profile.id}, function (err, user) {
      return cb(err, user);
    });
  }
));

// Setting Up OAuth (open authorization standard using Facebook OAuth)
passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: "http://localhost:3000/auth/facebook/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ facebookId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.listen(port, () => {
  console.log("Server running on port "+port)
})


app.get("/", (req, res) => {
  res.render("home")
});

// Sign Up with Google OAuth
app.get('/auth/google',
  passport.authenticate('google', { scope: ['profile']
}));


app.get('/auth/google/secrets',
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/secrets');
  });

// Sign Up with Facebook OAuth
app.get('/auth/facebook',
  passport.authenticate('facebook'));


app.get('/auth/facebook/secrets',
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/secrets');
  });


app.get("/login", (req, res) => {
  res.render("login")
})


app.post("/login", (req, res) => {
  const user = new User({
    username: req.body.username,
    password: req.body.password
  })
  req.login(user, (err) => {
    if (err) {
      console.log("Invalid User")
      return res.redirect("/login")
    } else {
      passport.authenticate("local")(req, res, () => {
      res.redirect("/secrets")
      });
    }

  })

});

app.get('/logout', (req, res) => {
  req.logout( (err) => {
    if (!err) {
    res.redirect('/');
  } else {
    console.log(err)
  }
  });
});


app.get("/register", (req, res) => {
  res.render("register");
});


app.post("/register", (req, res) => {
  User.register({username:req.body.username}, req.body.password, (err, user) => {
    if (err) {
      console.log(err)
      res.redirect("/register")
    } else {
      passport.authenticate("local")(req, res, () => {
        res.redirect("/secrets")
      });
    }
  });

});

app.get("/secrets", (req, res) => {
  User.find({secret:{$ne:null}}, (err, users) => {
    if (err){
      console.log(err)
    } else {
      if (users) {
        res.render("secrets", {users:users});
      }
    }
  })
});


app.get("/submit", (req, res) => {
  if (req.isAuthenticated()) {
    res.render("submit")
  } else {
    res.redirect("/login")
  }
});


app.post("/submit", (req, res) => {
  User.findById(req.user.id, (err, user) => {
    if (err){
      console.log(err, "User not found")
    } else {
      user.secret = req.body.secret;
      user.save( () => {
        res.redirect("/secrets")
      });
    }
  })
})
