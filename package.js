Package.describe({
  name: 'jam:easy-schema',
  version: '1.2.0-alpha300.19',
  summary: 'An easy way to add schema validation for Meteor apps',
  git: 'https://github.com/jamauro/easy-schema',
  documentation: 'README.md'
});

Npm.depends({
  'flat': '5.0.2'
});

Package.onUse(function(api) {
  api.versionsFrom(['2.8.1', '3.0-alpha.19']);
  api.use('mongo');
  api.use('check');
  api.use('ecmascript');
  api.use('mdg:validation-error@0.5.1');
  api.mainModule('easy-schema-client.js', 'client');
  api.mainModule('easy-schema-server.js', 'server');
});

Package.onTest(function(api) {
  api.use('ecmascript');
  api.use('tinytest');
  api.use('jam:easy-schema');
  api.use('mongo');
  api.use('mongo-decimal');
  api.mainModule('easy-schema-tests.js');
});
