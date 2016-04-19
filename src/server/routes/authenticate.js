'use strict';

const crypto = require ('crypto'),
	jwt = require ('jsonwebtoken'),
	config = require ('config'),
	boom = require ('boom'),
	accountModel = require ('../models/account');

module.exports = [{
	method: 'POST',
	path: '/authenticate',
	config: {
		auth: false,
		description: 'Authenticate a User',
		notes: `Authenticates a user by username or email and password. The usernamefield can be either the regsitered username or the user\'s email address.
Returns a json web token in the Authorization header on success.
The token must be used as a bearer token in the Authorization header on any authenticated requests.`,
		tags: [ 'api', 'authenticate' ],
		validate: {
			payload: accountModel.authenticate
		},
		plugins: {
			'hapi-swaggered': {
				responses: {
					200: { description: 'Success' },
					400: { description: 'Bad Request' },
					401: { description: 'Unauthorized' }
				}
			}
		},
		handler (request, reply) {
			const users = request.server.plugins ['hapi-mongodb'].db.collection ('users');

			users.findOne ({
				$or: [{ username: request.payload.username }, { email: request.payload.username }],
				password: crypto.createHash ('sha256').update (request.payload.password).digest ('hex'),
				active: true
			}).then (user => {
				if (user) {
					request.server.methods.audit ('auth', { id: user._id, username: user.username }, 'success', 'authenticate', {});
					reply ().code (200).header ('Authorization', jwt.sign ({
						iss: 'scaffold-js-sample-app',
						exp: parseInt (new Date ().getTime () / 1000, 10) + config.get (request.payload.rememberMe ? 'web.tokenRememberExpire' : 'web.tokenExpire'),
						iat: parseInt (new Date ().getTime () / 1000, 10),
						sub: 'auth',
						host: request.info.host,
						user: user._id,
						remember: request.payload.rememberMe,
						scope: user.scope
					}, config.get ('web.jwtKey')));
				} else {
					Reflect.deleteProperty (request.payload, 'password');
					request.server.methods.audit ('auth', { id: '', username: '' }, 'failure', 'authenticate', request.payload);
					reply (boom.unauthorized ());
				}
			}).catch (() => {
				Reflect.deleteProperty (request.payload, 'password');
				request.server.methods.audit ('auth', { id: '', username: '' }, 'failure', 'authenticate', request.payload);
				reply (boom.unauthorized ());
			});
		}
	}
}, {
	method: 'POST',
	path: '/authenticate/forgot',
	config: {
		auth: false,
		description: 'Update forgotton password',
		notes: 'Givan an email addres, sends a forgot password email if the email address is found.  Given a token and a password, updates the users password.',
		tags: [ 'api', 'authenticate' ],
		validate: {
			payload: accountModel.forgot
		},
		plugins: {
			'hapi-swaggered': {
				responses: {
					200: { description: 'Success' },
					401: { description: 'Unauthorized' }
				}
			}
		},
		handler (request, reply) {
			const mongo = request.server.plugins ['hapi-mongodb'],
				users = mongo.db.collection ('users');

			if (request.payload.token && request.payload.password) {
				jwt.verify (request.payload.token, config.get ('web.jwtKey'), {
					issuer: 'scaffold-js-sample-app',
					subject: 'forgot'
				}, (err, decoded) => {
					if (err) {
						reply (boom.unauthorized ());
					} else {
						users.updateOne ({
							_id: new mongo.ObjectID (decoded.user),
							active: true
						}, {
							$set: { password: crypto.createHash ('sha256').update (request.payload.password).digest ('hex') }
						}).then (() => {
							reply (200);
						}).catch (() => {
							reply (boom.unauthorized ());
						});
					}
				});
			} else {
				users.findOne ({
					email: request.payload.email,
					active: true
				}).then (user => {
					if (user) {
						const token = jwt.sign ({
							iss: 'scaffold-js-sample-app',
							exp: parseInt (new Date ().getTime () / 1000, 10) + config.get ('web.tokenForgotExpire'),
							iat: parseInt (new Date ().getTime () / 1000, 10),
							sub: 'forgot',
							user: user._id
						}, config.get ('web.jwtKey'));

						request.server.plugins ['hapi-mailer'].send ({
							from: 'admin@scaffold-js.org',
							to: `${ user.fullname } <${ user.email }>`,
							subject: require (`../locale/${ request.pre.language [0].code }.json`).subject.forgot,
							html: {
								path: `forgot-${ request.pre.language [0].code }.html`
							},
							context: {
								nickname: user.nickname,
								uri: request.server.info.uri,
								token
							}
						}, err => {
							if (err) {
								request.server.methods.audit ('auth', { id: '', username: '' }, 'failure', 'forgot', request.payload);
							} else {
								request.server.methods.audit ('auth', { id: user._id, username: user.username }, 'success', 'forgot', {});
							}
							reply ().code (200);
						});
					} else {
						request.server.methods.audit ('auth', { id: '', username: '' }, 'failure', 'forgot', request.payload);
						reply ().code (200);
					}
				}).catch (() => {
					request.server.methods.audit ('auth', { id: '', username: '' }, 'failure', 'forgot', request.payload);
					reply ().code (200);
				});
			}
		}
	}
}, {
	method: 'GET',
	path: '/authenticate',
	config: {
		description: 'Refresh the Authentication Token',
		notes: 'Refresh an unexipred authentication token. Returns a new json web token wth a new expiration date in the Authorization header on success.',
		tags: [ 'api', 'authenticate' ],
		plugins: {
			'hapi-swaggered': {
				responses: {
					200: { description: 'Success' },
					400: { description: 'Bad Request' },
					401: { description: 'Unauthorized' }
				}
			}
		},
		handler (request, reply) {
			reply ().code (200).header ('Authorization', jwt.sign ({
				iss: 'scaffold-js-sample-app',
				exp: parseInt (new Date ().getTime () / 1000, 10) + config.get (request.auth.credentials.remember ? 'web.tokenRememberExpire' : 'web.tokenExpire'),
				iat: parseInt (new Date ().getTime () / 1000, 10),
				sub: 'auth',
				host: request.info.host,
				user: request.auth.credentials._id,
				remember: request.auth.credentials.remember,
				scope: request.auth.credentials.scope
			}, config.get ('web.jwtKey')));
		}
	}
}, {
	method: 'GET',
	path: '/authenticate/github',
	config: {
		auth: 'github',
		description: 'Authenticate a User via GitHub',
		notes: 'Authenticates a user using OAuth for GitHub.  Returns a json web token in the Authorization header on success.  The token must be used as a bearer token in the Authorization header on any authenticated requests.',
		tags: [ 'api', 'authenticate' ],
		handler (request, reply) {
			const users = request.server.plugins ['hapi-mongodb'].db.collection ('users');
			var insert;

			users.findOne ({
				username: request.auth.credentials.profile.username,
				provider: 'github',
				active: true
			}).then (user => {
				if (user) {
					insert = user;
				} else {
					insert = {
						username: request.auth.credentials.profile.username,
						provider: 'github',
						fullName: request.auth.credentials.profile.displayName,
						nickname: request.auth.credentials.profile.displayName.split (' ').shift (),
						email: request.auth.credentials.profile.email,
						active: true,
						created: new Date (),
						scope: [ 'ROLE_USER' ]
					};
					insert._id = users.insertOne (insert).insertedId;
				}

				request.server.methods.audit ('auth', { id: insert._id, username: insert.username }, 'success', 'authenticate', {});
				reply.view ('jwt', {
					token: jwt.sign ({
						iss: 'scaffold-js-sample-app',
						exp: parseInt (new Date ().getTime () / 1000, 10) + config.get ('web.tokenExpire'),
						iat: parseInt (new Date ().getTime () / 1000, 10),
						sub: 'auth',
						host: request.info.host,
						user: insert._id,
						scope: insert.scope
					}, config.get ('web.jwtKey'))
				});
			}).catch (() => {
				reply ().code (401);
			});
		}
	}
}, {
	method: 'GET',
	path: '/authenticate/twitter',
	config: {
		auth: 'twitter',
		description: 'Authenticate a User via Twitter',
		notes: 'Authenticates a user using OAuth for Twitter.  Returns a json web token in the Authorization header on success.  The token must be used as a bearer token in the Authorization header on any authenticated requests.',
		tags: [ 'api', 'authenticate' ],
		handler (request, reply) {
			const users = request.server.plugins ['hapi-mongodb'].db.collection ('users');
			var insert;

			users.findOne ({
				username: request.auth.credentials.profile.username,
				provider: 'twitter',
				active: true
			}).then (user => {
				if (user) {
					insert = user;
				} else {
					insert = {
						username: request.auth.credentials.profile.username,
						provider: 'twitter',
						fullName: request.auth.credentials.profile.displayName,
						nickname: request.auth.credentials.profile.displayName.split (' ').shift (),
						email: request.auth.credentials.profile.email,
						active: true,
						created: new Date (),
						scope: [ 'ROLE_USER' ]
					};
					insert._id = users.insertOne (insert).insertedId;
				}

				request.server.methods.audit ('auth', { id: insert._id, username: insert.username }, 'success', 'authenticate', {});
				reply.view ('jwt', {
					token: jwt.sign ({
						iss: 'scaffold-js-sample-app',
						exp: parseInt (new Date ().getTime () / 1000, 10) + config.get ('web.tokenExpire'),
						iat: parseInt (new Date ().getTime () / 1000, 10),
						sub: 'auth',
						host: request.info.host,
						user: insert._id,
						scope: insert.scope
					}, config.get ('web.jwtKey'))
				});
			}).catch (() => {
				reply ().code (401);
			});
		}
	}
}, {
	method: 'GET',
	path: '/authenticate/facebook',
	config: {
		auth: 'facebook',
		description: 'Authenticate a User via Facebook',
		notes: 'Authenticates a user using OAuth for Facebook.  Returns a json web token in the Authorization header on success.  The token must be used as a bearer token in the Authorization header on any authenticated requests.',
		tags: [ 'api', 'authenticate' ],
		handler (request, reply) {
			const users = request.server.plugins ['hapi-mongodb'].db.collection ('users');
			var insert;

			users.findOne ({
				username: request.auth.credentials.profile.username,
				provider: 'facebook',
				active: true
			}).then (user => {
				if (user) {
					insert = user;
				} else {
					insert = {
						username: request.auth.credentials.profile.id,
						provider: 'facebook',
						fullName: request.auth.credentials.profile.displayName,
						nickname: request.auth.credentials.profile.name.first,
						email: request.auth.credentials.profile.email,
						active: true,
						created: new Date (),
						scope: [ 'ROLE_USER' ]
					};
					insert._id = users.insertOne (insert).insertedId;
				}

				request.server.methods.audit ('auth', { id: insert._id, username: insert.username }, 'success', 'authenticate', {});
				reply.view ('jwt', {
					token: jwt.sign ({
						iss: 'scaffold-js-sample-app',
						exp: parseInt (new Date ().getTime () / 1000, 10) + config.get ('web.tokenExpire'),
						iat: parseInt (new Date ().getTime () / 1000, 10),
						sub: 'auth',
						host: request.info.host,
						user: insert._id,
						scope: insert.scope
					}, config.get ('web.jwtKey'))
				});
			}).catch (() => {
				reply ().code (401);
			});
		}
	}
}, {
	method: 'GET',
	path: '/authenticate/google',
	config: {
		auth: 'google',
		description: 'Authenticate a User via Google',
		notes: 'Authenticates a user using OAuth for Google.  Returns a json web token in the Authorization header on success.  The token must be used as a bearer token in the Authorization header on any authenticated requests.',
		tags: [ 'api', 'authenticate' ],
		handler (request, reply) {
			const users = request.server.plugins ['hapi-mongodb'].db.collection ('users');
			var insert;

			users.findOne ({
				username: request.auth.credentials.profile.username,
				provider: 'google',
				active: true
			}).then (user => {
				if (user) {
					insert = user;
				} else {
					insert = {
						username: request.auth.credentials.profile.id,
						provider: 'google',
						fullName: request.auth.credentials.profile.displayName,
						nickname: request.auth.credentials.profile.name.givenName,
						email: request.auth.credentials.profile.email,
						active: true,
						created: new Date (),
						scope: [ 'ROLE_USER' ]
					};
					insert._id = users.insertOne (insert).insertedId;
				}

				request.server.methods.audit ('auth', { id: insert._id, username: insert.username }, 'success', 'authenticate', {});
				reply.view ('jwt', {
					token: jwt.sign ({
						iss: 'scaffold-js-sample-app',
						exp: parseInt (new Date ().getTime () / 1000, 10) + config.get ('web.tokenExpire'),
						iat: parseInt (new Date ().getTime () / 1000, 10),
						sub: 'auth',
						host: request.info.host,
						user: insert._id,
						scope: insert.scope
					}, config.get ('web.jwtKey'))
				});
			}).catch (() => {
				reply ().code (401);
			});
		}
	}
}, {
	method: 'GET',
	path: '/authenticate/linkedin',
	config: {
		auth: 'linkedin',
		description: 'Authenticate a User via Linkedin',
		notes: 'Authenticates a user using OAuth for Linkedin.  Returns a json web token in the Authorization header on success.  The token must be used as a bearer token in the Authorization header on any authenticated requests.',
		tags: [ 'api', 'authenticate' ],
		handler (request, reply) {
			const users = request.server.plugins ['hapi-mongodb'].db.collection ('users');
			var insert;

			users.findOne ({
				username: request.auth.credentials.profile.username,
				provider: 'linkedin',
				active: true
			}).then (user => {
				if (user) {
					insert = user;
				} else {
					insert = {
						username: request.auth.credentials.profile.id,
						provider: 'linkedin',
						fullName: request.auth.credentials.profile.displayName,
						nickname: request.auth.credentials.profile.name.first,
						email: request.auth.credentials.profile.email,
						active: true,
						created: new Date (),
						scope: [ 'ROLE_USER' ]
					};
					insert._id = users.insertOne (insert).insertedId;
				}

				request.server.methods.audit ('auth', { id: insert._id, username: insert.username }, 'success', 'authenticate', {});
				reply.view ('jwt', {
					token: jwt.sign ({
						iss: 'scaffold-js-sample-app',
						exp: parseInt (new Date ().getTime () / 1000, 10) + config.get ('web.tokenExpire'),
						iat: parseInt (new Date ().getTime () / 1000, 10),
						sub: 'auth',
						host: request.info.host,
						user: insert._id,
						scope: insert.scope
					}, config.get ('web.jwtKey'))
				});
			}).catch (() => {
				reply ().code (401);
			});
		}
	}
}];
