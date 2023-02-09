import { Tinytest } from 'meteor/tinytest';
import { Mongo } from 'meteor/mongo';
import { createJSONSchema, Integer, Any, Optional, AnyOf, check } from 'meteor/jam:easy-schema';
import { shapeSchema, Where } from './shared.js';
import { Decimal } from 'meteor/mongo-decimal';
import { check as c, Match } from 'meteor/check';

const testSchema = {
  _id: Optional(String),
  text: String,
  emails: [String],
  createdAt: Date,
  bool: Boolean,
  num: Number,
  stuff: Object,
  int: Integer,
  minMaxString: {type: String, min: 0, max: 20},
  minString: {type: String, min: 2},
  maxString: {type: String, max: 5},
  minMaxNum: {type: Number, min: 2.5, max: 15.5},
  minNum: {type: Number, min: 2.5},
  maxNum: {type: Number, max: 30.2},
  minMaxInt: {type: Integer, min: 4, max: 12},
  minInt: {type: Integer, min: 10},
  maxInt: {type: Integer, max: 1000},
  address: {
    street_address: Optional(String),
    city: String,
    state: {type: String, min: 0, max: 2},
  },
  people: [{type: {name: String, age: Number, arrayOfOptionalBooleans: [Optional(Boolean)]}, additionalProperties: true}],
  optionalArray: Optional([String]),
  optionalObject: Optional({thing: String, optionalString: Optional(String)}),
  arrayOfInts: [Integer],
  arrayOfOptionalInts: [Optional(Integer)],
  regexString: {type: String, regex: /.com$/},
  optionalRegexString: {type: Optional(String), regex: /.com$/},
  optionalRegexStringVariant: Optional({type: String, regex: /.com$/}),
  arrayOfRegexStrings: [{type: String, regex: /.com$/}],
  arrayOfOptionalMinMaxNum: [{type: Optional(Number), min: 1, max: 4}],
  optionalArrayOfMinMaxInt: Optional([{type: Integer, min: 200, max: 300}]),
  minMaxArray: {type: [String], min: 1, max: 3},
  arrayOfRegexStringsWithArrayMinMax: {type: [{type: String, regex: /com$/}], min: 1, max: 2},
  anyOf: AnyOf([String], [Date]),
  arrayAnyOf: [AnyOf(String, Number)],
  any: Any
};

const testSchemaShapedManual = {
  _id: Optional(String),
  text: String,
  emails: [String],
  createdAt: Date,
  bool: Boolean,
  num: Number,
  stuff: Object,
  int: Integer,
  minMaxString: Where({type: String, min: 0, max: 20}),
  minString: Where({type: String, min: 2}),
  maxString: Where({type: String, max: 5}),
  minMaxNum: Where({type: Number, min: 2.5, max: 15.5}),
  minNum: Where({type: Number, min: 2.5}),
  maxNum: Where({type: Number, max: 30.2}),
  minMaxInt: Where({type: Integer, min: 4, max: 12}),
  minInt: Where({type: Integer, min: 10}),
  maxInt: Where({type: Integer, max: 1000}),
  address: {
    street_address: Optional(String),
    city: String,
    state: Where({type: String, min: 0, max: 2}),
  },
  people: [
    Where({type: {name: String, age: Number, arrayOfOptionalBooleans: [Optional(Boolean)]}, additionalProperties: true})
  ],
  optionalArray: Optional([String]),
  optionalObject: Optional({thing: String, optionalString: Optional(String)}),
  arrayOfInts: [Integer],
  arrayOfOptionalInts: [Optional(Integer)],
  regexString: Where({type: String, regex: /.com$/}),
  optionalRegexString: Optional(Where({type: String, regex: /.com$/})),
  optionalRegexStringVariant: Optional(Where({type: String, regex: /.com$/})),
  arrayOfRegexStrings: [Where({type: String, regex: /.com$/})],
  arrayOfOptionalMinMaxNum: [Optional(Where({type: Number, min: 1, max: 40}))],
  optionalArrayOfMinMaxInt: Optional([Where({type: Integer, min: 200, max: 300})]),
  minMaxArray: Where({type: [String], min: 1, max: 3}),
  arrayOfRegexStringsWithArrayMinMax: Where({type: [String], regex: /.com$/, min: 1, max: 2}),
  anyOf: AnyOf([String], [Date]),
  arrayAnyOf: [AnyOf(String, Number)],
  any: Any
};

const schemaAsIs = {
  _id: Optional(String),
  text: String,
  emails: [String],
  createdAt: Date,
  bool: Boolean,
  num: Number,
  stuff: Object,
  int: Integer,
  arrayOfObjs: [{hello: String, something: Object}],
  embeddedArrayOfObjs: [{embedded: [{string: String, createdAt: Optional(Date)}], checked: Boolean}],
  optionalArray: Optional([String]),
  arrayOfOptionalInts: [Optional(Integer)],
  arrayOfOptionalObjs: [Optional({hi: String, another: Number})],
  optionalObject: Optional({thing: String, optionalString: Optional(String)}),
  anyOf: AnyOf([String], [Date])
}

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

const personSchemaShapedManual = {
  _id: String,
  name: String,
  homeAddress: {
    street: String,
    city: String,
    state: Where({type: String, min: 2, max: 2})
  },
  billingAddress: Optional({
    street: String,
    city: String,
    state: Where({type: String, min: 2, max: 2})
  })
}

const messageSchema = {
  title: String,
  text: String,
  titleContent: String,
  textContent: String,
  channel: String,
  organizationId: String,
  isActive: Boolean,
  mentions: Optional([{
    userId: String,
    isUrgent: Boolean
  }]),
  urls: Optional(Array),
  codeBlocks: Optional(Array),
  uploads: Optional([{name: String, url: String, type: String, uploadId: String}]),
  scheduledDate: Optional(Date),
  timestamp: Date,
  repliesCount: Integer,
  participants: [String],
  followers: [String],
  subscribers: Optional([String]),
  lastTouched: Date,
  readBy: [{userId: String, timestamp: Date}],
  authorId: String
}

/*console.log('messageSchema SHAPED');
console.dir(shapeSchema(messageSchema), {depth: null})
console.log('messageSchema JSONSchema');
console.dir(createJSONSchema(messageSchema), {depth: null});  */

/// String ///

// regex
const regexSchema = {
  _id: Optional(String),
  string: {type: String, regex: /.com$/}
}
const regexData = {
  _id: '1',
  string: 'test@testmail.com'
}
const regexDataFail = {
  _id: '1',
  string: 'test@testmail'
}

// min, max, minmax
const minSchema = {
  _id: Optional(String),
  minString: {type: String, min: 2}
}
const minData = {
  _id: '1',
  minString: 'ab'
}
const minDataFail = {
  _id: '1',
  minString: 'a'
}

