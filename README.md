svyJenkinsConfig
========
'svyJenkinsConfig' is a module of the Servoy Business Application Platform. It provides a build.xml file which can be used in the Jenkins build process of Servoy test solutions.
The build.xml is configured for code instrumentation with istanbul code coverage.

Documentation
-------------
You may want to checkout the [develop](https://github.com/Servoy/svyJenkinsConfig/tree/develop) branch instead of the master branch.

See the [Wiki](https://wiki.servoy.com/display/DOCS/Using+Istanbul+to+integrate+code+coverage+report+in+Jenkins) for the available documentation

Note: some configurations property described in the wiki (as including/excluding modules) are supported only in the [develop](https://github.com/Servoy/svyJenkinsConfig/tree/develop) branch. Also the master branch won't include in the code coverage report the .js file which have never been loaded during the tests.

The master branch is not configured to use Plato. Checkout the [develop](https://github.com/Servoy/svyJenkinsConfig/tree/develop) branch to use Plato for code analysis.

Feature Requests & Bugs
-----------------------
Found a bug or would like to see a new feature implemented? Raise an issue in the [Issue Tracker](https://github.com/Servoy/svyJenkinsConfig/issues)


Contributing
-------------
Eager to fix a bug or introduce a new feature? Clone the repository and issue a pull request


License
-------
svyUtils is licensed under LGPL
