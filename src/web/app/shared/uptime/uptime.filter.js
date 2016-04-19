(function uptimeFilter () {
	'use strict';

	angular.module ('scaffold-js-sample-app').filter ('uptime', function filter () {
		return function uptimeDuration (seconds, base) {
			return moment.duration (seconds, base).humanize ();
		};
	});
} ());