const maxSchema = {
  _id: Optional(String),
  maxString: {type: String, max: 3}
}
const maxData = {
  _id: '1',
  maxString: 'ab'
}
const maxDataFail = {
  _id: '1',
  maxString: 'abcd'
}

const minMaxSchema = {
  _id: Optional(String),
  minMaxString: {type: String, min: 3, max: 5}
}
const minMaxData = {
  _id: '1',
  minMaxString: 'abc'
}
const minMaxDataFailLow = {
  _id: '1',
  minMaxString: 'ab'
}
const minMaxDataFailHigh = {
  _id: '1',
  minMaxString: 'abcdef'
}

const allowSchema = {
  _id: Optional(String),
  allowString: {type: String, allow: ['hi', 'bye']}
}
const allowData = {
  _id: '1',
  allowString: 'hi'
}
const allowDataFail = {
  _id: '1',
  allowString: 'sup'
}

///

/// Number ///
const minNumSchema = {
  _id: Optional(String),
  minNum: {type: Number, min: 2}
}
const minNumData = {
  _id: '1',
  minNum: 3
}
const minNumDataFail = {
  _id: '1',
  minNum: 1
}

const maxNumSchema = {
  _id: Optional(String),
  maxNum: {type: Number, max: 3}
}
const maxNumData = {
  _id: '1',
  maxNum: 2
}
const maxNumDataFail = {
  _id: '1',
  maxNum: 5
}

const minMaxNumSchema = {
  _id: Optional(String),
  minMaxNum: {type: Number, min: 9.5, max: 15.5}
}
const minMaxNumData = {
  _id: '1',
  minMaxNum: 15.4
}
const minMaxNumDataFailLow = {
  _id: '1',
  minMaxNum: 9.4
}
const minMaxNumDataFailHigh = {
  _id: '1',
  minMaxNum: 15.6
}
///

/// Integer ///
const minIntSchema = {
  _id: Optional(String),
  minInt: {type: Integer, min: 1000}
}
const minIntData = {
  _id: '1',
  minInt: 1001
}
const minIntDataFail = {
  _id: '1',
  minInt: 1
}

const maxIntSchema = {
  _id: Optional(String),
  maxInt: {type: Integer, max: 30}
}
const maxIntData = {
  _id: '1',
  maxInt: 29
}
const maxIntDataFail = {
  _id: '1',
  maxInt: 31
}

const minMaxIntSchema = {
  _id: Optional(String),
  minMaxInt: {type: Integer, min: 10, max: 15}
}
const minMaxIntData = {
  _id: '1',
  minMaxInt: 11
}
const minMaxIntDataFailLow = {
  _id: '1',
  minMaxInt: 5
}
const minMaxIntDataFailHigh = {
  _id: '1',
  minMaxInt: 20
}

const allowIntSchema = {
  _id: Optional(String),
  int: {type: Integer, allow: [1000, 11]}
}
const allowIntData = {
  _id: '1',
  int: 11
}
const allowIntDataFail = {
  _id: '1',
  int: 1
}
///

/// Decimal ///
const minDecimalSchema = {
  _id: Optional(String),
  minDecimal: {type: Decimal, min: Decimal(9.234)}
}
const minDecimalData = {
  _id: '1',
  minDecimal: Decimal(9.235)
}
const minDecimalDataFail = {
  _id: '1',
  minDecimal: Decimal(9.233)
}

const maxDecimalSchema = {
  _id: Optional(String),
  maxDecimal: {type: Decimal, max: Decimal(20.978)}
}
const maxDecimalData = {
  _id: '1',
  maxDecimal: Decimal(20.977)
}
const maxDecimalDataFail = {
  _id: '1',
  maxDecimal: Decimal(20.979)
}

const minMaxDecimalSchema = {
  _id: Optional(String),
  minMaxDecimal: {type: Decimal, min: Decimal(10.01), max: Decimal(15.99)}
}
const minMaxDecimalData = {
  _id: '1',
  minMaxDecimal: Decimal(10.011)
}
const minMaxDecimalFailLow = {
  _id: '1',
  minMaxDecimal: Decimal(10.009)
}
const minMaxDecimalFailHigh = {
  _id: '1',
  minMaxDecimal: Decimal(15.991)
}

const allowDecimalSchema = {
  _id: Optional(String),
  decimal: {type: Decimal, allow: [Decimal(10.99), Decimal(12.67)]}
}
const allowDecimalData = {
  _id: '1',
  decimal: Decimal(10.99)
}
const allowDecimalDataFail = {
  _id: '1',
  decimal: Decimal(10.991)
}
///


/// Array ///
const minArrSchema = {
  _id: Optional(String),
  minArr: {type: [String], min: 2}
}
const minArrData = {
  _id: '1',
  minArr: ['a', 'b']
}
const minArrDataFail = {
  _id: '1',
  minArr: ['a']
}

const maxArrSchema = {
  _id: Optional(String),
  maxArr: {type: [String], max: 2}
}
const maxArrData = {
  _id: '1',
  maxArr: ['a', 'b']
}
const maxArrDataFail = {
  _id: '1',
  maxArr: ['a', 'b', 'c']
}

const minMaxArrSchema = {
  _id: Optional(String),
  minMaxArr: {type: [String], min: 2, max: 4}
}
const minMaxArrData = {
  _id: '1',
  minMaxArr: ['a', 'b']
}
const minMaxArrDataFailLow = {
  _id: '1',
  minMaxArr: ['a']
}
const minMaxArrDataFailHigh = {
  _id: '1',
  minMaxArr: ['a', 'b', 'c', 'd', 'e']
}

const uniqueArrSchema = {
  _id: Optional(String),
  uniqueArr: {type: [Number], unique: true}
}
const uniqueArrData = {
  _id: '1',
  uniqueArr: [1, 2]
}
const uniqueArrDataFail = {
  _id: '1',
  uniqueArr: [1, 2, 1]
}

const allowArrSchema = {
  _id: Optional(String),
  allowArr: {type: [[String, Number]], allow: [['hi', 1], ['bye', 2]]}
}
const allowArrData = {
  _id: '1',
  allowArr: ['bye', 2]
}
const allowArrDataFail = {
  _id: '1',
  allowArr: ['hi', 3]
}

const allowArrOfObjSchema = {
  _id: String,
  text: [{type: {thing: String, num: Number}, allow: [{thing: 'hi', num: 2}]}]
}
const allowArrOfObjData = {
  _id: '1',
  text: [{thing: 'hi', num: 2}]
}
const allowArrOfObjDataFail = {
  _id: '1',
  text: [{thing: 'hi', num: 1}]
}

const allowArrOfObjVariantSchema = {
  _id: String,
  text: {type: [{thing: String, num: Number}], allow: [[{thing: 'hi', num: 2}]]}
}
const allowArrOfObjVariantData = {
  _id: '1',
  text: [{thing: 'hi', num: 2}]
}
const allowArrOfObjVariantDataFail = {
  _id: '1',
  text: [{thing: 'hi', num: 1}]
}

