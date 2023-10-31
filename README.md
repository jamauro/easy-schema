# Easy Schema

Easy Schema is an easy way to add schema validation for Meteor apps. It extends the functionality provided by Meteor's [check](https://docs.meteor.com/api/check.html) to validate arguments passed to Meteor Methods and validates automatically on the server prior to write operations `insert / update / upsert`. It also automatically generates a [JSON Schema](https://www.mongodb.com/docs/manual/core/schema-validation/specify-json-schema/#std-label-schema-validation-json) and attaches it to the database's Collection. It's meant to be lightweight and fast. By default, it validates automatically but it is configurable.

This package can be used with [jam:method](https://github.com/jamauro/method), [Meteor.methods](https://docs.meteor.com/api/methods.html), [Validated Method](https://github.com/meteor/validated-method), or any other package that includes a way to validate the method via a function. It also has built-in support for [Validation Error](https://github.com/meteor/validation-error) for friendlier error messages.

## Basics

When using this package, you create a schema once for each Collection and attach it with `attachSchema`. When a method is called, you'll use this package's `check` function to make sure the arguments passed from the client match what is expected by the schema you defined.

Then, right before the insert / update / upsert to the database, a validation will be automatically performed against the data that will be written to the database. By default, it will also be validated against the JSON Schema attached to the Collection via Mongo's JSON Schema support though you can disable this if you'd like.

## Usage

### Add the package to your app
`meteor add jam:easy-schema`

### Define a schema and attach it to its Collection
```js
import { Mongo } from 'meteor/mongo';

export const Todos = new Mongo.Collection('todos');

const schema = {
  _id: String,
  text: String,
  done: Boolean,
  createdAt: Date,
  authorId: String,
  username: String
};

Todos.attachSchema(schema); // attachSchema is a function that's built into this package
```

### Use the schema with [jam:method](https://github.com/jamauro/method) Methods
```js
import { createMethod } from 'meteor/jam:method';

export const insertTodo = createMethod({
  name: 'todos.insert',
  schema: Todos.schema,
  run({ text }) {
    const userId = Meteor.userId(); // can use this.userId instead
    const todo = {
      text,
      done: false,
      createdAt: new Date(),
      authorId: userId,
      username: Meteor.users.findOne(userId).username
    }

    const todoId = Todos.insert(todo);
    return todoId;
  }
});
```
See [jam:method](https://github.com/jamauro/method) for more info.

### Use the check function with Validated Methods or Meteor.methods
You can use this package with `ValidatedMethod` or [Meteor.methods](https://docs.meteor.com/api/methods.html) if you prefer. Use the `check` function provided by this package.
```js
import { check } from 'meteor/jam:easy-schema';
import { ValidatedMethod } from 'meteor/mdg:validated-method';

export const insertTodo = new ValidatedMethod({
  name: 'todos.insert',
  validate(args) { // args should be an object that you pass in from the client. If you want to destructure here, then be sure to pass an object into the check function.
    check(args, Todos.schema); // the package automatically compares the args only against the relative data inside the Todos.schema so no need to pick them out yourself.
    // if you want, you can also pass in a custom schema, like this:
    /* check(args, {text: {type: String, min: 1, max: 16}}) */
  },
  run({ text }) {
    const userId = Meteor.userId();
    if (!userId) {
      throw new Meteor.Error('not-authorized');
    }

    const todo = {
      text,
      done: false,
      createdAt: new Date(),
      authorId: userId,
      username: Meteor.users.findOne(userId).username
    }

    const todoId = Todos.insert(todo);
    return todoId;
  }
});
```

Then import `insertTodo` method in your UI component and call it like you would any other Validated Method. See their [docs](https://github.com/meteor/validated-method) for more info.

## Defining Schemas
```js
import { Optional, Any, Integer, AnyOf } from 'meteor/jam:easy-schema';

// Illustrating the various possibilities for a schema
const schema = {
  _id: String, // _id can technically be optional with inserts and upserts since it won't be created yet. this is handled automatically.
  text: String,
  emails: [String], // an array of strings
  createdAt: Date,
  private: Boolean,
  thing: Number,
  stuff: Object,
  int: Integer,
  digit: {type: Integer, min: 4, max: 12}, // min is >= and max is <=. automatically converted to JSON Schema "minimum / maximum"
  address: {
    street_address: Optional(String), // street address is optional
    city: String,
    state: {type: String, min: 0, max: 2}, // min is >= and max is <=. automatically converted to JSON Schema "minLength / maxLength"
  },
  messages: [{text: String, createdAt: Date}], // array of objects
  people: [ // an array of objects with additionalProperties: true. additonalProperties is false by default.
    {type: {name: String, age: Number, arrayOfOptionalBooleans: [Optional(Boolean)]}, additionalProperties: true}
  ],
  regexString: {type: String, regex: /.com$/}, // regex supported for Strings. should be a regex literal. automatically converted to JSON Schema "pattern"
  optionalArray: Optional([String]),
  optionalObject: Optional({thing: String, optionalString: Optional(String)}),
  arrayOfInts: [Integer],
  arrayOfOptionalInts: [Optional(Integer)],
  arrayOfRegexStrings: [{type: String, regex: /.com$/}],
  anyOf: AnyOf([String], [Date]), // AnyOf matches one or more of the items. In this example, it matches either an array of Strings or an array of Dates
  arrayAnyOf: [AnyOf(String, Number)], // matches an array of Strings or an array of Numbers,
  any: Any // anything, aka a blackbox
};
```

### Integer
`Integer` matches only signed 32-bit integers

### Optional
By default, everything listed in the schema is assumed to be required. For anything optional, you need to specify it with `Optional`
```js
optionalArray: Optional([String])
optionalObject: Optional({thing: String, optionalString: Optional(String)})
arrayOfOptionalInts: [Optional(Integer)]
```

### AnyOf
`AnyOf` matches one or more of the items. If you're coming from Meteor's `Match`, this is equivalent to `Match.OneOf`.
```js
anyOf: AnyOf([String], [Date]) // matches either an array of Strings or an array of Dates
arrayAnyOf: [AnyOf(String, Number)] // matches an array of Strings or an array of Numbers
```

### Conditions
You can add conditions to validate against. Here's how you do that:

**`min / max`** – *Strings, Numbers, Integers, Arrays, Objects*

min is `greater than or equal to` and max is `less than or equal to`
```js
{type: String, min: 1, max: 16} // a string that is at least 1 character and at most 16 characters
{type: Number, min: 0.1, max: 9.9} // a number greater than or equal to 0.1 and less than or equal to 9.9
{type: Integer, min: 10, max: 25} // an integer greater than or equal to 10 and less than or equal to 25
{type: Array, min: 1, max: 5} // an array with at least one item and no more than 5 items
{type: [String], min: 1, max: 5} // an array of Strings with at least one item and no more than 5 items
{type: Object, min: 1, max: 2} // an object with at least one property and no more than 2 properties
{type: {name: String, age: Optional(Number)}, min: 1, max: 2} // an object with the properties name and age with at least one property and no more than 2 properties
```

**`allow`** - *Any Type*

You can specify an array of items that are allowed values with `allow`
```js
// allow is equivalent to JSON Schema's 'enum'
{type: String, allow: ['hello', 'hi']}
{type: Number, allow: [1.2, 6.8, 24.5]}
{type: Integer, allow: [145, 29]}
{type: Boolean, allow: [true]}
{type: Date, allow: [new Date('2021-12-17T03:24:00'), new Date('2022-01-01T03:24:00')]}

// For arrays, recommend using it within the array, e.g. [{type: String, allow: ['hello', 'hi']}] as opposed to {type: [String], allow: [['hello'], ['hi']]}
[{type: String, allow: ['hello', 'hi']}]
{type: [String], allow: [['hello'], ['hi']]}
{type: Array, allow: [['hello'], ['hi']]}
// 2d arrays are supported too
{type: [[String, Number]], allow: [['hi', 1], ['bye', 2]]}

// Object examples
{type: {hi: String, num: Optional(Number)}, allow: [{hi: 'hi', num: 2}]}
{type: Object, allow: [{hi: 'hi', num: 2}]}
```

**`regex`** - *Strings only*

```js
{type: String, regex: /.com$/} // regex is equivalent to JSON Schema's 'pattern'
```

**`unique`** - *Arrays only*

```js
{type: [Number], unique: true} // an array of numbers that must be unique, e.g. [1, 2, 3]. [1, 2, 1] would fail. unique is equivalent to JSON Schema's 'uniqueItems'
```

**`additionalProperties`** - *Objects only*

By default, additionalProperties is `false`, i.e. what you define in the schema is what is expected to match the data in the db. If you want to accept additionalProperties, you can do that like this:
```js
{type: {name: String, createdAt: Date}, additionalProperties: true}
```

### Blackboxes
In general, it's recommended to specify what you expect but sometimes it's helpful just to validate against a blackbox, i.e. validating the contents is not important or wanted.

```js
// For blackbox objects, you can do either of these
{stuff: Object}
{stuff: {type: Object}} // this can come in handy if you want to use conditions
```

```js
// For blackbox arrays, you can do either of these
{things: Array}
{things: {type: Array}} // this can come in handy if you want to use conditions
```

```js
// For a true blackbox, you can do either of these
{something: Any}
{something: {type: Any}}
```

### Embedding Schemas
If you have a schema that repeats, you can define it once and then embed it.

```js
const addressSchema = {
  street: String,
  city: String,
  state: {type: String, min: 2, max: 2}
}

const personSchema = {
  _id: String,
  name: String,
  homeAddress: addressSchema,
  billingAddress: Optional(addressSchema)
}
```

### Working with Numbers
Currently, numbers like `1` and `1.0` are both considered to be type `Integer` by the Node Mongo driver. Numbers like `1.2` are considered a `Double` as you might expect.

Javascript has the `Number` prototype which is technically a double-precision floating point numeric value but if you do `Number.isInteger(1.0)` in your console you'll see it’s `true`. The JSON Schema spec also says that `1.0` should be treated as an `Integer`.

**What this means for you**

Basically, if you can ensure that the numbers you'll store will never be or sum to `.0` or `.0000000` etc, and you don't require precision, then it’s fine to use the `Number` type, which will be mapped to `bsonType: 'double'` in the JSON Schema this package generates and attaches to the Mongo Collection. Depending on your situation, you might be better of using `Integer` or storing the numbers as `String` and convert them to Numbers when you need to perform some simple math. Otherwise if you use `Number` and you have a situation where some data of yours sums to, for example `34.000000`, the Node Mongo driver will see that as an integer `34` and will complain that it was expecting `bsonType: 'double'`.

One way to get around this – and prevent raising an error when you're ok using floating numbers – would be to define your schema like:
```js
const schema = {
  _id: String,
  num: AnyOf(Number, Integer)
}
```

**Precise numbers**

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

### Configuring (optional)
If you like the defaults, then you won't need to configure anything. But there is some flexibility in how you use this package.

By default, an automatic validation will be performed on the server prior to `insert / update / upsert` operations. If you don't want that, you can turn it off by setting `autoCheck` to `false`. The data will still be validated against the JSON Schema but you won't get as friendly of error messages and you won't know that a write fails until it's attempted on the database.

```js
// in /server/somewhere.js
`Do not put in /server/main.js. Make sure it's in a different file on the server that is imported at the top of your /server/main.js`
import { EasySchema } from 'meteor/jam:easy-schema';

EasySchema.configure({autoCheck: false});
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
Todos.update(_id, data);
```

If you choose to validate manually, you can force a full check against the entire schema by passing in `{full: true}` to the check function.
```js
import { check } from 'meteor/jam:easy-schema';

const data = {text: 'hi', ...};
const schema = Todos.schema;
check(data, schema, {full: true}); // will perform a full check only on the server
```

You can also skip an auto check on a one-off basis by calling `EasySchema.skipAutoCheck()` inside the body of a Meteor Method.
```js
import { EasySchema } from 'meteor/jam:easy-schema';

// Inside Meteor Method body
EasySchema.skipAutoCheck();

// optionally check manually
// perform db write operation
```

You can prevent automatically attaching a JSON Schema to your Collection by setting `autoAttachJSONSchema` to `false`. If you stick with the default of automatically attaching a JSON Schema, you can configure the `validationAction` and `validationLevel` – see Mongo's [Schema Validation](https://www.mongodb.com/docs/v4.2/core/schema-validation/) for more info.

```js
import { EasySchema } from 'meteor/jam:easy-schema';

EasySchema.configure({
  // autoAttachJSONSchema: false
  validationAction: 'warn' // 'error' is default
  valdiationLevel: 'moderate' // 'strict' is default
});
```

### Dynamically import schema (optional)
You can also dynamically import your schemas to reduce the initial bundle size on the client.

First you'll need to create your schema inside its own `schema.js` and put it inside its collection's folder, e.g. `/imports/api/todos/schema.js`

Then you'll need to add a file to your project's root, e.g. `register-dynamic-imports.js` and import this file on both the client and the server near the top of its `mainModule`. Here's an example of the file:

```js
// In order for the dynamic import to work properly, Meteor needs to know these paths exist. We do that by declaring them statically inside a if (false) block
Meteor.startup(async () => {
  if (false) {
    await import('/imports/api/todos/schema');
    // add additional schema paths here as well
  }
});
```

Then instead of using `Todos.attachSchema(schema)`, you'd just use `Todos.attachSchema()`
```js
// By not passing in a schema explicitly, it will automatically dynamically import the schema and then attach it
Todos.attachSchema();
```

This assumes your directory structure is `/imports/api/{collection}/schema.js`. If you have a different structure, e.g. `/api/todos/schema.js`, you can configure the base path with:
```js
EasySchema.configure({
  basePath: `/api`
});
```

### Unsupported

**Auto Check for bulk writes**

If you're using `rawCollection()` for bulk writes, these will not be automatically validated prior to the operation but you will get validation from the JSON Schema on the db Collection. You can manually use the `check` function if you'd like to validate prior to writing to the db. I'm hoping that Meteor will one day support bulk writes without needing `rawCollection()`. There was some progress on this front but it seems to have stalled – https://github.com/meteor/meteor/pull/11222

**Update accepting an aggregation pipeline**

Though technically Mongo supports it, Meteor does not support aggregation pipeline's in `update` operations (https://github.com/meteor/meteor/issues/11276) and so this package does not.

**JSON Schema omissions**

See: [MongoDB JSON Schema omissions](https://www.mongodb.com/docs/manual/reference/operator/query/jsonSchema/#omissions)

In addition to the MongoDB omissions, these are also unsupported by this package at this time:
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
