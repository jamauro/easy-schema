## 1.5.1
* fix: improve attaching Mongo JSON Schema when a collection doesn't exist yet in the db

## 1.5.0
* feat: fluent syntax with `[has]` and dot notation for setting conditions, e.g. `.min`, `.default`, `.where` etc. This is an optional feature. You can still use the object-based syntax for setting conditions, e.g. `{ type: String, ...conditions }`, if you prefer.
* feat: set `default` values when defining a schema
* feat: set `base` schema when using `EasySchema.configure`
* feat: `ID` type for Meteor-generated `_id`s
* breaking: `allow` was renamed to `enums`
* breaking: `additionalProperties` was renamed to `extra`
* breaking: `EasySchema.skipAutoCheck()` was replaced by setting `{ autoCheck: false }` in the `options` of a `Collection.method`
* fix: `regex` for Mongo JSON Schema
* fix: under-the-hood optimizations

## 1.4.0
* feat: throw all validation errors to enable a better UX (requires Meteor `2.16+`)
* feat: support `Mongo.ObjectID`

## 1.3.3
* fix: `jam:method` integration when using `vite` bundler on the client instead of Meteor's default
* fix: validate correctly when using a preset `_id`

## 1.3.2
* fix: prevent double validation when using `upsertAsync`
* fix: allow using shorthand `_id` with `upsertAsync`

## 1.3.1
* fix: bump `versionsFrom` to official Meteor 3.0 release

## 1.3.1-rc.4
* fix: bump Meteor 3.0 to latest release candidate version
* docs: update README to clarify `Optional`

## 1.3.1-alpha300.19
* fix: optimizations to `jam:method` integration

## 1.3.0-alpha300.19
* feat: better typescript and code completion support via declaration file (.d.ts)
* fix: optimizations to `jam:method` integration

## 1.2.1-alpha300.19
* fix: offer support for `jam:method` integration

## 1.2.0-alpha300.19
* feat: custom errors and improved error messages

## 1.1.1-alpha300.19
* fix: Meteor 3.0 compatibility

## 1.1.0
* feat: custom `where` function

## 1.0
* initial version