const genericArrUniqueSchema = {
  _id: Optional(String),
  arr: {type: Array, unique: true}
}
const genericArrUniqueData = {
  _id: '1',
  arr: ['bye', 2]
}
const genericArrUniqueDataFail = {
  _id: '1',
  arr: [1, 3, 'stuff', 1]
}

const genericArrAllowSchema = {
  _id: Optional(String),
  arr: {type: Array, allow: [['hi'], ['bye']]}
}
const genericArrAllowData = {
  _id: '1',
  arr: ['bye']
}
const genericArrAllowDataFail = {
  _id: '1',
  arr: ['stuff']
}
///

/// Object ///
const minObjSchema = {
  _id: Optional(String),
  minObj: {type: {thing: String, num: Number}, min: 2}
}
const minObjData = {
  _id: '1',
  minObj: {thing: 'hi', num: 1}
}
const minObjDataFail = {
  _id: '1',
  minObj: {thing: 'hi'}
}

const maxObjSchema = {
  _id: Optional(String),
  maxObj: {type: {thing: String, num: Number}, additionalProperties: true, max: 3}
}
const maxObjData = {
  _id: '1',
  maxObj: {thing: 'hi', num: 1, another: 4}
}
const maxObjDataFail = {
  _id: '1',
  maxObj: {thing: 'hi', num: 1, stuff: 'stuff', another: 4}
}

const genericObjSchema = {
  _id: Optional(String),
  obj: {type: Object, max: 2}
}
const genericObjData = {
  _id: '1',
  obj: {t: 't', n: 1}
}
const genericObjDataFail = {
  _id: '1',
  obj: {t: 't', n: 1, s: 's'}
}

const genericObjAllowSchema = {
  _id: Optional(String),
  obj: {type: Object, allow: [{hi: 'hi', num: 2}]}
}
const genericObjAllowData = {
  _id: '1',
  obj: {hi: 'hi', num: 2}
}
const genericObjAllowDataFail = {
  _id: '1',
  obj: {hi: 'hi', num: 1}
}
///

/// Any ///
const anySchema = {
  _id: Optional(String),
  any: Any
}

const anyVariantSchema = {
  _id: Optional(String),
  any: {type: Any}
}

const anyData = {
  _id: '1',
  any: 'stuff'
}
///

/// Date ///
const dateSchema = {
  _id: Optional(String),
  created: Date
}

const dateData = {
  _id: '1',
  created: new Date()
}

const dateDataFail = {
  _id: '1',
  created: 2
}


const allowDateSchema = {
  _id: Optional(String),
  created: {type: Date, allow: [new Date('1995-12-17T03:24:00'), new Date()]}
}
const allowDateData = {
  _id: '1',
  created: new Date('1995-12-17T03:24:00')
}
const allowDateDataFail = {
  _id: '1',
  created: new Date()
}
///

/// Boolean ///
const booleanSchema = {
  _id: Optional(String),
  private: Boolean
}

const booleanData = {
  _id: '1',
  private: true
}

const booleanDataFail = {
  _id: '1',
  private: 2
}

const booleanAllowSchema = {
  _id: Optional(String),
  private: {type: Boolean, allow: [true]}
}

const booleanAllowData = {
  _id: '1',
  private: true
}

const booleanAllowDataFail = {
  _id: '1',
  private: false
}
///

/// AnyOf ///
const anyOfSchema = {
  _id: Optional(String),
  thing: AnyOf(String, Number)
}

const anyOfData = {
  _id: '1',
  thing: 'thing'
}

const anyOfNumData = {
  _id: '1',
  thing: 2
}

const anyOfDataFail = {
  _id: '1',
  thing: true
}
///



// test data for modifiers
const modifierSchema = {
  _id: String,
  text: {thing: String, date: Date},
  createdAt: Date,
  owner: String,
  username: String,
  private: Boolean,
  lastUpdated: Date,
  checked: [{ name: String, isChecked: Boolean }],
  followers: [String],
  subscribers: [String],
  quantity: {int: Integer, lastUpdated: Date},
  metrics: { orders: Number, ratings: Number },
  tags: {names: [String], nums: [Number]},
  scores: [Number],
  cancellation: { date: Date, reason: String},
  grades: [{ type: String, questions: [Integer]}],
  expdata: Integer
}


const setObj = { $pull: {owner: '1'}, $set: { 'checked.$.isChecked': false } }

const incObj = { $inc: {'quantity.int': 1}}

const arrayModifier = {
  $addToSet: {
    'tags.names': { $each: [ "camera", "electronics", "accessories" ] },
    subscribers: '1',
    scores: {
      $each: [ 50, 60, 70 ],
      $position: 0
    }
  }
}

const todoModifier = {
  $setOnInsert: {
    text: {thing: 'text', date: new Date()},
    createdAt: new Date(),
    owner: '2',
    username: 'username',
    private: false,
    checked: [{name: 'test', isChecked: false}]
  },
  $set: {
    lastUpdated: new Date(),
  }
}

const currentDateModifier = {
  $currentDate: {
    lastUpdated: true,
    "cancellation.date": { $type: "timestamp" }
  }
}

const multiplyModifier = {
  $mul: {
    'metrics.ratings': 1.25,
    expdata: 2
  }
}
const minModifier = { $min: { expdata: 10 } }
const maxModifier = { $max: { 'tags.nums.2': 10 } }
const positionalModifier = { $set: { "scores.$": 2 } }
const positionalAllModifier = { $set: { "scores.$[]": 2 } }
const arrayFilterModifier = { $inc: { "grades.$[t].questions.$[score]": 2 } }
const bitModifier = { $bit: { expdata: { and: 10 } } }


const Things = new Mongo.Collection('things');
const thingsSchema = {
  _id: String,
  num: Number,
  bool: Boolean,
  created: Date,
  obj: AnyOf({thing: String, num: Integer}, {different: String}),  // {thing: String, num: Integer}, //,
  arr: Array,
  readBy: AnyOf([{userId: String, lastRead: Date}], Array),
  // numOrInt: Optional({things: AnyOf(Number, Integer)}),
  numOrInt: AnyOf(Number, Integer),
  int: Integer,
  arrOfInts: [AnyOf(Integer, Number)],
  blackbox: Object,
  blackboxArray: {type: Array, max: 3},
  // decimal: {type: Decimal, min: 2.4, max: 12.7},  // only avaiable when using the mongo-decimal package
};
Things.attachSchema(thingsSchema)

