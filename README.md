# Easy Schema

Easy Schema is an easy way to add schema validation for Meteor apps. Its key features are:
* Create one schema, attach it to your collection, and then reuse it across `Meteor.methods`
* Isomorphic so that it works with Optimistic UI
* Automatic validation on the client and server prior to DB write (optional)
* Automatic creation and attachment of a MongoDB JSON Schema (optional)
* A schema syntax that is a joy to write and read — brevity and clarity
* Lightweight and fast
* Native to the Meteor ecosystem – extends Meteor's [check](https://docs.meteor.com/api/check.html) for validation, uses [Validation Error](https://github.com/meteor/validation-error) for friendlier error messages, and supports Meteor's `mongo-decimal`
* Integrates seamlessly with [jam:method](https://github.com/jamauro/method) (optional)

## Basics

When using this package, you create a schema once for each Collection and attach it with `attachSchema`. When a method is called, the arguments passed from the client are validated against the schema you defined.

Right before an `insert / update / upsert` to the database, the data will be automatically validated. By default, it will also be validated against the Mongo JSON Schema that was automatically created though you can disable this if you'd like.

## Usage

### Add the package to your app
`meteor add jam:easy-schema`

### Define a schema and attach it to its Collection
```js
import { Mongo } from 'meteor/mongo';

const schema = {
  _id: String,
  text: String,
  done: Boolean,
  createdAt: Date,
  authorId: String,
  username: String
};

export const Todos = new Mongo.Collection('todos', { schema });
```

`Note:` previously you needed to do `Todos.attachSchema(schema)`. You can still do that but by passing in the schema directly you get automatic type inference. see [Typed Collections](#typed-collections)

### Use the schema with [jam:method](https://github.com/jamauro/method) (optional)
```js
import { createMethod } from 'meteor/jam:method';

export const insertTodo = createMethod({
  name: 'todos.insert',
  schema: Todos.schema, // "text" will be automatically picked from the Todos.schema when the method is created
  async run({ text }) {
    const user = await Meteor.userAsync();

    const todo = {
      text,
      done: false,
      createdAt: new Date(),
      authorId: user._id,
      username: user.username
    }

    return Todos.insertAsync(todo);
  }
});
```
See [jam:method](https://github.com/jamauro/method) for more info.

### Use the `check` function with Meteor.methods, ValidatedMethod, or any other method package
If you prefer, you can use this package with [Meteor.methods](https://docs.meteor.com/api/methods.html), [ValidatedMethod](https://github.com/meteor/validated-method/tree/master), or any other package that that includes a way to validate the method via a function.

Use the `check` function provided by this package.

```js
import { check } from 'meteor/jam:easy-schema';

Meteor.methods({
  'todos.insert': async function({ text }) {
    check({ text }, Todos.schema); // "text" will be automatically picked from the Todos.schema so no need to do this manually

    const user = await Meteor.userAsync();

    const todo = {
      text,
      done: false,
      createdAt: new Date(),
      authorId: user._id,
      username: user.username
    }

    return Todos.insertAsync(todo);
  }
})
```

## Defining Schemas

### Primitives
In addition to the built-in Javascript primitives:
* `String`
* `Number`
* `Boolean`
* `Date`
* `Array`
* `Object`

This package adds:
* `Integer` (matches only signed 32-bit integers)
* `Double` (matches either Number or Integer, see [Working with Numbers](#working-with-numbers))
* `ID` (matches Meteor-generated `_id`s)
* `ObjectID` (matches `Mongo.ObjectID`s)
* `Any` (matches anything)

and supports:
* `Decimal` (if using the `mongo-decimal` package)


### ID
You can simply use `String` to validate Meteor-generated `_id`s but if you'd like to be more precise you can use `ID`:

```js
import { ID } from 'meteor/jam:easy-schema';

const schema = {
  _id: ID,
  // ... rest of your schema //
}
```

### ObjectID
If you're using Mongo `ObjectID`s instead of Meteor's default `_id` generation, you'll need to do the following:

```js
import { ObjectID } from 'meteor/jam:easy-schema';

const schema = {
  _id: ObjectID,
  // ... rest of your schema //
}
```

### Optional
By default, everything listed in the schema is assumed to be required. For anything optional, you need to specify it with `Optional`
```js
import { Optional } from 'meteor/jam:easy-schema';

optionalArray: Optional([String])
optionalObject: Optional({thing: String, optionalString: Optional(String)})
arrayOfOptionalInts: [Optional(Integer)]
```
*Note*: If `Optional` is used inside an object and the value of the key is `null` or `undefined`, it will throw a validation error. You can either not send the key value pair if the value is `null` or `undefined` or if you must send a `null` or `undefined` value, you can use `AnyOf(x, null, undefined)` where `x` is the type. This was chosen because `undefined` arguments to Meteor Methods are converted to `null` when sent over the wire.

```js
// In an object
const pattern = { name: Optional(String) };

check({ name: 'something' }, pattern); // OK
check({}, pattern); // OK
check({ name: undefined }, pattern); // Throws an exception
check({ name: null }, pattern); // Throws an exception

// Outside an object
check(null, Optional(String)); // OK
check(undefined, Optional(String)); // OK
```

### AnyOf
`AnyOf` matches one or more of the items. If you're coming from Meteor's `Match`, this is equivalent to `Match.OneOf`.
```js
import { AnyOf } from 'meteor/jam:easy-schema';

anyOf: AnyOf([String], [Date]) // matches either an array of Strings or an array of Dates
arrayAnyOf: [AnyOf(String, Number)] // matches an array of Strings or an array of Numbers
```

### Conditions
You can add conditions to validate against. You can use the fluent-style syntax by importing and using `[has]`. For example:

```js
import { has, ID } from 'meteor/jam:easy-schema';

const schema = {
  _id: ID,
  text: String[has].min(1).max(140),
  done: Boolean[has].default(false),
  createdAt: Date
}
```

Or if you prefer, you can use an object-based syntax:
```js
import { ID } from 'meteor/jam:easy-schema';

const schema = {
  _id: ID,
  text: { type: String, min: 1, max: 140 },
  done: { type: Boolean, default: false },
  createdAt: Date
}
```

The rest of the examples in this Readme will use the fluent-style syntax due to its conciseness and readability.

#### **`min / max`**
*Strings, Numbers, Integers, Arrays, Objects*

min is `greater than or equal to` and max is `less than or equal to`. `min / max` map to the JSON Schema equivalent for the type.


```js
String[has].min(1).max(16) // a string that is at least 1 character and at most 16 characters
Number[has].min(0.1).max(9.9) // a number greater than or equal to 0.1 and less than or equal to 9.9
Integer[has].min(10).max(25) // an integer greater than or equal to 10 and less than or equal to 25
Array[has].min(1).max(5) // an array with at least one item and no more than 5 items
Array[has].only(String).min(1).max(5) // an array of strings with at least one item and no more than 5 items
Object[has].min(1).max(2) // an object with at least one property and no more than 2 properties
Object[has].only({name: String, age: Optional(Number)}).min(1).max(2) // an object with the properties name and age with at least one property and no more than 2 properties
```

`Note`: where you place `min / max` matters, for example:
```js
[String[has].min(1).max(5)] // an array of strings, each with at 1 character and at most 5 characters
Array[has].only(String).min(1).max(5) // an array of strings with at least one string and no more than 5 strings
```

#### **`regex`**
*Strings only*

`regex` maps to JSON Schema's `pattern`.
```js
String[has].regex(/.com$/)
```

#### **`unique`**
*Arrays only*

`unique` maps to JSON Schema's `uniqueItems`.
```js
Array[has].only(Number).unique() // an array of numbers that must be unique, e.g. [1, 2, 3]. [1, 2, 1] would fail.
```

#### **`enums`**
*Any Type*

You can specify an array of items that are allowed values with `enums` – it maps to JSON Schema's `enum`
```js
String[has].enums(['hello', 'hi'])
Number[has].enums([1.2, 6.8, 24.5])
Integer[has].enums([145, 29])
Boolean[has].enums([true])
Date[has].enums([new Date('2021-12-17T03:24:00'), new Date('2022-01-01T03:24:00')])

// Arrays
[String[has].enums(['hello', 'hi'])]
// 2d arrays are supported too
Array[has].only([[String, Number]]).enums([['hi', 1], ['bye', 2]])

// Objects
Object[has].only({hi: String, num: Optional(Number)}).enums([{hi: 'hi', num: 2}])
Object[has].enums([{hi: 'hi', num: 2}])
```

#### **`default`**
*Any Type*

You can set a default value to use unless a value is explicitly provided. There are two types of defaults: `static` and `dynamic`.

Static defaults will be set once when the doc is inserted. For example:

```js
const schema = {
  // ... //
  text: String[has].default('hi'),
  done: Boolean[has].default(false),
  creatorId: ID[has].default(Meteor.userId),
  username: String[has].default(Meteor.user), // will use the value Meteor.user.username
  createdAt: Date[has].default(Date.now)
}
```

Dynamic defaults will be set on each write (`insert / update / upsert`) to a doc. Pass in a function to make a default dynamic, for exmaple:

```js
const schema = {
  // ... //
  updaterId: ID[has].default(() => Meteor.userId()),
  updatedAt: Date[has].default(() => Date.now())
}
```

#### **`where`**
*Any Type*

`where` is a custom function that you can use to validate logic and even create a dependency on another property of your schema. Throw the error message you want as a plain string. You can return `true` inside `where` if you want, but it's taken care of for you if you want to keep it concise.

`Note`: Currently, unlike the other conditions, there isn't a great way to map `where` to JSON Schema so the `where` function will **not** be translated to Mongo JSON Schema.

Here are some examples of how you might use this:

You can make a property conditionally required on its value.
```js
{
  // ... //
  text: Optional(String[has].where(text => { if (text === 'world') throw EasySchema.REQUIRED })), // you can also destructure text in the where function if you'd like
  // ... //
}
```

You can make a property of the schema dependent on the value of a sibling property.
`Important`: you must destructure the params.

```js
{
  // ... //
  text: Optional(String),
  status: Optional(String[has].where(({ text, status }) => {
    if (text && !status) throw EasySchema.REQUIRED
  })),
  // ... //
}
```

```js
{
  // ... //
  password: String,
  confirmPassword: String[has].where(({ password, confirmPassword }) => {
    if (confirmPassword !== password) throw 'Passwords must match'
  }),
  // ... //
}
```

### Customizing Error Messages
Easy Schema comes with nicely formatted error messages out of the box, but you can easily customize them. Customizing is supported for these conditions:

* `min`
* `max`
* `regex`
* `enums`
* `unique`

Here's an example:
```js
const schema = {
  email: String[has].min(1, 'You must enter an email').regex(/@/, 'You must enter a valid email')
}
```

`Note`: if you're using the object-based syntax rather than `[has]`, it would look like this:
```js
const schema = {
  email: {type: String, min: [1, 'You must enter an email'], regex: [/@/, 'You must enter a valid email']}
}
```

For anything more involved you can use the [`where`](#where) function. Note that conditions are available as a second parameter:
```js
const schema = {
  email: String[has].min(1).regex(/@/).where((email, { min, regex }) => {
    // ... something complex that couldn't be handled otherwise ... //
  })
}
```

### Allowing additional properties
By default, what you define in the schema is what is expected to match the data in the db. If you want to accept additional properties, you can do that using `...Any` like this:

```js
const schema = {
  _id: ID,
  name: String,
  createdAt: Date,
  address: { city: String, ...Any },
  ...Any
}
```

### Blackboxes
In general, it's recommended to specify what you expect but sometimes it's helpful just to validate against a blackbox, i.e. validating the contents is not important or wanted.

```js
// For blackbox objects
{stuff: Object}
```

```js
// For blackbox arrays
{things: Array}
```

```js
// For a true blackbox
{something: Any}
```

### Setting a base schema
You can easily set a base schema that all of your schemas will use. For example:

```js
import { EasySchema } from 'meteor/jam:easy-schema';

const base = {
  createdAt: Date,
  updatedAt: Date
}

EasySchema.configure({ base });
// all schemas will now have a createdAt and updatedAt so you don't need to manually add them each time when writing out your other schemas
```

### Embedding Schemas
If you have a schema that repeats, you can define it once and then embed it.

```js
const addressSchema = {
  street: String,
  city: String,
  state: String[has].min(2).max(2)
}

const personSchema = {
  _id: String,
  name: String,
  homeAddress: addressSchema,
  billingAddress: Optional(addressSchema)
}
```

### Working with Numbers

#### Double - when using Mongo JSON Schemas

Currently, numbers like `1` and `1.0` are both considered to be type `Integer` by the Node Mongo driver. Numbers like `1.2` are considered a double as you might expect.

Javascript has the `Number` prototype which is technically a double-precision floating point numeric value but if you do `Number.isInteger(1.0)` in your console you'll see it’s `true`. The JSON Schema spec also says that `1.0` should be treated as an `Integer`.

**What this means for you**

Basically, if you can ensure that the numbers you'll store will never be or sum to `.0` or `.0000000` etc, and you don't require precision, then it’s fine to use the `Number` type, which will be mapped to `bsonType: 'double'` in the JSON Schema generated by this package.

Otherwise, when you're ok using floating numbers and you don't want to be concened with trailing zeros, you can use `Double` which will accept either a `Number` or an `Integer`, aka `AnyOf(Number, Integer)`:

```js
const schema = {
  _id: String,
  num: Double
}
```

Depending on your situation, you might be better off using `Integer` or storing the numbers as `String` and convert them to Numbers when you need to perform some simple math. If you use `Number` and you have a situation where some data of yours sums to, for example `34.000000`, the Node Mongo driver will see that as an integer `34` and will complain that it was expecting `bsonType: 'double'`.

#### Decimal - when number precision is needed

If you need precision for your numbers, and want to avoid weird floating point math where `0.1 + 0.2 = 0.30000000000000004` then you should probably store them as `Decimal`. Here's what Mongo has to say about [modeling monetary data](https://www.mongodb.com/docs/manual/tutorial/model-monetary-data/#std-label-numeric-model-use-case).

You can do that by adding the `mongo-decimal` package:
`meteor add mongo-decimal`

`mongo-decimal` uses `decimal.js` so you can refer to its [documentation](https://mikemcl.github.io/decimal.js/).

Then when defining your schema:

```js
import { Decimal } from 'meteor/mongo-decimal';

const schema = {
  _id: String,
  price: Decimal,
}
```

### Type inference
When you use the `check` function, the types from your schema are inferred automatically.

```js
const schema = {
  _id: String,
  name: String[has].min(1).max(10),
  age: Optional(Number)
}

check(data, schema);
data.// hovering here will show the expected types based on the schema
```

#### Typed Collections
By passing in your schema like this, your collection will be typed automatically, no config needed:

```ts
export const Todos = new Mongo.Collection('todos', { schema });
```

This would also work:

```ts
const collection = new Mongo.Collection('todos');
export const Todos = collection.attachSchema(schema);
```

If needed, `Infer` is available:
```ts
import { type Infer } from 'meteor/jam:easy-schema';

type Todo = Infer<typeof schema>
```

### Examples
```js
import { has, ID, Optional, Any, Integer, Double, AnyOf } from 'meteor/jam:easy-schema';

const schema = {
  _id: ID,
  text: String,
  emails: [String], // an array of strings
  createdAt: Date,
  private: Boolean,
  num: Double,
  thing: Number,
  stuff: Object, // blackbox object
  int: Integer,
  digit: Integer[has].min(4).max(12), // min is >= and max is <=
  address: {
    street: Optional(String), // street is optional
    city: String,
    state: String[has].min(2).max(2) // state has exactly 2 characters
  },
  messages: [{text: String, createdAt: Date}], // array of objects
  people: [ // an array of objects that accepts additional properities but with a max of 4 properties
    Object[has].only({name: String, age: Number, ...Any}).max(4)
  ],
  regexString: String[has].regex(/.com$/), // regex supported for Strings. should be a regex literal.
  optionalArray: Optional([String]),
  optionalObject: Optional({thing: String, optionalString: Optional(String)}),
  arrayOfInts: [Integer],
  arrayOfOptionalInts: [Optional(Integer)],
  arrayOfRegexStrings: [String[has].regex(/.com$/)],
  anyOf: AnyOf([String], [Date]), // AnyOf matches one or more of the items. In this example, it matches either an array of Strings or an array of Dates
  arrayAnyOf: [AnyOf(String, Number)], // matches an array of Strings or an array of Numbers,
  something: Any // matches anything, aka a blackbox
};
```

## Configuring (optional)
If you like the defaults, then you won't need to configure anything. But there is some flexibility in how you use this package.

Here are the global defaults:
```js
const config = {
  base: {}, // set a base schema for all your schemas to use
  autoCheck: true, // automatically validate on the server prior to insert / update / upsert
  autoAttachJSONSchema: true, // automatically use a MongoDB JSON Schema
  validationAction: 'error', // set MongoDB JSON Schema validation action
  validationLevel: 'strict', // set MongoDB JSON Schema validation level
  additionalBsonTypes: {} // set additional MongoDB bson types
};
```

To change the global defaults, use:
```js
// put this in a file that's imported on both the client and server into their repective main.js
import { EasySchema } from 'meteor/jam:easy-schema';

EasySchema.configure({
  // ... change the defaults here ... //
});
```

By default, an automatic validation will be performed on the server prior to `insert / update / upsert` operations. If you don't want that, you can turn it off by setting `autoCheck` to `false`. The data will still be validated against the JSON Schema but you won't get as friendly of error messages and you won't know that a write fails until it's attempted on the database.

```js
import { EasySchema } from 'meteor/jam:easy-schema';

EasySchema.configure({ autoCheck: false });
```

If you turn `autoCheck` off, you can still validate manually by using the `check` function
```js
import { check } from 'meteor/jam:easy-schema';
// Use check inside of a Meteor Method before you perform a db write operation.
// data - the object you want to validate. For an insert operation, this is the document object you're inserting. In the case of an update / upsert operation, this is the modifier, aka the 2nd argument of the operation.
// schema - the schema object. Most likely you'll want to pass in the schema attached to your collection, e.g. Todos.schema, but you can also create a custom schema object.
const data = {$set: {text: 'book flight to hawaii'}}; // example of an update modifier
const schema = Todos.schema;
check(data, schema);

// perform db write operation. here's an example with update.
Todos.updateAsync(_id, data);
```

If you choose to validate manually, you can force a full check against the entire schema by passing in `{full: true}` to the check function.
```js
import { check } from 'meteor/jam:easy-schema';

const data = {text: 'hi', ...};
const schema = Todos.schema;
check(data, schema, {full: true}); // will perform a full check only on the server
```

You can also skip an auto check on a one-off basis turning it off for that operation with`{ autoCheck: false }`
```js
await Todos.insertAsync(..., { autoCheck: false });
```

You can prevent automatically attaching a JSON Schema to your Collection by setting `autoAttachJSONSchema` to `false`. If you stick with the default of automatically attaching a JSON Schema, you can configure the `validationAction` and `validationLevel` – see Mongo's [Schema Validation](https://www.mongodb.com/docs/v4.2/core/schema-validation/) for more info.

```js
import { EasySchema } from 'meteor/jam:easy-schema';

EasySchema.configure({
  autoAttachJSONSchema: false,
  // validationAction: 'warn', // 'error' is default
  // valdiationLevel: 'moderate' // 'strict' is default
});
```

## Unsupported

**Auto Check for bulk writes**

If you're using `rawCollection()` for bulk writes, these will not be automatically validated prior to the operation but you will get validation from the JSON Schema on the db Collection. You can manually use the `check` function if you'd like to validate prior to writing to the db. I'm hoping that Meteor will one day support bulk writes without needing `rawCollection()`. There was some progress on this front but it seems to have stalled – https://github.com/meteor/meteor/pull/11222

**Update accepting an aggregation pipeline**

Though technically Mongo supports it, Meteor does not support an aggregation pipeline in `update` operations (https://github.com/meteor/meteor/issues/11276) and so this package does not.

**JSON Schema omissions**

See: [MongoDB JSON Schema omissions](https://www.mongodb.com/docs/manual/reference/operator/query/jsonSchema/#omissions)

In addition to the MongoDB omissions, these are also unsupported by this package at this time:
* dependencies
* oneOf
* allOf
* not
* Array keywords
  * contains
  * maxContains
  * minContains
* Number keywords
  * multipleOf
  * exclusiveMinimum (you can use min instead to achieve the desired result just be aware that min is inclusive)
  * exclusiveMaximum (you can use min instead to achieve the desired result just be aware that max is inclusive)
* String keywords
  * contentMediaType
  * contentEncoding

## Support

If you find this package valuable, I hope you'll consider [supporting](https://github.com/sponsors/jamauro) it. :) Maybe you pass on the cost to your client(s) or factor in the time it saved you and your team.
