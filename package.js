Package.describe({
  name: 'jam:easy-schema',
  version: '1.7.0',
  summary: 'An easy way to add schema validation for Meteor apps',
  git: 'https://github.com/jamauro/easy-schema',
  documentation: 'README.md'
});

Npm.depends({
  'flat': '5.0.2'
});

Package.onUse(function(api) {
  api.versionsFrom(['2.8.1', '3.0']);
  api.use('mongo');
  api.use('check');
  api.use('ecmascript');
  api.use('mongo-id');
  api.use('ddp-client');
  api.use('mdg:validation-error@0.5.1');
  api.use('zodern:types@1.0.13');
  api.mainModule('client.js', 'client');
  api.mainModule('server.js', 'server');
});

Package.onTest(function(api) {
  api.use('ecmascript');
  api.use('tinytest');
  api.use('mongo');
  api.use('mongo-decimal');
  api.use('ddp-client');
  api.use('accounts-base');
  api.use('jam:easy-schema');
  api.mainModule('tests.js');
});
