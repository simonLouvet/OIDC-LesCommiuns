const Issuer = require('openid-client').Issuer;
const Strategy = require('openid-client').Strategy;
const passport = require('passport');
const base64url = require('base64url');
let clientGlobal = undefined;
const jwt = require('jsonwebtoken');
const fs = require('fs');
const jose = require('node-jose');

let addOidcLesCommunsPassportToApp = async function(router) {
  let config=require("../../../configuration.js")
  // console.log(config);

  let lesCommunsIssuer = await Issuer.discover(config.OIDC.lesCommuns.issuer);
  // console.log('Les Communs Discovered issuer %s', JSON.stringify(lesCommunsIssuer));
  const client = new lesCommunsIssuer.Client({
    client_id: config.OIDC.lesCommuns.client_id, // Data Food Consoritum in Hex
    client_secret: config.OIDC.lesCommuns.client_secret,
    redirect_uri: 'http://localhost:8080/login/auth/cb'
  }); // => Client
  clientGlobal = client;
  const params = {
    // ... any authorization params
    // client_id defaults to client.client_id
    // redirect_uri defaults to client.redirect_uris[0]
    // response type defaults to client.response_types[0], then 'code'
    // scope defaults to 'openid'
  }


  passport.use('oidc', new Strategy({
    client,
    params
  }, (tokenset, userinfo, done) => {
    console.log('OIDC CallBack success');
    // console.log('tokenset', tokenset);
    // console.log('userinfo', userinfo);
    // console.log('claims', tokenset.claims());
    userinfo.accesstoken = tokenset.access_token;


    // User.findOne({
    //   id: tokenset.claims().sub
    // }, function(err, user) {
    //   if (err) return done(err);
    //   return done(null, user);
    // });
    done(null, userinfo);
  }));


  // start authentication request
  // options [optional], extra authentication parameters
  router.get('/auth', async function(req, res, next) {
    // console.log('auth referer',req.headers.referer);
    req.session.referer=req.headers.referer;
    next()
  });
  router.get('/auth', passport.authenticate('oidc', {
    session: false
  }));


  // authentication callback
  // app.get('/auth/cb', passport.authenticate('oidc', {
  //   successRedirect: '/ui/login.html',
  //   failureRedirect: '/ui/login.html',
  //   session: false
  // }));

  router.get('/auth/user', async function(req, res, next) {
    // console.log('req.user', req.headers.authorization);
    var token = req.headers.authorization.split(' ')[1];
    // console.log('token',token,req.headers.authorization);
    if (token==null || token==undefined || token=='null') {
      res.status(401)
      next(new Error('Missing Bearer Token'));
    }else{
      var components = token.split('.');
      // console.log(components);
      var header = JSON.parse(base64url.decode(components[0]));
      var payload = JSON.parse(base64url.decode(components[1]));
      var signature = components[2];
      var decodedSignature = base64url.decode(components[2])
      // console.log('header', header);
      // console.log('payload', payload);
      // console.log('resource_access', payload.resource_access);
      // console.log('signature', signature);
      // console.log('decoded signature', decodedSignature);

      try {


        // let publicKey = fs.readFileSync('/home/simon/GIT/OIDC-LesCommuns/src/server/login/key.pem');

        let publicKey="-----BEGIN PUBLIC KEY-----"+config.OIDC.lesCommuns.public_key+"A"+"-----END PUBLIC KEY-----"
        // console.log('publicKey', publicKey);
        const key = await jose.JWK.asKey(publicKey, 'pem');
        const verifier = jose.JWS.createVerify(key);
        const verified = await verifier
          .verify(token)

        // console.log('verified',verified);
        res.json(payload);

        // console.log('decoded', decoded);
      } catch (err) {
        //console.log('decoded err', err);
        res.status(401)
        // err
        next(new Error('Invalid Tocken'));
      }
    }

    // console.log('token',token);



    // clientGlobal.userinfo(token).then(oidcResponse => {
    //   console.log('oidcResponse', oidcResponse);
    //   res.json(oidcResponse);
    // }).catch(e => {
    //   // res.redirect('/ui/login.html');
    //   res.status(401).end();
    // });


  });


  // router.get('/auth/user', passport.authenticate('oidc', {
  //   session: false
  // }), (req, res) => {
  //   console.log('res.req.user',res.req.user);
  //   // res.redirect('/ui/login.html?token=' + res.req.user.accesstoken);
  // });

  router.get('/auth/cb', passport.authenticate('oidc', {
    failureRedirect: '/ui/login.html',
    session: false
  }), (req, res) => {
    // console.log('callback referer',req.headers.referer)
    // console.log('/auth/cb',res,req);
    // console.log('req.session.referer',req.session.referer);
    res.redirect(req.session.referer+'?token=' + res.req.user.accesstoken);
  });
}
module.exports = addOidcLesCommunsPassportToApp;
