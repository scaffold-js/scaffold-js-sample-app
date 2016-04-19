(function topNavComponent () {
	'use strict';

	angular.module ('scaffold-js-sample-app').component ('topnav', {
		templateUrl: 'app/components/topnav/topnav.view.html',
		controller: function controller ($scope, authFactory, $translate) {
			angular.extend ($scope, {
				languages: {
					en: 'English',
					es: 'Español'

					// scaffold-js-insertsion-point app-languages
				},

				$translate: $translate,

				logout: function logout () {
					authFactory.reset ();
				}
			});
		}
	});
} ());
