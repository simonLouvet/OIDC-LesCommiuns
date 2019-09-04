const express = require('express');
const cors = require('cors');
const app = express();
const http = require('http');
const safeRouter = express.Router();
const unsafeRouter = express.Router();
const bodyParser = require('body-parser');
const request = require('request');
const env = process.env;
const fs = require('fs');
let url = env.CONFIG_URL;
const passport = require('passport');
const session = require('express-session');
// const mongo_client = require('./mongo_client');
// const mongoose = require('mongoose');

url = "https://simonlouvet.github.io/config-private/OIDC-lesCommuns-boiler/basic.json"

app.use(cors())
app.use(bodyParser.json({
  limit: '10mb'
}))
app.use(bodyParser.urlencoded({
  limit: '10mb',
  extended: true
}))

request(url, {
  json: true
}, (err, result, body) => {
  if (err == undefined) {
    const configJson = result.body
    const content = 'module.exports = ' + JSON.stringify(result.body)
    fs.writeFile('./configuration.js', content, 'utf8', function(err) {
      //const productService = require('./api/product.js');
      if (err) {
        throw err
      } else {
        app.use((req, res, next) => {
          // console.log(req.url);
          next();
        });
        let config = require("../../../configuration.js")
        console.log(config);
        //app.use('/data/auth', unSafeRouteur);
        //app.use('/data/core', safe);
        // productService(safe)
        app.use(session({
          secret: config.express.session_secret,
          maxAge: null
        })); //session secret
        app.use('/login/', unsafeRouter),
          app.use('/secured/', safeRouter)
        app.use(passport.initialize());
        app.use(passport.session());
        let addOidcLesCommunsPassportToApp = require('../login/passport-oidc.js');
        addOidcLesCommunsPassportToApp(unsafeRouter);



        app.get('/', function(req, res, next) {
          res.redirect('/ui/login.html')
        })
        app.get('/ui', function(req, res, next) {
          res.redirect('/ui/login.html')
        })
        app.use('/ui/', express.static(__dirname + '/../../ui', {
          etag: false
        }))

        app.use((_err, req, res, next) => {
          if (_err) {
            console.log(_err)
            console.log(res.statusCode);
            console.log(req.url);
          }
          res.send(_err.message);
          // next(req, res);
        })

        const port = process.env.APP_PORT || 8080
        app.listen(port, function(err) {
          console.log('serveur started at port', port);

        })
      }
    })
  } else {
    throw err;
  }

})
