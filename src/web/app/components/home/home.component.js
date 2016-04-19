(function homeComponent () {
	'use strict';

	angular.module ('scaffold-js-sample-app').component ('home', {
		templateUrl: 'app/components/home/home.view.html'
	}).config (function setupState ($stateProvider) {
		$stateProvider.state ('home', {
			url: '/',
			template: '<home></home>'
		});
	});
} ());
