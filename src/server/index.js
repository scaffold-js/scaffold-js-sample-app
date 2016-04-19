'use strict';

var server;
const glue = require ('glue'),
	config = require ('config'),
	jwt = require ('./jwt'),
	methods = require ('./methods');

module.exports = {
	start () {
		return new Promise ((resolve, reject) => {
			glue.compose (config.get ('manifest'), {
				relativeTo: __dirname,
				preRegister (_server_, next) {
					server = _server_;

					methods (server);

					server.register (require ('hapi-auth-jwt2'), () => {
						server.auth.strategy ('jwt', 'jwt', {
							key: config.get ('web.jwtKey'),
							validateFunc: jwt.validate,
							verifyOptions: {
								algorithms: [ 'HS256' ]
							}
						});

						server.auth.default ('jwt');

						next ();
					});

					server.register (require ('bell'), () => {
						server.auth.strategy ('github', 'bell', {
							provider: 'github',
							password: process.env.GITHUB_PASSWORD,
							clientId: process.env.GITHUB_CLIENT_ID,
							clientSecret: process.env.GITHUB_CLIENT_SECRET,
							isSecure: true
						});

						server.auth.strategy ('twitter', 'bell', {
							provider: 'twitter',
							password: process.env.TWITTER_PASSWORD,
							clientId: process.env.TWITTER_CLIENT_ID,
							clientSecret: process.env.TWITTER_CLIENT_SECRET,
							isSecure: true
						});

						server.auth.strategy ('facebook', 'bell', {
							provider: 'facebook',
							password: process.env.FACEBOOK_PASSWORD,
							clientId: process.env.FACEBOOK_CLIENT_ID,
							clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
							isSecure: true
						});

						server.auth.strategy ('google', 'bell', {
							provider: 'google',
							password: process.env.GOOGLE_PASSWORD,
							clientId: process.env.GOOGLE_CLIENT_ID,
							clientSecret: process.env.GOOGLE_CLIENT_SECRET,
							isSecure: true
						});

						server.auth.strategy ('linkedin', 'bell', {
							provider: 'linkedin',
							password: process.env.LINKEDIN_PASSWORD,
							clientId: process.env.LINKEDIN_CLIENT_ID,
							clientSecret: process.env.LINKEDIN_CLIENT_SECRET,
							isSecure: true
						});
					});
				}
			}).then (_server_ => {
				server = _server_;

				server.start ().then (() => {
					console.log (`Server started on port: ${ server.info.port }`);
					resolve (server);
				}).catch (err => {
					throw err;
				});
			}).catch (err => {
				console.error (err);
				reject (err, server);
			});
		});
	},

	stop () {
		return server.stop ();
	},

	instance () {
		return server;
	}
};
