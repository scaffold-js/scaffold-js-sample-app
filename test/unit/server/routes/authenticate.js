'use strict';

const chai = require ('chai'),
	expect = chai.expect,
	dirtyChai = require ('dirty-chai'),
	chaiAsPromised = require ('chai-as-promised'),
	sinon = require ('sinon'),
	hapi = require ('hapi'),
	mocks = require ('../../helpers/mocks'),
	mockery = require ('mockery'),
	creds = require ('../../helpers/creds'),
	failed = require ('../../helpers/authFailed');

chai.use (chaiAsPromised);
chai.use (dirtyChai);

describe ('authentication route', () => {
	var server,
		users = {
			findOne: () => Promise.resolve (true),
			updateOne: () => Promise.resolve (true),
			insertOne: () => 'test'
		},
		jwt = {
			sign () {
			},
			verify (token, key, options, callback) {
				callback (false, {
					_id: 'id'
				});
			}
		},
		sandbox = sinon.sandbox.create ();

	before (() => {
		mocks.mongo ({ users });
		mockery.registerMock ('jsonwebtoken', jwt);
	});

	beforeEach (() => {
		server = new hapi.Server ();
		server.connection ();
		return expect (server.register ([ require ('hapi-mongodb'), require ('vision'), require ('hapi-accept-language'), failed ]).then (() => {
			server.method ('audit', () => {});
			server.auth.strategy ('jwt', 'failed');
			server.auth.strategy ('github', 'failed');
			server.auth.strategy ('twitter', 'failed');
			server.auth.strategy ('facebook', 'failed');
			server.auth.strategy ('google', 'failed');
			server.auth.strategy ('linkedin', 'failed');
			server.route (require ('../../../../src/server/routes/authenticate'));
		})).to.be.fulfilled ();
	});

	afterEach (() => {
		sandbox.restore ();
	});

	after (() => {
		mocks.disable ();
	});

	describe ('internal', () => {
		it ('should authenticate valid user', done => {
			server.inject ({ method: 'POST', url: '/authenticate', payload: { username: 'admin', password: 'admin' }, credentials: creds.user }).then (response => {
				try {
					expect (response.statusCode).to.equal (200);
					done ();
				} catch (err) {
					done (err);
				}
			});
		});

		it ('should authenticate valid user with remember', done => {
			server.inject ({ method: 'POST', url: '/authenticate', payload: { username: 'admin', password: 'admin', rememberMe: true }, credentials: creds.user }).then (response => {
				try {
					expect (response.statusCode).to.equal (200);
					done ();
				} catch (err) {
					done (err);
				}
			});
		});

		describe ('forgot replace', () => {
			it ('should update password', done => {
				server.inject ({ method: 'POST', url: '/authenticate/forgot', payload: { token: 'token', password: 'ABcd02$$' } }).then (response => {
					try {
						expect (response.statusCode).to.equal (200);
						done ();
					} catch (err) {
						done (err);
					}
				});
			});

			it ('should handle invalid token', done => {
				sandbox.stub (jwt, 'verify', (token, key, options, callback) => {
					callback (true);
				});

				server.inject ({ method: 'POST', url: '/authenticate/forgot', payload: { token: 'token', password: 'ABcd02$$' } }).then (response => {
					try {
						expect (response.statusCode).to.equal (401);
						done ();
					} catch (err) {
						done (err);
					}
				});
			});

			it ('should handle update failure', done => {
				sandbox.stub (users, 'updateOne', () => Promise.reject ());

				server.inject ({ method: 'POST', url: '/authenticate/forgot', payload: { token: 'token', password: 'ABcd02$$' } }).then (response => {
					try {
						expect (response.statusCode).to.equal (401);
						done ();
					} catch (err) {
						done (err);
					}
				});
			});
		});

		describe ('forgot email', () => {
			it ('should send forgot password email', done => {
				server.plugins ['hapi-mailer'] = {
					send: (options, callback) => {
						callback ();
					}
				};

				server.inject ({ method: 'POST', url: '/authenticate/forgot', payload: { email: 'user@localhost' }, headers: { 'Accept-Language': 'en' } }).then (response => {
					try {
						expect (response.statusCode).to.equal (200);
						done ();
					} catch (err) {
						done (err);
					}
				});
			});

			it ('should ignore forgot password if email fails', done => {
				server.plugins ['hapi-mailer'] = {
					send: (options, callback) => {
						callback ('err');
					}
				};

				server.inject ({ method: 'POST', url: '/authenticate/forgot', payload: { email: 'user@localhost' }, headers: { 'Accept-Language': 'es' } }).then (response => {
					try {
						expect (response.statusCode).to.equal (200);
						done ();
					} catch (err) {
						done (err);
					}
				});
			});

			it ('should ignore forgot password if no user', done => {
				sandbox.stub (users, 'findOne', () => Promise.resolve (null));

				server.inject ({ method: 'POST', url: '/authenticate/forgot', payload: { email: 'user@localhost' } }).then (response => {
					try {
						expect (response.statusCode).to.equal (200);
						done ();
					} catch (err) {
						done (err);
					}
				});
			});

			it ('should ignore forgot password on db error', done => {
				sandbox.stub (users, 'findOne', () => Promise.reject ('err'));

				server.inject ({ method: 'POST', url: '/authenticate/forgot', payload: { email: 'user@localhost' } }).then (response => {
					try {
						expect (response.statusCode).to.equal (200);
						done ();
					} catch (err) {
						done (err);
					}
				});
			});
		});

		it ('should refresh token', done => {
			server.inject ({ method: 'GET', url: '/authenticate', credentials: { _id: '1' } }).then (response => {
				try {
					expect (response.statusCode).to.equal (200);
					done ();
				} catch (err) {
					done (err);
				}
			});
		});

		it ('should refresh token with remember', done => {
			server.inject ({ method: 'GET', url: '/authenticate', credentials: { _id: '1', remember: true } }).then (response => {
				try {
					expect (response.statusCode).to.equal (200);
					done ();
				} catch (err) {
					done (err);
				}
			});
		});

		it ('should fail to authenticate invalid user', done => {
			sandbox.stub (users, 'findOne', () => Promise.resolve (null));

			server.inject ({ method: 'POST', url: '/authenticate', payload: { username: 'fake', password: 'fake' }, credentials: creds.user }).then (response => {
				try {
					expect (response.statusCode).to.equal (401);
					done ();
				} catch (err) {
					done (err);
				}
			});
		});

		it ('should fail to authenticate on db error', done => {
			sandbox.stub (users, 'findOne', () => Promise.reject ('err'));

			server.inject ({ method: 'POST', url: '/authenticate', payload: { username: 'fake', password: 'fake' }, credentials: creds.user }).then (response => {
				try {
					expect (response.statusCode).to.equal (401);
					done ();
				} catch (err) {
					done (err);
				}
			});
		});
	});

	describe ('social', () => {
		describe ('github', () => {
			it ('should authenticate github user', done => {
				sandbox.stub (users, 'findOne', () => Promise.resolve (null));

				server.views ({
					engines: {
						html: require ('handlebars')
					},
					relativeTo: __dirname,
					path: '../../../../src/server/views'
				});

				server.inject ({ method: 'GET', url: '/authenticate/github', credentials: creds.user }).then (response => {
					try {
						expect (response.statusCode).to.equal (200);
						done ();
					} catch (e) {
						done (e);
					}
				}).catch (e => {
					done (e);
				});
			});

			it ('should reauthenticate github user', done => {
				server.views ({
					engines: {
						html: require ('handlebars')
					},
					relativeTo: __dirname,
					path: '../../../../src/server/views'
				});
				server.inject ({ method: 'GET', url: '/authenticate/github', credentials: creds.user }).then (response => {
					try {
						expect (response.statusCode).to.equal (200);
						done ();
					} catch (e) {
						done (e);
					}
				}).catch (e => {
					done (e);
				});
			});

			it ('should fail to authenticate github user', done => {
				server.inject ({ method: 'GET', url: '/authenticate/github' }).then (response => {
					try {
						expect (response.statusCode).to.equal (401);
						done ();
					} catch (e) {
						done (e);
					}
				}).catch (e => {
					done (e);
				});
			});

			it ('should handle view failure', done => {
				server.inject ({ method: 'GET', url: '/authenticate/github', credentials: creds.user }).then (response => {
					try {
						expect (response.statusCode).to.equal (401);
						done ();
					} catch (e) {
						done (e);
					}
				}).catch (e => {
					done (e);
				});
			});
		});

		describe ('twitter', () => {
			it ('should authenticate twitter user', done => {
				sandbox.stub (users, 'findOne', () => Promise.resolve (null));

				server.views ({
					engines: {
						html: require ('handlebars')
					},
					relativeTo: __dirname,
					path: '../../../../src/server/views'
				});

				server.inject ({ method: 'GET', url: '/authenticate/twitter', credentials: creds.user }).then (response => {
					try {
						expect (response.statusCode).to.equal (200);
						done ();
					} catch (e) {
						done (e);
					}
				}).catch (e => {
					done (e);
				});
			});

			it ('should reauthenticate twitter user', done => {
				server.views ({
					engines: {
						html: require ('handlebars')
					},
					relativeTo: __dirname,
					path: '../../../../src/server/views'
				});
				server.inject ({ method: 'GET', url: '/authenticate/twitter', credentials: creds.user }).then (response => {
					try {
						expect (response.statusCode).to.equal (200);
						done ();
					} catch (e) {
						done (e);
					}
				}).catch (e => {
					done (e);
				});
			});

			it ('should fail to authenticate twitter user', done => {
				server.inject ({ method: 'GET', url: '/authenticate/twitter' }).then (response => {
					try {
						expect (response.statusCode).to.equal (401);
						done ();
					} catch (e) {
						done (e);
					}
				}).catch (e => {
					done (e);
				});
			});

			it ('should handle view failure', done => {
				server.inject ({ method: 'GET', url: '/authenticate/twitter', credentials: creds.user }).then (response => {
					try {
						expect (response.statusCode).to.equal (401);
						done ();
					} catch (e) {
						done (e);
					}
				}).catch (e => {
					done (e);
				});
			});
		});

		describe ('facebook', () => {
			it ('should authenticate facebook user', done => {
				sandbox.stub (users, 'findOne', () => Promise.resolve (null));

				server.views ({
					engines: {
						html: require ('handlebars')
					},
					relativeTo: __dirname,
					path: '../../../../src/server/views'
				});

				server.inject ({ method: 'GET', url: '/authenticate/facebook', credentials: creds.user }).then (response => {
					try {
						expect (response.statusCode).to.equal (200);
						done ();
					} catch (e) {
						done (e);
					}
				}).catch (e => {
					done (e);
				});
			});

			it ('should reauthenticate facebook user', done => {
				server.views ({
					engines: {
						html: require ('handlebars')
					},
					relativeTo: __dirname,
					path: '../../../../src/server/views'
				});
				server.inject ({ method: 'GET', url: '/authenticate/facebook', credentials: creds.user }).then (response => {
					try {
						expect (response.statusCode).to.equal (200);
						done ();
					} catch (e) {
						done (e);
					}
				}).catch (e => {
					done (e);
				});
			});

			it ('should fail to authenticate facebook user', done => {
				server.inject ({ method: 'GET', url: '/authenticate/facebook' }).then (response => {
					try {
						expect (response.statusCode).to.equal (401);
						done ();
					} catch (e) {
						done (e);
					}
				}).catch (e => {
					done (e);
				});
			});

			it ('should handle view failure', done => {
				server.inject ({ method: 'GET', url: '/authenticate/facebook', credentials: creds.user }).then (response => {
					try {
						expect (response.statusCode).to.equal (401);
						done ();
					} catch (e) {
						done (e);
					}
				}).catch (e => {
					done (e);
				});
			});
		});

		describe ('google', () => {
			it ('should authenticate google user', done => {
				sandbox.stub (users, 'findOne', () => Promise.resolve (null));

				server.views ({
					engines: {
						html: require ('handlebars')
					},
					relativeTo: __dirname,
					path: '../../../../src/server/views'
				});

				server.inject ({ method: 'GET', url: '/authenticate/google', credentials: creds.user }).then (response => {
					try {
						expect (response.statusCode).to.equal (200);
						done ();
					} catch (e) {
						done (e);
					}
				}).catch (e => {
					done (e);
				});
			});

			it ('should reauthenticate google user', done => {
				server.views ({
					engines: {
						html: require ('handlebars')
					},
					relativeTo: __dirname,
					path: '../../../../src/server/views'
				});
				server.inject ({ method: 'GET', url: '/authenticate/google', credentials: creds.user }).then (response => {
					try {
						expect (response.statusCode).to.equal (200);
						done ();
					} catch (e) {
						done (e);
					}
				}).catch (e => {
					done (e);
				});
			});

			it ('should fail to authenticate google user', done => {
				server.inject ({ method: 'GET', url: '/authenticate/google' }).then (response => {
					try {
						expect (response.statusCode).to.equal (401);
						done ();
					} catch (e) {
						done (e);
					}
				}).catch (e => {
					done (e);
				});
			});

			it ('should handle view failure', done => {
				server.inject ({ method: 'GET', url: '/authenticate/google', credentials: creds.user }).then (response => {
					try {
						expect (response.statusCode).to.equal (401);
						done ();
					} catch (e) {
						done (e);
					}
				}).catch (e => {
					done (e);
				});
			});
		});

		describe ('linkedin', () => {
			it ('should authenticate linkedin user', done => {
				sandbox.stub (users, 'findOne', () => Promise.resolve (null));

				server.views ({
					engines: {
						html: require ('handlebars')
					},
					relativeTo: __dirname,
					path: '../../../../src/server/views'
				});

				server.inject ({ method: 'GET', url: '/authenticate/linkedin', credentials: creds.user }).then (response => {
					try {
						expect (response.statusCode).to.equal (200);
						done ();
					} catch (e) {
						done (e);
					}
				}).catch (e => {
					done (e);
				});
			});

			it ('should reauthenticate linkedin user', done => {
				server.views ({
					engines: {
						html: require ('handlebars')
					},
					relativeTo: __dirname,
					path: '../../../../src/server/views'
				});
				server.inject ({ method: 'GET', url: '/authenticate/linkedin', credentials: creds.user }).then (response => {
					try {
						expect (response.statusCode).to.equal (200);
						done ();
					} catch (e) {
						done (e);
					}
				}).catch (e => {
					done (e);
				});
			});

			it ('should fail to authenticate linkedin user', done => {
				server.inject ({ method: 'GET', url: '/authenticate/linkedin' }).then (response => {
					try {
						expect (response.statusCode).to.equal (401);
						done ();
					} catch (e) {
						done (e);
					}
				}).catch (e => {
					done (e);
				});
			});

			it ('should handle view failure', done => {
				server.inject ({ method: 'GET', url: '/authenticate/linkedin', credentials: creds.user }).then (response => {
					try {
						expect (response.statusCode).to.equal (401);
						done ();
					} catch (e) {
						done (e);
					}
				}).catch (e => {
					done (e);
				});
			});
		});
	});
});
