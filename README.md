svyJenkinsConfig
========
'svyJenkinsConfig' is a module of the Servoy Business Application Platform. It provides a build.xml file which can be used in the Jenkins build process of Servoy test solutions.

The build.xml is configured for code instrumentation with Istanbul code coverage and Plato code analysis.


Documentation
-------------
See the [Wiki](https://wiki.servoy.com/display/DOCS/Using+Istanbul+to+integrate+code+coverage+report+in+Jenkins) for the available documentation

To enable code coverage with Istanbul the test solutions must save the coverage result into the coverage.json file during the onSolutionClose of the test solution.
The onSolutionClose of the test solution must save in the svyJenkinsConfig/CBI_config/report_coverage/coverage.json file the content of the __coverage.json__.
To include in the code covarage report the .js file which were not loaded during testing call scopes.istanbul_scope.initIstanbul() at the onOpenSolution of the test solution.
See sample code in the [svyUtils feature/jenkins](https://github.com/Servoy/svyUtils/blob/feature/jenkins/svyUtils_test/svyUtils_test.js)

Feature Requests & Bugs
-----------------------
Found a bug or would like to see a new feature implemented? Raise an issue in the [Issue Tracker](https://github.com/Servoy/svyJenkinsConfig/issues)


Contributing
-------------
Eager to fix a bug or introduce a new feature? Clone the repository and issue a pull request


License
-------
svyUtils is licensed under LGPL