const thingData = {
  // _id: '123',
  num: 12.3,
  bool: true,
  created: new Date(),
  obj: { different: 'different' },
  arr: ['1', '2', '3'],
  readBy: [{userId: '2', lastRead: new Date()}, {userId: '3', lastRead: new Date()}],
  // numOrInt: {things: 14.0},
  numOrInt: 14,
  int: 32324,
  arrOfInts: [1, 4, 78],
  blackbox: {stuff: {lots: 'of', things: 'in', here: [24, 324, 38]}}, // [{stuff: {lots: 'of', things: 'in', here: [24, 324, 38]}}]
  blackboxArray: [1, 2, 3],
  // decimal: Decimal(9.6560546048)
}

if (Meteor.isServer) {
  let thingId;
  Tinytest.add('insert - validates successfully against server ', function (test) {
     try {
      Things.remove({});
      thingId = Things.insert(thingData);
      test.isTrue(true)
    } catch(error) {
      console.log('insert error', error);
      test.isTrue(error = undefined);
    }
  });

  Tinytest.add('update - $set embedded array of objects with positional $', function (test) {
     try {
      Things.update({'readBy.userId': '3'}, {$set: {'readBy.$.userId': '4', numOrInt: 25}}); //, numOrInt: 14.1, decimal: Decimal(486394763.2)
      test.isTrue(true)
    } catch(error) {
      test.isTrue(error = undefined);
    }
  });

  Tinytest.add('update - $set embedded array of objects with positional $[]', function (test) {
     try {
      Things.update({'readBy.userId': '2'}, {$set: {'readBy.$[].userId': '20', numOrInt: 25}}); //, numOrInt: 14.1, decimal: Decimal(486394763.2)
      test.isTrue(true)
    } catch(error) {
      test.isTrue(error = undefined);
    }
  });

  Tinytest.add('update - $set and $inc', function (test) {
     try {
      Things.update(thingId, {$set: {numOrInt: 14.1}, $inc: {int: 11}}); // decimal: Decimal(4.863947632)
      test.isTrue(true)
    } catch(error) {
      test.isTrue(error = undefined);
    }
  });

  Tinytest.add('update - $set embedded object', function (test) {
     try {
      Things.update(thingId, {$set: {'obj.different': 'another'}});
      test.isTrue(true)
    } catch(error) {
      test.isTrue(error = undefined);
    }
  });

  Tinytest.add('update - $set array', function (test) {
     try {
      Things.update(thingId, {$set: {arrOfInts: [2.2, 4.3]}});
      test.isTrue(true)
    } catch(error) {
      test.isTrue(error = undefined);
    }
  });

  Tinytest.add('update - $set array with positional $', function (test) {
     try {
      Things.update({_id: thingId, arrOfInts: 4.3}, {$set: {'arrOfInts.$': 5}});
      test.isTrue(true)
    } catch(error) {
      test.isTrue(error = undefined);
    }
  });

  Tinytest.add('update - $set array with all positional $[]', function (test) {
     try {
      Things.update({_id: thingId}, {$inc: {'arrOfInts.$[]': 10}});
      test.isTrue(true)
    } catch(error) {
      test.isTrue(error = undefined);
    }
  });

  Tinytest.add('update - $set blackboxArray', function (test) {
     try {
      Things.update(thingId, {$set: {blackboxArray: ['a', 'b']}});
      test.isTrue(true)
    } catch(error) {
      test.isTrue(error = undefined);
    }
  });

  Tinytest.add('update - $set blackbox object', function (test) {
     try {
      Things.update(thingId, {$set: {blackbox: {hello: 'hello'}}});
      test.isTrue(true)
    } catch(error) {
      test.isTrue(error = undefined);
    }
  });

  Tinytest.add('update - $addToSet', function (test) {
     try {
      Things.update(thingId, {$addToSet: {readBy: {userId: '100', lastRead: new Date()}}});
      test.isTrue(true)
    } catch(error) {
      test.isTrue(error = undefined);
    }
  });

  Tinytest.add('update - $addToSet $each', function (test) {
     try {
      Things.update(thingId, {$addToSet: {arr: {$each: ['4', '5']}}});
      test.isTrue(true)
    } catch(error) {
      test.isTrue(error = undefined);
    }
  });

  Tinytest.add('update - $push', function (test) {
     try {
      Things.update(thingId, {$push: {readBy: {userId: '100', lastRead: new Date()}}});
      test.isTrue(true)
    } catch(error) {
      test.isTrue(error = undefined);
    }
  });

  Tinytest.add('update - $push $each', function (test) {
     try {
      Things.update(thingId, {$push: {arr: {$each: ['6', '7']}}});
      test.isTrue(true)
    } catch(error) {
      test.isTrue(error = undefined);
    }
  });

  Tinytest.add('update - $currentDate', function (test) {
     try {
      Things.update(thingId, {$currentDate: {created: true}});
      test.isTrue(true)
    } catch(error) {
      test.isTrue(error = undefined);
    }
  });

  Tinytest.add('update - $bit', function (test) {
     try {
      Things.update(thingId, {$set: {int: 13}});
      Things.update(thingId, {$bit: {int: {and: 10}}});
      test.isTrue(true)
    } catch(error) {
      test.isTrue(error = undefined);
    }
  });

  Tinytest.add('upsert - {upsert: true} validates successfully against server', function (test) {
     try {
      Things.update({num: 1.4},
        {
          $inc: {int: 11},
          $setOnInsert: {
            readBy: [{userId: '2', lastRead: new Date()}, {userId: '3', lastRead: new Date()}],
            numOrInt: 8,
            bool: true,
            created: new Date(),
            obj: { different: 'more' },
            arr: ['1', '2', '3'],
            arrOfInts: [1, 4, 78],
            blackbox: {stuff: {lots: 'of', things: 'in', here: [24, 324, 38]}},
            blackboxArray: ['1', '2', '3'],
            // decimal: Decimal(12.6999999999)
          }
        },
        {upsert: true}
      )
      test.isTrue(true)
    } catch(error) {
      test.isTrue(error = undefined);
    }
  });

  Tinytest.add('upsert - validates successfully against server', function (test) {
     try {
      Things.upsert({num: 1.5},
        {
          $inc: {int: 11},
          $setOnInsert: {
            readBy: [{userId: '2', lastRead: new Date()}, {userId: '3', lastRead: new Date()}],
            numOrInt: 8,
            num: 100.1,
            bool: true,
            created: new Date(),
            obj: { different: 'more' },
            arr: ['1', '2', '3'],
            arrOfInts: [1, 4, 78],
            blackbox: {stuff: {lots: 'of', things: 'in', here: [24, 324, 38]}},
            blackboxArray: ['1', '2', '3'],
            // decimal: Decimal(12.6999999999)
          }
        }
      )
      test.isTrue(true)
    } catch(error) {
      test.isTrue(error = undefined);
    }
  });

  Tinytest.add('modifier - set', function(test) {
    try {
      check(setObj, modifierSchema);
      test.isTrue(true)
    } catch(error) {
      test.isTrue(error = undefined);
    }
  });

  Tinytest.add('modifier - inc', function(test) {
    try {
      check(incObj, modifierSchema);
      test.isTrue(true)
    } catch(error) {
      test.isTrue(error = undefined);
    }
  });

  Tinytest.add('modifier - array', function(test) {
    try {
      check(arrayModifier, modifierSchema)
      test.isTrue(true)
    } catch(error) {
      test.isTrue(error = undefined);
    }
  });

  Tinytest.add('modifier - set setOnInsert', function(test) {
    try {
      check(todoModifier, modifierSchema)
      test.isTrue(true)
    } catch(error) {
      test.isTrue(error = undefined);
    }
  });

  Tinytest.add('modifier - currentDate', function(test) {
    try {
      check(currentDateModifier, modifierSchema)
      test.isTrue(true)
    } catch(error) {
      test.isTrue(error = undefined);
    }
  });

  Tinytest.add('modifier - multiply', function(test) {
    try {
      check(multiplyModifier, modifierSchema)
      test.isTrue(true)
    } catch(error) {
      test.isTrue(error = undefined);
    }
  });

  Tinytest.add('modifier - min', function(test) {
    try {
      check(minModifier, modifierSchema)
      test.isTrue(true)
    } catch(error) {
      test.isTrue(error = undefined);
    }
  });

  Tinytest.add('modifier - max', function(test) {
    try {
      check(maxModifier, modifierSchema)
      test.isTrue(true)
    } catch(error) {
      test.isTrue(error = undefined);
    }
  });

  Tinytest.add('modifier - positional $', function(test) {
    try {
      check(positionalModifier, modifierSchema)
      test.isTrue(true)
    } catch(error) {
      test.isTrue(error = undefined);
    }
  });

   Tinytest.add('modifier - positionalAll $[]', function(test) {
    try {
      check(positionalAllModifier, modifierSchema)
      test.isTrue(true)
    } catch(error) {
      test.isTrue(error = undefined);
    }
  });

  Tinytest.add('modifier - arrayFilter', function(test) {
    try {
      check(arrayFilterModifier, modifierSchema)
      test.isTrue(true)
    } catch(error) {
      test.isTrue(error = undefined);
    }
  });

  Tinytest.add('modifier - bit', function(test) {
    try {
      check(bitModifier, modifierSchema)
      test.isTrue(true)
    } catch(error) {
      test.isTrue(error = undefined);
    }
  });

  Tinytest.add('returns the same schema when no extra shaping needed', function(test) {
    const shapedSchema = shapeSchema(schemaAsIs);
    test.equal(shapedSchema, schemaAsIs);
  });

  Tinytest.add('returns a shaped schema when needs it', function(test) {
    const shapedSchema = shapeSchema(testSchema);
    // console.log('SHAPED');
    // console.dir(shapedSchema, {depth: null});
    // validNumber and validString are instances of Match.Where which is a function. can't compare functions directly for equality so taking those out and then comparing them as their strings to for equality
    // maybe there is a better way to test function equality
    const { people, minMaxString, minString, maxString, minMaxNum, minNum, maxNum, minMaxInt, minInt, maxInt, address, regexString, optionalRegexString, optionalRegexStringVariant, arrayOfRegexStrings, arrayOfOptionalMinMaxNum, optionalArrayOfMinMaxInt, minMaxArray, arrayOfRegexStringsWithArrayMinMax, ...rest} = shapedSchema;
    const { people: p, minMaxString: mMS, minString: mnS, maxString: mxS, minMaxNum: mmN, minNum: mnN, maxNum: mxN, minMaxInt: mmI, minInt: mnI, maxInt: mxI, address: addr, regexString: rS, optionalRegexString: oRS, optionalRegexStringVariant: oRSV, arrayOfRegexStrings: aRS, arrayOfOptionalMinMaxNum: aOMMN, optionalArrayOfMinMaxInt: oAMMI, minMaxArray: mmA, arrayOfRegexStringsWithArrayMinMax: aRSWAMM, ...restManual} = testSchemaShapedManual;

    const { state, ...restAddr } = address;
    const { state: sM, ...restAddrM } = addr;

    test.equal(rest, restManual);
    test.equal(restAddr, restAddrM);
    test.equal(people[0].condition.toString(), p[0].condition.toString());
    test.equal(state.condition.toString(), sM.condition.toString());
    test.equal(minMaxString.condition.toString(), mMS.condition.toString());
    test.equal(minString.condition.toString(), mnS.condition.toString());
    test.equal(maxString.condition.toString(), mxS.condition.toString());
    test.equal(minMaxNum.condition.toString(), mmN.condition.toString());
    test.equal(minNum.condition.toString(), mnN.condition.toString());
    test.equal(maxNum.condition.toString(), mxN.condition.toString());
    test.equal(minMaxInt.condition.toString(), mmI.condition.toString());
    test.equal(minInt.condition.toString(), mnI.condition.toString());
    test.equal(maxInt.condition.toString(), mxI.condition.toString());
    test.equal(regexString.condition.toString(), rS.condition.toString());
    test.equal(optionalRegexString.pattern.condition.toString(), oRS.pattern.condition.toString());
    test.equal(optionalRegexStringVariant.pattern.condition.toString(), oRSV.pattern.condition.toString());
    test.equal(arrayOfRegexStrings[0].condition.toString(), aRS[0].condition.toString());
    test.equal(arrayOfOptionalMinMaxNum[0].pattern.condition.toString(), aOMMN[0].pattern.condition.toString());
    test.equal(optionalArrayOfMinMaxInt.pattern[0].condition.toString(), Object.values(oAMMI)[0][0].condition.toString());
    test.equal(minMaxArray.condition.toString(), mmA.condition.toString());
    test.equal(arrayOfRegexStringsWithArrayMinMax.condition.toString(), aRSWAMM.condition.toString());
  });

  Tinytest.add('handles embedded subschema', function(test) {
    const shapedSchema = shapeSchema(personSchema);

    const { homeAddress, billingAddress, ...rest} = shapedSchema;
    const { homeAddress: hA, billingAddress: bA, ...restManual} = personSchemaShapedManual;

    const { state, ...restAddr } = homeAddress;
    const { state: sM, ...restAddrM } = hA;

    const { state: sBilling, ...restBillingAddr } = billingAddress.pattern;
    const { state: sBillingM, ...restBillingAddrM } = bA.pattern;

    test.equal(rest, restManual);
    test.equal(restAddr, restAddrM);
    test.equal(state.condition.toString(), sM.condition.toString());
    test.equal(restBillingAddr.pattern, restBillingAddrM.pattern);
    test.equal(sBilling.condition.toString(), sBillingM.condition.toString());
  });

   Tinytest.add('condition - regex string', function(test) {
    try {
      check(regexDataFail, regexSchema)
    } catch(error) {
      test.isTrue(error)
    }

    try {
      check(regexData, regexSchema)
      test.isTrue(true);
    } catch(error) {
      test.isTrue(error = undefined)
    }
  });

  Tinytest.add('condition - min string', function(test) {
    try {
      check(minDataFail, minSchema)
    } catch(error) {
      test.isTrue(error)
    }

    try {
      check(minData, minSchema)
      test.isTrue(true);
    } catch(error) {
      test.isTrue(error = undefined)
    }
  });

  Tinytest.add('condition - max string', function(test) {
    try {
      check(maxDataFail, maxSchema)
    } catch(error) {
      test.isTrue(error)
    }

    try {
      check(maxData, maxSchema)
      test.isTrue(true);
    } catch(error) {
      test.isTrue(error = undefined)
    }
  });

  Tinytest.add('condition - minMax string', function(test) {
    try {
      check(minMaxDataFailLow, minMaxSchema)
    } catch(error) {
      test.isTrue(error)
    }

    try {
      check(minMaxDataFailHigh, minMaxSchema)
    } catch(error) {
      test.isTrue(error)
    }

    try {
      check(minMaxData, minMaxSchema)
      test.isTrue(true);
    } catch(error) {
      test.isTrue(error = undefined)
    }
  });

  Tinytest.add('condition - allow string', function(test) {
    try {
      check(allowDataFail, allowSchema)
    } catch(error) {
      test.isTrue(error)
    }

    try {
      check(allowData, allowSchema)
      test.isTrue(true);
    } catch(error) {
      test.isTrue(error = undefined)
    }
  });

  Tinytest.add('condition - min num', function(test) {
    try {
      check(minNumDataFail, minNumSchema)
    } catch(error) {
      test.isTrue(error)
    }

    try {
      check(minNumData, minNumSchema)
      test.isTrue(true);
    } catch(error) {
      test.isTrue(error = undefined)
    }
  });

  Tinytest.add('condition - max num', function(test) {
    try {
      check(maxNumDataFail, maxNumSchema)
    } catch(error) {
      test.isTrue(error)
    }

    try {
      check(maxNumData, maxNumSchema)
      test.isTrue(true);
    } catch(error) {
      test.isTrue(error = undefined)
    }
  });

  Tinytest.add('condition - minMax num', function(test) {
    try {
      check(minMaxNumDataFailLow, minMaxNumSchema)
    } catch(error) {
      test.isTrue(error)
    }

    try {
      check(minMaxNumDataFailHigh, minMaxNumSchema)
    } catch(error) {
      test.isTrue(error)
    }

    try {
      check(minMaxNumData, minMaxNumSchema)
      test.isTrue(true);
    } catch(error) {
      test.isTrue(error = undefined)
    }
  });

  Tinytest.add('condition - min int', function(test) {
    try {
      check(minIntDataFail, minIntSchema)
    } catch(error) {
      test.isTrue(error)
    }

    try {
      check(minIntData, minIntSchema)
      test.isTrue(true);
    } catch(error) {
      test.isTrue(error = undefined)
    }
  });

  Tinytest.add('condition - max int', function(test) {
    try {
      check(maxIntDataFail, maxIntSchema)
    } catch(error) {
      test.isTrue(error)
    }

    try {
      check(maxIntData, maxIntSchema)
      test.isTrue(true);
    } catch(error) {
      test.isTrue(error = undefined)
    }
  });

  Tinytest.add('condition - minMax int', function(test) {
    try {
      check(minMaxIntDataFailLow, minMaxIntSchema)
    } catch(error) {
      test.isTrue(error)
    }

    try {
      check(minMaxIntDataFailHigh, minMaxIntSchema)
    } catch(error) {
      test.isTrue(error)
    }

    try {
      check(minMaxIntData, minMaxIntSchema)
      test.isTrue(true);
    } catch(error) {
      test.isTrue(error = undefined)
    }
  });

  Tinytest.add('condition - allow int', function(test) {
    try {
      check(allowIntDataFail, allowIntSchema)
    } catch(error) {
      test.isTrue(error)
    }

    try {
      check(allowIntData, allowIntSchema)
      test.isTrue(true);
    } catch(error) {
      test.isTrue(error = undefined)
    }
  });

  ///////
  Tinytest.add('condition - min decimal', function(test) {
    try {
      check(minDecimalDataFail, minDecimalSchema)
    } catch(error) {
      test.isTrue(error)
    }

    try {
      check(minDecimalData, minDecimalSchema)
      test.isTrue(true);
    } catch(error) {
      test.isTrue(error = undefined)
    }
  });

  Tinytest.add('condition - max decimal', function(test) {
    try {
      check(maxDecimalDataFail, maxDecimalSchema)
    } catch(error) {
      test.isTrue(error)
    }

    try {
      check(maxDecimalData, maxDecimalSchema)
      test.isTrue(true);
    } catch(error) {
      test.isTrue(error = undefined)
    }
  });

  Tinytest.add('condition - minMax decimal', function(test) {
    try {
      check(minMaxDecimalDataFailLow, minMaxDecimalSchema)
    } catch(error) {
      test.isTrue(error)
    }

    try {
      check(minMaxDecimalDataFailHigh, minMaxDecimalSchema)
    } catch(error) {
      test.isTrue(error)
    }

    try {
      check(minMaxDecimalData, minMaxDecimalSchema)
      test.isTrue(true);
    } catch(error) {
      test.isTrue(error = undefined)
    }
  });

  Tinytest.add('condition - allow decimal', function(test) {
    try {
      check(allowDecimalDataFail, allowDecimalSchema)
    } catch(error) {
      test.isTrue(error)
    }

    try {
      check(allowDecimalData, allowDecimalSchema)
      test.isTrue(true);
    } catch(error) {
      test.isTrue(error = undefined)
    }
  });
  ////

  Tinytest.add('condition - min array', function(test) {
    try {
      check(minArrDataFail, minArrSchema)
    } catch(error) {
      test.isTrue(error)
    }

    try {
      check(minArrData, minArrSchema)
      test.isTrue(true);
    } catch(error) {
      test.isTrue(error = undefined)
    }
  });

  Tinytest.add('condition - max array', function(test) {
    try {
      check(maxArrDataFail, maxArrSchema)
    } catch(error) {
      test.isTrue(error)
    }

    try {
      check(maxArrData, maxArrSchema)
      test.isTrue(true);
    } catch(error) {
      test.isTrue(error = undefined)
    }
  });

  Tinytest.add('condition - minMax array', function(test) {
    try {
      check(minMaxArrDataFailLow, minMaxArrSchema)
    } catch(error) {
      test.isTrue(error)
    }

    try {
      check(minMaxArrDataFailHigh, minMaxArrSchema)
    } catch(error) {
      test.isTrue(error)
    }

    try {
      check(minMaxArrData, minMaxArrSchema)
      test.isTrue(true);
    } catch(error) {
      test.isTrue(error = undefined)
    }
  });

  Tinytest.add('condition - unique array', function(test) {
    try {
      check(uniqueArrDataFail, uniqueArrSchema)
    } catch(error) {
      test.isTrue(error)
    }

    try {
      check(uniqueArrData, uniqueArrSchema)
      test.isTrue(true);
    } catch(error) {
      test.isTrue(error = undefined)
    }
  });

  Tinytest.add('condition - allow 2d array', function(test) {

    try {
      check(allowArrDataFail, allowArrSchema)
    } catch(error) {
      test.isTrue(error)
    }

    try {
      check(allowArrData, allowArrSchema)
      test.isTrue(true);
    } catch(error) {
      test.isTrue(error = undefined)
    }
  });

  Tinytest.add('condition - allow array of objects', function(test) {
    try {
      check(allowArrOfObjDataFail, allowArrOfObjSchema)
    } catch(error) {
      test.isTrue(error)
    }

    try {
      check(allowArrOfObjData, allowArrOfObjSchema)
      test.isTrue(true);
    } catch(error) {
      test.isTrue(error = undefined)
    }
  });

  Tinytest.add('condition - allow array of objects variant', function(test) {
    try {
      check(allowArrOfObjVariantDataFail, allowArrOfObjVariantSchema)
    } catch(error) {
      test.isTrue(error)
    }

    try {
      check(allowArrOfObjVariantData, allowArrOfObjVariantSchema)
      test.isTrue(true);
    } catch(error) {
      test.isTrue(error = undefined)
    }
  });

  Tinytest.add('condition - generic array unique', function(test) {
    try {
      check(genericArrUniqueDataFail, genericArrUniqueSchema)
    } catch(error) {
      test.isTrue(error)
    }

    try {
      check(genericArrUniqueData, genericArrUniqueSchema)
      test.isTrue(true);
    } catch(error) {
      test.isTrue(error = undefined)
    }
  });

  Tinytest.add('condition - generic array allow', function(test) {
    try {
      check(genericArrAllowDataFail, genericArrAllowSchema)
    } catch(error) {
      test.isTrue(error)
    }

    try {
      check(genericArrAllowData, genericArrAllowSchema)
      test.isTrue(true);
    } catch(error) {
      test.isTrue(error = undefined)
    }
  });

  Tinytest.add('condition - min object', function(test) {
    try {
      check(minObjDataFail, minObjSchema)
    } catch(error) {
      test.isTrue(error)
    }

    try {
      check(minObjData, minObjSchema)
      test.isTrue(true);
    } catch(error) {
      test.isTrue(error = undefined)
    }
  });

  Tinytest.add('condition - max object', function(test) {
    try {
      check(maxObjDataFail, maxObjSchema)
    } catch(error) {
      test.isTrue(error)
    }

    try {
      check(maxObjData, maxObjSchema)
      test.isTrue(true);
    } catch(error) {
      test.isTrue(error = undefined)
    }
  });

  Tinytest.add('condition - generic object', function(test) {
    try {
      check(genericObjDataFail, genericObjSchema)
    } catch(error) {
      test.isTrue(error)
    }

    try {
      check(genericObjData, genericObjSchema)
      test.isTrue(true);
    } catch(error) {
      test.isTrue(error = undefined)
    }
  });

  Tinytest.add('condition - generic object allow', function(test) {
    try {
      check(genericObjAllowDataFail, genericObjAllowSchema)
    } catch(error) {
      test.isTrue(error)
    }

    try {
      check(genericObjAllowData, genericObjAllowSchema)
      test.isTrue(true);
    } catch(error) {
      test.isTrue(error = undefined)
    }
  });

  Tinytest.add('any', function(test) {
    try {
      check(anyData, anySchema)
      test.isTrue(true);
    } catch(error) {
      test.isTrue(error = undefined)
    }

    try {
      check(anyData, anyVariantSchema)
      test.isTrue(true);
    } catch(error) {
      test.isTrue(error = undefined)
    }
  });

  Tinytest.add('date', function(test) {
    try {
      check(dateDataFail, dateSchema)
    } catch(error) {
      test.isTrue(error)
    }

    try {
      check(dateData, dateSchema)
      test.isTrue(true);
    } catch(error) {
      test.isTrue(error = undefined)
    }
  });

   Tinytest.add('condition - date allow', function(test) {
    try {
      check(allowDateDataFail, allowDateSchema)
    } catch(error) {
      test.isTrue(error)
    }

    try {
      check(allowDateData, allowDateSchema)
      test.isTrue(true);
    } catch(error) {
      test.isTrue(error = undefined)
    }
  });

  Tinytest.add('boolean', function(test) {
    try {
      check(booleanDataFail, booleanSchema)
    } catch(error) {
      test.isTrue(error)
    }

    try {
      check(booleanData, booleanSchema)
      test.isTrue(true);
    } catch(error) {
      test.isTrue(error = undefined)
    }
  });

  Tinytest.add('condition - boolean allow', function(test) {
    try {
      check(booleanAllowDataFail, booleanAllowSchema)
    } catch(error) {
      test.isTrue(error)
    }

    try {
      check(booleanAllowData, booleanAllowSchema)
      test.isTrue(true);
    } catch(error) {
      test.isTrue(error = undefined)
    }
  });

  Tinytest.add('anyOf', function(test) {
    try {
      check(anyOfDataFail, anyOfSchema)
    } catch(error) {
      test.isTrue(error)
    }

    try {
      check(anyOfNumData, anyOfSchema)
    } catch(error) {
      test.isTrue(error)
    }

    try {
      check(anyOfData, anyOfSchema)
      test.isTrue(true);
    } catch(error) {
      test.isTrue(error = undefined)
    }
  });

  Tinytest.add('converts an easy schema to a JSONSchema', function(test) {
    const jsonSchema = createJSONSchema(testSchema);
    // console.log('jsonSchema');
    // console.dir(jsonSchema, {depth: null});
    test.equal(jsonSchema, {
      'bsonType': 'object',
      'properties': {
        '_id': { 'bsonType': 'string' },
        'text': { 'bsonType': 'string' },
        'emails': { 'bsonType': 'array', 'items': { 'bsonType': 'string' } },
        'createdAt': { 'bsonType': 'date' },
        'bool': { 'bsonType': 'bool' },
        'num': { 'bsonType': 'double' },
        'stuff': { 'bsonType': 'object' },
        'int': { 'bsonType': 'int' },
        'minMaxString': { 'bsonType': 'string', 'minLength': 0, 'maxLength': 20 },
        'minString': { 'bsonType': 'string', 'minLength': 2 },
        'maxString': { 'bsonType': 'string', 'maxLength': 5 },
        'minMaxNum': { 'bsonType': 'double', 'minimum': 2.5, 'maximum': 15.5 },
        'minNum': {'bsonType': 'double', 'minimum': 2.5},
        'maxNum': {'bsonType': 'double', 'maximum': 30.2},
        'minMaxInt': { 'bsonType': 'int', 'minimum': 4, 'maximum': 12 },
        'minInt': { 'bsonType': 'int', 'minimum': 10 },
        'maxInt': { 'bsonType': 'int', 'maximum': 1000 },
        'address': {
          'bsonType': 'object',
          'properties': {
            'street_address': { 'bsonType': 'string' },
            'city': { 'bsonType': 'string' },
            'state': { 'bsonType': 'string', 'minLength': 0, 'maxLength': 2 }
          },
          'required': [ 'city', 'state' ],
          'additionalProperties': false
        },
        'people': {
         'bsonType': 'array',
         'items': {
           'bsonType': 'object',
           'properties': {
            'name': { 'bsonType': 'string' },
            'age': { 'bsonType': 'double' },
            'arrayOfOptionalBooleans': { 'bsonType': 'array', 'items': { 'bsonType': 'bool' }, 'minItems': 0 }
           },
           'required': [ 'name', 'age', 'arrayOfOptionalBooleans' ],
           'additionalProperties': true
         }
       },
      'optionalArray': { 'bsonType': 'array', 'items': { 'bsonType': 'string' } },
      'optionalObject': {
        'bsonType': 'object',
        'properties': { 'thing': { 'bsonType': 'string' }, 'optionalString': { 'bsonType': 'string' } },
        'required': [ 'thing' ],
        'additionalProperties': false
        },
       'arrayOfInts': { 'bsonType': 'array', 'items': { 'bsonType': 'int' } },
       'arrayOfOptionalInts': { 'bsonType': 'array', 'items': { 'bsonType': 'int' }, 'minItems': 0 },
       'regexString': { 'bsonType': 'string', 'pattern': /.com$/ },
       'optionalRegexString': { 'bsonType': 'string', 'pattern': /.com$/ },
       'optionalRegexStringVariant': { 'bsonType': 'string', 'pattern': /.com$/ },
       'arrayOfRegexStrings': { 'bsonType': 'array', 'items': { 'bsonType': 'string', 'pattern': /.com$/ } },
       'arrayOfOptionalMinMaxNum': { 'bsonType': 'array', 'items': { 'bsonType': 'double', 'minimum': 1, 'maximum': 4 }, 'minItems': 0 },
       'optionalArrayOfMinMaxInt': { 'bsonType': 'array', 'items': { 'bsonType': 'int', 'minimum': 200, 'maximum': 300 } },
       'minMaxArray': { 'bsonType': 'array', 'items': { 'bsonType': 'string' }, 'minItems': 1, 'maxItems': 3 },
       'arrayOfRegexStringsWithArrayMinMax': { 'bsonType': 'array', 'items': { 'bsonType': 'string', 'pattern': /com$/ }, 'minItems': 1, 'maxItems': 2 },
       'anyOf': {'anyOf': [{ 'bsonType': 'array', 'items': { 'bsonType': 'string' } }, { 'bsonType': 'array', 'items': { 'bsonType': 'date' } }]},
       'arrayAnyOf': { 'bsonType': 'array', 'items': {'anyOf': [{'bsonType': 'string'}, {'bsonType': 'double'}]}},
       'any': {}
      },
      'required': [
       'text',        'emails',
       'createdAt',   'bool',
       'num',         'stuff',
       'int',         'minMaxString',
       'minString',   'maxString',
       'minMaxNum',   'minNum',
       'maxNum',      'minMaxInt',
       'minInt',      'maxInt',
       'address',     'people',
       'arrayOfInts', 'arrayOfOptionalInts',
       'regexString', 'arrayOfRegexStrings',
       'arrayOfOptionalMinMaxNum', 'minMaxArray',
       'arrayOfRegexStringsWithArrayMinMax', 'anyOf',
       'arrayAnyOf', 'any'
      ],
      'additionalProperties': false
    });
  });

  Tinytest.add('correctly shapes schema with type property without allowed condition keywords', function(test) {
    const shapedSchema = shapeSchema(messageSchema);
    test.equal(shapedSchema, messageSchema);
  });

  Tinytest.add('correctly converts easy schema to JSONSchema with type property without allowed condition keywords', function(test) {
    const jsonSchema = createJSONSchema(messageSchema);
    test.equal(jsonSchema, {
      'bsonType': 'object',
      'properties': {
        'title': { 'bsonType': 'string' },
        'text': { 'bsonType': 'string' },
        'titleContent': { 'bsonType': 'string' },
        'textContent': { 'bsonType': 'string' },
        'channel': { 'bsonType': 'string' },
        'organizationId': { 'bsonType': 'string' },
        'isActive': { 'bsonType': 'bool' },
        'mentions': {
          'bsonType': 'array',
          'items': {
            'bsonType': 'object',
            'properties': { 'userId': { 'bsonType': 'string' }, 'isUrgent': { 'bsonType': 'bool' } },
            'required': [ 'userId', 'isUrgent' ],
            'additionalProperties': false
          }
        },
        'urls': { 'bsonType': 'array' },
        'codeBlocks': { 'bsonType': 'array' },
        'uploads': {
          'bsonType': 'array',
          'items': {
            'bsonType': 'object',
            'properties': {
              'name': { 'bsonType': 'string' },
              'url': { 'bsonType': 'string' },
              'type': { 'bsonType': 'string' },
              'uploadId': { 'bsonType': 'string' }
            },
            'required': [ 'name', 'url', 'type', 'uploadId' ],
            'additionalProperties': false
          }
        },
        'scheduledDate': { 'bsonType': 'date' },
        'timestamp': { 'bsonType': 'date' },
        'repliesCount': { 'bsonType': 'int' },
        'participants': { 'bsonType': 'array', 'items': { 'bsonType': 'string' } },
        'followers': { 'bsonType': 'array', 'items': { 'bsonType': 'string' } },
        'subscribers': { 'bsonType': 'array', 'items': { 'bsonType': 'string' } },
        'lastTouched': { 'bsonType': 'date' },
        'readBy': {
          'bsonType': 'array',
          'items': {
            'bsonType': 'object',
            'properties': { 'userId': { 'bsonType': 'string' }, 'timestamp': { 'bsonType': 'date' } },
            'required': [ 'userId', 'timestamp' ],
            'additionalProperties': false
          }
        },
        'authorId': { 'bsonType': 'string' }
      },
      'required': [
        'title',        'text',
        'titleContent', 'textContent',
        'channel',      'organizationId',
        'isActive',     'timestamp',
        'repliesCount', 'participants',
        'followers',    'lastTouched',
        'readBy',       'authorId'
      ],
      'additionalProperties': false
    });
  });
}

