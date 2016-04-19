(function authDirective () {
	'use strict';

	angular.module ('scaffold-js-sample-app').directive ('scaffoldJsSampleAppAuthenticated', function authenticated (authFactory) {
		return {
			restrict: 'A',
			link: function link (scope, element) {
				var setVisibility = function setVisibility () {
					if (authFactory.authenticated) {
						element.removeClass ('hidden');
					} else {
						element.addClass ('hidden');
					}
				};

				setVisibility ();
				scope.$watch (function watchAuthenticatedVar () {
					return authFactory.authenticated;
				}, function watchAuthenticatedHandler () {
					setVisibility ();
				});
			}
		};
	}).directive ('scaffoldJsSampleAppUnauthenticated', function unauthenticated (authFactory) {
		return {
			restrict: 'A',
			link: function link (scope, element) {
				var setVisibility = function setVisibility () {
					if (authFactory.authenticated) {
						element.addClass ('hidden');
					} else {
						element.removeClass ('hidden');
					}
				};

				setVisibility ();
				scope.$watch (function watchUnauthenticatedVar () {
					return authFactory.authenticated;
				}, function watchUnauthenticatedHandler () {
					setVisibility ();
				});
			}
		};
	}).directive ('scaffoldJsSampleAppHasAuthority', function hasAuthority (authFactory) {
		return {
			restrict: 'A',
			link: function link (scope, element, attrs) {
				var authority = attrs.scaffoldJsSampleAppHasAuthority,
					setVisibility = function setVisiblity () {
						if (authFactory.hasAuthority (authority)) {
							element.removeClass ('hidden');
						} else {
							element.addClass ('hidden');
						}
					};

				setVisibility ();
				scope.$watch (function watchHasAuthorityVar () {
					return authFactory.authenticated;
				}, function watchHasAuthorityHandler () {
					setVisibility ();
				});
			}
		};
	});
} ());
