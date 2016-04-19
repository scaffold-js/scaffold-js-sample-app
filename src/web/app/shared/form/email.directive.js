(function emailDirective () {
	'use strict';

	angular.module ('scaffold-js-sample-app').directive ('scaffoldJsSampleAppEmail', function directive ($q, accountFactory) {
		return {
			restrict: 'A',
			require: 'ngModel',
			link: function link (scope, elm, attrs, ctrl) {
				ctrl.$asyncValidators.taken = function taken (modelValue) {
					if (ctrl.$isEmpty (modelValue)) {
						return $q.when ();
					}

					return accountFactory.available (false, modelValue);
				};
			}
		};
	}).directive ('scaffoldJsSampleAppEmailChange', function directive ($q, accountFactory) {
		return {
			restrict: 'A',
			require: 'ngModel',
			link: function link (scope, elm, attrs, ctrl) {
				ctrl.$asyncValidators.taken = function taken (modelValue) {
					var check = scope.$eval (attrs.scaffoldJsSampleAppEmailChange) || accountFactory.email;

					if (modelValue === check || ctrl.$isEmpty (modelValue)) {
						return $q.when ();
					}

					return accountFactory.available (false, modelValue);
				};
			}
		};
	});
} ());
