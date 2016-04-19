(function matchDirective () {
	'use strict';

	angular.module ('scaffold-js-sample-app').directive ('scaffoldJsSampleAppMatch', function directive () {
		return {
			restrict: 'A',
			require: 'ngModel',
			scope: true,
			link: function link (scope, elm, attrs, ctrl) {
				scope.$watch (function watchVar () {
					var one = scope.$eval (attrs.scaffoldJsSampleAppMatch),
						two = scope.$eval (attrs.ngModel);

					return one && two ? one === two : true;
				}, function watchHandler (valid) {
					ctrl.$setValidity ('match', valid);
				});
			}
		};
	});
} ());
