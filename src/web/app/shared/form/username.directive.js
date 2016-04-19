(function usernameDirective () {
	'use strict';

	angular.module ('scaffold-js-sample-app').directive ('scaffoldJsSampleAppUsername', function directive ($q, accountFactory) {
		return {
			restrict: 'A',
			require: 'ngModel',
			link: function link (scope, elm, attrs, ctrl) {
				ctrl.$asyncValidators.taken = function taken (modelValue) {
					if (ctrl.$isEmpty (modelValue)) {
						return $q.when ();
					}

					return accountFactory.available (modelValue);
				};
			}
		};
	});
} ());
