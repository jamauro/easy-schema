import { Tinytest } from 'meteor/tinytest';
import { Mongo } from 'meteor/mongo';
import { Decimal } from 'meteor/mongo-decimal';
import { has, Integer, Double, Any, ID, ObjectID, Optional, AnyOf, check, EasySchema } from 'meteor/jam:easy-schema';
import { shape, meta, Where, _getParams } from './lib/shape.js';
import { isEqual } from './lib/utils/shared';
import { check as c, Match } from 'meteor/check';
import { Random } from 'meteor/random';
import { DDP } from 'meteor/ddp-client';
import { Tracker } from 'meteor/tracker';

const { createJSONSchema } = Meteor.isServer ? require('./lib/attach/server') : {};

const testSchema = {
  _id: Optional(String),
  text: String,
  emails: [String],
  createdAt: Date,
  bool: Boolean,
  num: Number,
  double: Double,
  stuff: Object,
  int: Integer,
  minMaxString: {type: String, min: 0, max: 20},
  minString: {type: String, min: 2},
  maxString: {type: String, max: 5},
  maxStringCustomError: {type: String, max: [5, 'Too long']},
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
  people: [{type: {name: String, age: Number, arrayOfOptionalBooleans: [Optional(Boolean)]}, min: 3}],
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
  any: Any,
  simpleWhere: {type: String, where: value => value === 'simple'},
  dependWhere: {type: String, where: ({text, dependWhere}) => {
    if (text === 'stuff' && !dependWhere) throw 'nope'
  }}
};

const testSchemaSugar = {
  _id: Optional(String),
  text: String,
  emails: [String],
  createdAt: Date,
  bool: Boolean,
  num: Number,
  double: Double,
  stuff: Object,
  int: Integer,
  minMaxString: String[has].min(0).max(20),
  minString: String[has].min(2),
  maxString: String[has].max(5),
  maxStringCustomError: String[has].max([5, 'Too long']),
  minMaxNum: Number[has].min(2.5).max(15.5),
  minNum: Number[has].min(2.5),
  maxNum: Number[has].max(30.2),
  minMaxInt: Integer[has].min(4).max(12),
  minInt: Integer[has].min(10),
  maxInt: Integer[has].max(1000),
  address: {
    street_address: Optional(String),
    city: String,
    state: String[has].min(0).max(2),
  },
  people: [Object[has].only({name: String, age: Number, arrayOfOptionalBooleans: [Optional(Boolean)]}).min(3)],
  optionalArray: Optional([String]),
  optionalObject: Optional({thing: String, optionalString: Optional(String)}),
  arrayOfInts: [Integer],
  arrayOfOptionalInts: [Optional(Integer)],
  regexString: String[has].regex(/.com$/),
  optionalRegexString: Optional(String[has].regex(/.com$/)),
  optionalRegexStringVariant: Optional(String[has].regex(/.com$/)),
  arrayOfRegexStrings: [String[has].regex(/.com$/)],
  arrayOfOptionalMinMaxNum: [Optional(Number[has].min(1).max(4))],
  optionalArrayOfMinMaxInt: Optional([Integer[has].min(200).max(300)]),
  minMaxArray: Array[has].only(String).min(1).max(3),
  arrayOfRegexStringsWithArrayMinMax: Array[has].only(String[has].regex(/com$/)).min(1).max(2),
  anyOf: AnyOf([String], [Date]),
  arrayAnyOf: [AnyOf(String, Number)],
  any: Any,
  simpleWhere: String[has].where(value => value === 'simple'),
  dependWhere: String[has].where(({text, dependWhere}) => {
    if (text === 'stuff' && !dependWhere) throw 'nope'
  })
};

const testSchemaShapedManual = {
  _id: Optional(String),
  text: String,
  emails: [String],
  createdAt: Date,
  bool: Boolean,
  num: Number,
  double: Double,
  stuff: Object,
  int: Integer,
  minMaxString: Where({type: String, min: 0, max: 20}),
  minString: Where({type: String, min: 2}),
  maxString: Where({type: String, max: 5}),
  maxStringCustomError: Where({type: String, max: [5, 'Too long']}),
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
    Where({type: {name: String, age: Number, arrayOfOptionalBooleans: [Optional(Boolean)]}, min: 3})
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
  any: Any,
  simpleWhere: Where({type: String, where: value => value === 'simple'}),
  dependWhere: String,
};
Object.defineProperty(testSchemaShapedManual, meta, {value:
  { rules:  [{path: ['dependWhere'], deps: ['text'], rule: ({text, dependWhere}) => {
      if (text === 'stuff' && !dependWhere) throw 'nope'
    }}]
  }
});

const testSchemaShapedOptionalManual = {
  _id: Optional(String),
  text: Optional(String),
  emails: Optional([Optional(String)]),
  createdAt: Optional(Date),
  bool: Optional(Boolean),
  num: Optional(Number),
  double: Optional(Match.OneOf(Optional(Number), Optional(Integer))),
  stuff: Optional(Object),
  int: Optional(Integer),
  minMaxString: Optional(Where({type: String, min: 0, max: 20})),
  minString: Optional(Where({type: String, min: 2})),
  maxString: Optional(Where({type: String, max: 5})),
  maxStringCustomError: Optional(Where({type: String, max: [5, 'Too long']})),
  minMaxNum: Optional(Where({type: Number, min: 2.5, max: 15.5})),
  minNum: Optional(Where({type: Number, min: 2.5})),
  maxNum: Optional(Where({type: Number, max: 30.2})),
  minMaxInt: Optional(Where({type: Integer, min: 4, max: 12})),
  minInt: Optional(Where({type: Integer, min: 10})),
  maxInt: Optional(Where({type: Integer, max: 1000})),
  address: Optional({
    street_address: Optional(String),
    city: Optional(String),
    state: Optional(Where({type: String, min: 0, max: 2})),
  }),
  people: Optional([
    Optional(Where({type: Optional({name: Optional(String), age: Optional(Number), arrayOfOptionalBooleans: Optional([Optional(Boolean)])}), min: 3}))
  ]),
  optionalArray: Optional([Optional(String)]),
  optionalObject: Optional({thing: Optional(String), optionalString: Optional(String)}),
  arrayOfInts: Optional([Optional(Integer)]),
  arrayOfOptionalInts: Optional([Optional(Integer)]),
  regexString: Optional(Where({type: String, regex: /.com$/})),
  optionalRegexString: Optional(Where({type: String, regex: /.com$/})),
  optionalRegexStringVariant: Optional(Where({type: String, regex: /.com$/})),
  arrayOfRegexStrings: Optional([Optional(Where({type: String, regex: /.com$/}))]),
  arrayOfOptionalMinMaxNum: Optional([Optional(Where({type: Number, min: 1, max: 40}))]),
  optionalArrayOfMinMaxInt: Optional([Optional(Where({type: Integer, min: 200, max: 300}))]),
  minMaxArray: Optional(Where({type: [String], min: 1, max: 3})),
  arrayOfRegexStringsWithArrayMinMax: Optional(Where({type: [String], regex: /.com$/, min: 1, max: 2})),
  anyOf: Optional(AnyOf(Optional([Optional(String)]), Optional([Optional(Date)]))),
  arrayAnyOf: Optional([Optional(AnyOf(Optional(String), Optional(Number)))]),
  any: Optional(Any),
  simpleWhere: Optional(Where({type: String, where: value => value === 'simple'})),
  dependWhere: Optional(String),
};
Object.defineProperty(testSchemaShapedOptionalManual, meta, {value:
  { rules:  [{path: ['dependWhere'], deps: ['text'], rule: ({text, dependWhere}) => {
      if (text === 'stuff' && !dependWhere) throw 'nope'
    }}]
  }
});

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
  anyOf: AnyOf([String], [Date]),
}

const doubleSchema = {
  _id: String,
  num: Double,
  nums: [Double],
  things: [{ a: String, b: Double }],
  stuff: { c: String, d: Double }
};

const addressSchema = {
  street: String,
  city: String,
  state: {type: String, min: 2, max: 2}
};

const personSchema = {
  _id: String,
  name: String,
  homeAddress: addressSchema,
  billingAddress: Optional(addressSchema),
};

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
};

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
};

const typeSchema = {
  _id: String,
  address: {
    type: { something: { type: String, min: 1 }, on: Boolean },
    street: String,
    city: String
  }
};

const typeSchemaShapedManual = {
  _id: String,
  address: {
    type: { something: Where({type: String, min: 1}), on: Boolean },
    street: String,
    city: String
  }
};

// console.log('messageSchema SHAPED');
// console.dir(shape(messageSchema), {depth: null})
// console.log('messageSchema JSONSchema');
// console.dir(createJSONSchema(messageSchema), {depth: null});

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

const regexCustomSchema = {
  _id: Optional(String),
  string: {type: String, regex: [/.com$/, 'Must be .com']}
}
const regexCustomData = {
  _id: '1',
  string: 'test@testmail.com'
}
const regexCustomDataFail = {
  _id: '1',
  string: 'test@testmail'
}

const regexSchemaHas = {
  _id: Optional(String),
  string: String[has].regex(/.com$/)
}

const regexCustomSchemaHas = {
  _id: Optional(String),
  string: String[has].regex(/.com$/, 'Must be .com')
}

// min, max, minmax
const minEmptySchema = {
  _id: Optional(String),
  minString: {type: String, min: 1}
}
const minEmptyData = {
  _id: '1',
  minString: 'a'
}
const minEmptyDataFail = {
  _id: '1',
  minString: ''
}

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

const minMaxCustomSchema = {
  _id: Optional(String),
  minMaxString: {type: String, min: [3, 'Too low'], max: [5, 'Too high']}
}
const minMaxCustomData = {
  _id: '1',
  minMaxString: 'abc'
}
const minMaxCustomDataFailLow = {
  _id: '1',
  minMaxString: 'ab'
}
const minMaxCustomDataFailHigh = {
  _id: '1',
  minMaxString: 'abcdef'
}

const allowSchema = {
  _id: Optional(String),
  allowString: {type: String, enums: ['hi', 'bye']}
}
const allowData = {
  _id: '1',
  allowString: 'hi'
}
const allowDataFail = {
  _id: '1',
  allowString: 'sup'
}

const allowCustomSchema = {
  _id: Optional(String),
  allowString: {type: String, enums: [['hi', 'bye'], 'Must be hi or bye']}
}
const allowCustomData = {
  _id: '1',
  allowString: 'hi'
}
const allowCustomDataFail = {
  _id: '1',
  allowString: 'sup'
}

const minEmptySchemaHas = {
  _id: Optional(String),
  minString: String[has].min(1)
}

const minSchemaHas = {
  _id: Optional(String),
  minString: String[has].min(2)
}

const maxSchemaHas = {
  _id: Optional(String),
  maxString: String[has].max(3)
}

const minMaxSchemaHas = {
  _id: Optional(String),
  minMaxString: String[has].min(3).max(5)
}

const minMaxCustomSchemaHas = {
  _id: Optional(String),
  minMaxString: String[has].min(3, 'Too low').max(5, 'Too high')
}

const allowSchemaHas = {
  _id: Optional(String),
  allowString: String[has].enums(['hi', 'bye'])
}

const allowCustomSchemaHas = {
  _id: Optional(String),
  allowString: String[has].enums(['hi', 'bye'], 'Must be hi or bye')
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

const minNumSchemaHas = {
  _id: Optional(String),
  minNum: Number[has].min(2)
}

const maxNumSchemaHas = {
  _id: Optional(String),
  maxNum: Number[has].max(3)
}

const minMaxNumSchemaHas = {
  _id: Optional(String),
  minMaxNum: Number[has].min(9.5).max(15.5)
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
  int: {type: Integer, enums: [1000, 11]}
}
const allowIntData = {
  _id: '1',
  int: 11
}
const allowIntDataFail = {
  _id: '1',
  int: 1
}

const minIntSchemaHas = {
  _id: Optional(String),
  minInt: Integer[has].min(1000)
}

const maxIntSchemaHas = {
  _id: Optional(String),
  maxInt: Integer[has].max(30)
}

const minMaxIntSchemaHas = {
  _id: Optional(String),
  minMaxInt: Integer[has].min(10).max(15)
}

const allowIntSchemaHas = {
  _id: Optional(String),
  int: Integer[has].enums([1000, 11])
}
///

/// Double ///
const minDoubleSchema = {
  _id: Optional(String),
  minDouble: {type: Double, min: 1000}
}
const minDoubleData = {
  _id: '1',
  minDouble: 1001.1
}
const minDoubleDataFail = {
  _id: '1',
  minDouble: 1
}

const maxDoubleSchema = {
  _id: Optional(String),
  maxDouble: {type: Double, max: 30}
}
const maxDoubleData = {
  _id: '1',
  maxDouble: 29.9
}
const maxDoubleDataFail = {
  _id: '1',
  maxDouble: 31
}

const minMaxDoubleSchema = {
  _id: Optional(String),
  minMaxDouble: {type: Double, min: 10, max: 15}
}
const minMaxDoubleData = {
  _id: '1',
  minMaxDouble: 11.2
}
const minMaxDoubleDataFailLow = {
  _id: '1',
  minMaxDouble: 5
}
const minMaxDoubleDataFailHigh = {
  _id: '1',
  minMaxDouble: 20
}

const allowDoubleSchema = {
  _id: Optional(String),
  double: {type: Double, enums: [1000, 11.1]}
}
const allowDoubleData = {
  _id: '1',
  double: 11.1
}
const allowDoubleDataFail = {
  _id: '1',
  double: 1
}

const minDoubleSchemaHas = {
  _id: Optional(String),
  minDouble: Double[has].min(1000)
}

const maxDoubleSchemaHas = {
  _id: Optional(String),
  maxDouble: Double[has].max(30)
}

const minMaxDoubleSchemaHas = {
  _id: Optional(String),
  minMaxDouble: Double[has].min(10).max(15)
}

const allowDoubleSchemaHas = {
  _id: Optional(String),
  double: Double[has].enums([1000, 11.1])
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
  decimal: {type: Decimal, enums: [Decimal(10.99), Decimal(12.67)]}
}
const allowDecimalData = {
  _id: '1',
  decimal: Decimal(10.99)
}
const allowDecimalDataFail = {
  _id: '1',
  decimal: Decimal(10.991)
}

const minDecimalSchemaHas = {
  _id: Optional(String),
  minDecimal: Decimal[has].min(Decimal(9.234))
}

const maxDecimalSchemaHas = {
  _id: Optional(String),
  maxDecimal: Decimal[has].max(Decimal(20.978))
}

const minMaxDecimalSchemaHas = {
  _id: Optional(String),
  minMaxDecimal: Decimal[has].min(Decimal(10.01)).max(Decimal(15.99))
}

const allowDecimalSchemaHas = {
  _id: Optional(String),
  decimal: Decimal[has].enums([Decimal(10.99), Decimal(12.67)])
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

const uniqueArrCustomSchema = {
  _id: Optional(String),
  uniqueArr: {type: [Number], unique: [true, 'Gotta be unique']}
}
const uniqueArrCustomData = {
  _id: '1',
  uniqueArr: [1, 2]
}
const uniqueArrCustomDataFail = {
  _id: '1',
  uniqueArr: [1, 2, 1]
}

const allowArrSchema = {
  _id: Optional(String),
  allowArr: {type: [[String, Number]], enums: [['hi', 1], ['bye', 2]]}
}
const allowArrData = {
  _id: '1',
  allowArr: ['bye', 2]
}
const allowArrDataFail = {
  _id: '1',
  allowArr: ['hi', 3]
}

const allowArrCustomSchema = {
  _id: Optional(String),
  allowArr: {type: [[String, Number]], enums: [[['hi', 1], ['bye', 2]], 'Nope']}
}
const allowArrCustomData = {
  _id: '1',
  allowArr: ['bye', 2]
}
const allowArrCustomDataFail = {
  _id: '1',
  allowArr: ['hi', 3]
}

const allowArrOfObjSchema = {
  _id: String,
  text: [{type: {thing: String, num: Number}, enums: [{thing: 'hi', num: 2}]}]
}
const allowArrOfObjData = {
  _id: '1',
  text: [{thing: 'hi', num: 2}]
}
const allowArrOfObjDataFail = {
  _id: '1',
  text: [{thing: 'hi', num: 1}]
}

const allowArrOfObjCustomSchema = {
  _id: String,
  text: [{type: {thing: String, num: Number}, enums: [[{thing: 'hi', num: 2}], 'Negative'] }]
}
const allowArrOfObjCustomData = {
  _id: '1',
  text: [{thing: 'hi', num: 2}]
}
const allowArrOfObjCustomDataFail = {
  _id: '1',
  text: [{thing: 'hi', num: 1}]
}

const allowArrOfObjVariantSchema = {
  _id: String,
  text: {type: [{thing: String, num: Number}], enums: [[{thing: 'hi', num: 2}]]}
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
  arr: {type: Array, enums: [['hi'], ['bye']]}
}
const genericArrAllowData = {
  _id: '1',
  arr: ['bye']
}
const genericArrAllowDataFail = {
  _id: '1',
  arr: ['stuff']
}

const minArrSchemaHas = {
  _id: Optional(String),
  minArr: Array[has].only(String).min(2)
}

const maxArrSchemaHas = {
  _id: Optional(String),
  maxArr: Array[has].only(String).max(2)
}

const minMaxArrSchemaHas = {
  _id: Optional(String),
  minMaxArr: Array[has].only(String).min(2).max(4)
}

const uniqueArrSchemaHas = {
  _id: Optional(String),
  uniqueArr: Array[has].only(Number).unique()
}

const uniqueArrCustomSchemaHas = {
  _id: Optional(String),
  uniqueArr: Array[has].only(Number).unique(true, 'Gotta be unique')
}

const allowArrSchemaHas = {
  _id: Optional(String),
  allowArr: Array[has].only([String, Number]).enums([['hi', 1], ['bye', 2]])
}

const allowArrCustomSchemaHas = {
  _id: Optional(String),
  allowArr: Array[has].only([String, Number]).enums([['hi', 1], ['bye', 2]], 'Nope')
}

const allowArrOfObjSchemaHas = {
  _id: String,
  text: Array[has].only({thing: String, num: Number}).enums([[{thing: 'hi', num: 2}]])
}

const allowArrOfObjCustomSchemaHas = {
  _id: String,
  text: Array[has].only({thing: String, num: Number}).enums([[{thing: 'hi', num: 2}]], 'Negative')
}

const genericArrUniqueSchemaHas = {
  _id: Optional(String),
  arr: Array[has].unique()
}

const genericArrAllowSchemaHas = {
  _id: Optional(String),
  arr: Array[has].enums([['hi'], ['bye']])
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
  maxObj: {type: {thing: String, num: Number, ...Any}, max: 3}
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
  obj: {type: Object, enums: [{hi: 'hi', num: 2}]}
}
const genericObjAllowData = {
  _id: '1',
  obj: {hi: 'hi', num: 2}
}
const genericObjAllowDataFail = {
  _id: '1',
  obj: {hi: 'hi', num: 1}
}

const minObjSchemaHas = {
  _id: Optional(String),
  minObj: Object[has].only({thing: String, num: Number}).min(2)
}

const maxObjSchemaHas = {
  _id: Optional(String),
  maxObj: Object[has].only({thing: String, num: Number, ...Any}).max(3)
}

const genericObjSchemaHas = {
  _id: Optional(String),
  obj: Object[has].max(2)
}

const genericObjAllowSchemaHas = {
  _id: Optional(String),
  obj: Object[has].enums([{hi: 'hi', num: 2}])
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
  created: {type: Date, enums: [new Date('1995-12-17T03:24:00'), new Date()]}
}
const allowDateData = {
  _id: '1',
  created: new Date('1995-12-17T03:24:00')
}
const allowDateDataFail = {
  _id: '1',
  created: new Date()
}

const allowDateSchemaHas = {
  _id: Optional(String),
  created: Date[has].enums([new Date('1995-12-17T03:24:00'), new Date()])
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
  private: {type: Boolean, enums: [true]}
}

const booleanAllowData = {
  _id: '1',
  private: true
}

const booleanAllowDataFail = {
  _id: '1',
  private: false
}

const booleanAllowSchemaHas = {
  _id: Optional(String),
  private: Boolean[has].enums([true])
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

/// Object with extra props using ...Any ///
const extraSchema = {
  _id: Optional(String),
  text: String,
  something: {
    stuff: String,
    embed: { more: String, ...Any },
    nice: Object[has].only({ b: String, ...Any }).max(2), //{ type: { b: String, ...Any }, max: 2 },
    ...Any
  },
  things: [{ yo: String, ...Any }],
  ...Any
};

const extraDataFail = {
  _id: '1',
  text: 'hi',
  something: { stuff: 'hi', embed: { more: '1', mas: '2', c: 'c' }, nice: { b: 'b', c: 'c', d: 'd' }, anything: 'anything' },
  things: [{ yo: 'yo', sup: 'sup' }],
  howdy: 'howdy',
  hello: [{ s: 's', t: 't' }]
};

const extraData = {
  _id: '1',
  text: 'hi',
  something: { stuff: 'hi', embed: { more: '1', mas: '2' }, nice: { b: 'b', c: 'c' }, hi: 'hi' },
  things: [{ yo: 'yo', sup: 'sup' }],
  howdy: 'howdy',
  hello: [{ s: 's', t: 't' }]
}
///

/// Where ///
// simple
const whereSchema = {
  _id: Optional(String),
  string: {type: String, where: value => {
    return value === 'stuff'
  }}
}
const whereData = {
  _id: '1',
  string: 'stuff'
}
const whereDataFail = {
  _id: '1',
  string: 'hi'
}

const whereSchemaHas = {
  _id: Optional(String),
  string: String[has].where(value => {
    return value === 'stuff'
  })
}

// dependencies
const dependentWhereSchema = {
  _id: Optional(String),
  password: String,
  confirmPassword: {type: String, where: ({password, confirmPassword}) => {
    if (confirmPassword !== password) throw 'passwords must match'
  }}
}
const dependentWhereData = {
  _id: '1',
  password: 'test123',
  confirmPassword: 'test123'
}
const dependentWhereDataFail = {
  _id: '1',
  password: 'test123',
  confirmPassword: 'fail'
}

const dependentWhereSchemaHas = {
  _id: Optional(String),
  password: String,
  confirmPassword: String[has].where(({password, confirmPassword}) => {
    if (confirmPassword !== password) throw 'passwords must match'
  })
}

const requiredDependentSchema = {
  _id: Optional(String),
  sibling: Optional(String),
  thing: {type: Optional(String), where: ({sibling, thing}) => {
    if (sibling && !thing) throw EasySchema.REQUIRED
  }}
}
const requiredDependentData = {
  _id: '1'
}

const requiredDependentData2 = {
  _id: '1',
  thing: 'hi'
}

const requiredDependentData3 = {
  _id: '1',
  sibling: 'test',
  thing: 'hi'
}

const requiredDependentDataFail = {
  _id: '1',
  sibling: 'test'
}

const requiredDependentDataFail2 = {
  _id: '1',
  thing: false
}

// nested dependencies
const address = {
  street: String,
  city: String,
  state: {
    full: String,
    code: {type: String, where: ({full}) => { if (full !== 'Texas') throw 'nope' }}
  }
}

const nestedSchema = {
  _id: String,
  name: String,
  homeAddress: address,
  billingAddress: Optional(address),
  stuff: String,
  another: [{name: String, age: Number, foo: {type: String, where: ({age}) => {if (age > 40) throw 'old'}}}]
}


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

const Notes = new Mongo.Collection('notes', { idGeneration: 'MONGO' });
const notesSchema = {
  _id: ObjectID,
  text: String,
  stuff: { type: String, min: 2, where: stuff => { if (stuff !== 'hi') throw 'stuff must be hi' }},
  something: Optional(String),
  anotherSomething: {type: Optional(String), where: ({ something, anotherSomething }) => {
    if (something !== anotherSomething) throw 'somethings must match'
  }}
};
Notes.attachSchema(notesSchema)

const insertNote = async ({ text, stuff }) => Notes.insertAsync({ text, stuff });
const updateNote = async ({ _id, text, stuff, something, anotherSomething }) => Notes.updateAsync({ _id }, { $set: { stuff, text, something, anotherSomething }});
Meteor.methods({ insertNote, updateNote });

const userId = "Es4wRRECowhw8zh2e";
const user = { _id: userId, username: 'bob' }
Meteor.userId = () => userId;
Meteor.user = () => user;

const Dogs = new Mongo.Collection('dogs');
const dogsSchema = {
  _id: ID,
  breed: Optional({ type: String, default: 'Westie' }),
  creatorId: { type: ID, default: Meteor.userId },
  username: { type: String, default: Meteor.userAsync },
  updaterId: { type: ID, default: () => Meteor.userId() },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: () => new Date() },
  num: { type: Integer, default: 0 },
  embed: { thing: { type: String, default: 'thing' }, updatedAt: { type: Date, default: () => new Date() }},
  greeting: Optional(String),
  anotherNum: Optional(Integer)
};
Dogs.attachSchema(dogsSchema);

if (Meteor.isServer) {
  Meteor.publish('dogs', function() {
    return Dogs.find({})
  });
}

const insertUser = async () => Meteor.users.insertAsync(user);
const removeUsers = async () => Meteor.users.removeAsync({ _id: userId });

async function insertDog({ breed } = {}) {
  this.userId = userId; // mock userId
  return Dogs.insertAsync({ ...(breed && { breed }) });
}

async function updateDog({ _id, breed }, inc = false) {
  this.userId = userId; // mock userId
  return Dogs.updateAsync({ _id }, { ...(breed && {$set: { breed }}), ...(inc && {$inc: {num: 1}})});
}

async function replaceDog({_id, ...rest}) {
  this.userId = userId; // mock userId
  const { embed, ...r } = rest;
  return Dogs.updateAsync({ _id }, {$set: {...r, 'embed.thing': embed.thing, 'embed.updatedAt': embed.updatedAt }})
}

async function upsertDog(_id, modifier) {
  this.userId = userId; // mock userId
  return Dogs.upsertAsync({ _id }, modifier);
}

const resetDogs = async () => Dogs.removeAsync({});

Meteor.methods({ insertDog, updateDog, replaceDog, upsertDog, resetDogs, insertUser, removeUsers });

const Cars = new Mongo.Collection('cars');
const carsSchema = {
  _id: ID,
  make: String,
};
Cars.attachSchema(carsSchema)

const insertCar = async (doc, options) => Cars.insertAsync(doc, options);

Meteor.methods({ insertCar });

const sampleSchema = {
  name: String,
  age: Integer,
  email: Optional(String),
  address: {
    street: String,
    city: String,
    zip: Optional(Number),
  },
  tags: Optional([String]),
};

const certificateSchema = {
  _id: Optional(String),
  x509Fields: {
    commonName: String,
    _versionSetOnInsert: String[has].default("1.0.0"),
    _versionSetOnUpdate: String[has].default(() => "1.0.0"),
  }
}

const certificateCollection = new Mongo.Collection('certificates');
certificateCollection.attachSchema(certificateSchema);

const insertCertificate = async () => {
  return await certificateCollection.insertAsync({
    x509Fields: {
      commonName: 'with-insert'
    }
  });
}

const updateCertificate = async () => {
  return await certificateCollection.updateAsync({
    _id: Random.id(),
  }, {
    $set: {
      x509Fields: {
        commonName: 'with-update'
      }
    }
  })
}

const updateCertificateDotNotation = async () => {
  return await certificateCollection.updateAsync(
    { _id: Random.id() },
    { $set: { "x509Fields.commonName": "something-new" }
  });
}

const upsertCertificate = async () => {
  return await certificateCollection.upsertAsync({
    _id: Random.id(),
  }, {
    $set: {
      x509Fields: {
        commonName: 'with-upsert'
      }
    }
  })
}

Meteor.methods({ insertCertificate, updateCertificate, updateCertificateDotNotation, upsertCertificate });

Tinytest.addAsync('check - manual against collection schema', async (test) => {
  try {
    const schema = Things.schema;

    check({num: 1}, schema)

    test.isTrue(true)
  } catch (error) {
    test.equal(error, undefined);
  }
});

Tinytest.addAsync('check - manual against collection schema with modifier', async (test) => {
  try {
    const schema = Things.schema;

    check({$set: {num: 1}}, schema);

    test.isTrue(true)
  } catch (error) {
    test.equal(error, undefined);
  }
});

Tinytest.addAsync('check - manual full: true', async (test) => {
  try {
    check(thingData, Things.schema, { full: true })
    test.isTrue(true)
  } catch (error) {
    test.equal(error, undefined);
  }
});

Tinytest.addAsync('check - manual full: true, fails as expected', async (test) => {
  try {
    const { num, ...data } = thingData;
    check(data, Things.schema, { full: true })
    test.isTrue(Meteor.isClient) // should fail on the server
  } catch (error) {
    test.isTrue(error);
  }
});

Tinytest.addAsync('check - valid', async (test) => {
  try {
    check({ name: 'John', age: 30, email: 'john@example.com', address: { street: 'Main St', city: 'NY' } }, sampleSchema);
    test.ok(true, 'Valid data should pass without errors');
  } catch (e) {
    test.fail('Valid data should not throw an error');
  }
});

Tinytest.addAsync('check - missing required field', async (test) => {
  try {
    check({ age: 30 }, sampleSchema);
    test.fail('Missing required field should throw an error');
  } catch (e) {
    test.ok(true, 'Error thrown as expected');
  }
});

Tinytest.addAsync('check - invalid type', async (test) => {
  try {
    check({ name: 'John', age: 'thirty' }, sampleSchema);
    test.fail('Invalid type should throw an error');
  } catch (e) {
    test.ok(true, 'Error thrown as expected');
  }
});

Tinytest.addAsync('check - optional field', async (test) => {
  try {
    check({ name: 'John', age: 30, address: { street: 'Main St', city: 'NY' } }, sampleSchema);
    test.ok(true, 'Optional field missing should not cause an error');
  } catch (e) {
    test.fail('Optional field missing should not throw an error');
  }
});

Tinytest.addAsync('check - extra fields ignored', async (test) => {
  try {
    const schema = {...sampleSchema, ...Any};
    check({ name: 'John', age: 30, email: 'john@example.com', extra: 'extra', address: { street: 'Main St', city: 'NY' } }, schema);
    test.ok(true, 'Extra fields should not cause an error');
  } catch (e) {
    test.fail('Extra fields should be ignored if not explicitly checked');
  }
});

Tinytest.addAsync('check - deeply nested object', async (test) => {
  try {
    check({ name: 'John', age: 30, address: { street: 123, city: 'NY' } }, sampleSchema);
    test.fail('Invalid nested field type should throw an error');
  } catch (e) {
    test.ok(true, 'Error thrown for invalid nested field type');
  }
});

Tinytest.addAsync('check - array', async (test) => {
  try {
    check({ name: 'John', age: 30, address: { street: 'Main St', city: 'NY' }, tags: ['tag1', 'tag2'] }, sampleSchema);
    test.ok(true, 'Valid array should pass');
  } catch (e) {
    test.fail('Valid array should not throw an error');
  }

  try {
    check({ name: 'John', age: 30, address: { street: 'Main St', city: 'NY' }, tags: ['tag1', 123] }, sampleSchema);
    test.fail('Invalid array element type should throw an error');
  } catch (e) {
    test.ok(true, 'Error thrown for invalid array element type');
  }
});

Tinytest.addAsync('check - full: true with missing _id', async (test) => {
  try {
    check({ name: 'John', age: 30, address: { street: 'Main St', city: 'NY' } }, sampleSchema, { full: true });
    test.ok(true, '_id should be optional in full mode');
  } catch (e) {
    test.fail('_id should not be required in full mode');
  }
});

Tinytest.addAsync('check - completely invalid data', async (test) => {
  try {
    check(null, sampleSchema);
    test.fail('Null should throw an error');
  } catch (e) {
    test.ok(true, 'Error thrown for null data');
  }
});


Tinytest.addAsync('defaults - insert - basic', async (test) => {
   try {
    await Meteor.callAsync('removeUsers')
    await Meteor.callAsync('insertUser');
    await Meteor.callAsync('resetDogs');

    let sub;

    if (Meteor.isClient) {
      Tracker.autorun(c => {
        sub = Meteor.subscribe('dogs')
      })
    }

    const _id = await Meteor.callAsync('insertDog');
    const doc = await Dogs.findOneAsync({ _id });

    test.equal(doc.breed, 'Westie');
    test.equal(doc.creatorId, userId);
    test.equal(doc.updaterId, userId);
    test.equal(doc.username, 'bob');
    test.isTrue(!isNaN(new Date(doc.createdAt)))
    test.isTrue(!isNaN(new Date(doc.updatedAt)))

    if (Meteor.isServer) {
      test.equal(doc.embed.thing, 'thing');
      test.isTrue(!isNaN(new Date(doc.embed.updatedAt)))
    }

    sub?.stop();
  } catch(error) {
    test.isTrue(error = undefined);
  }
});


Tinytest.addAsync('defaults - insert - with value', async (test) => {
   try {
    await Meteor.callAsync('removeUsers')
    await Meteor.callAsync('insertUser')
    await Meteor.callAsync('resetDogs');

    let sub;

    if (Meteor.isClient) {
      Tracker.autorun(c => {
        sub = Meteor.subscribe('dogs')
      })
    }

    const _id = await Meteor.callAsync('insertDog', { breed: 'Norwich' });
    const doc = await Dogs.findOneAsync({ _id });

    test.equal(doc.breed, 'Norwich');
    test.equal(doc.creatorId, userId);
    test.equal(doc.updaterId, userId);
    test.equal(doc.username, 'bob');
    test.isTrue(!isNaN(new Date(doc.createdAt)))
    test.isTrue(!isNaN(new Date(doc.updatedAt)))

    if (Meteor.isServer) {
      test.equal(doc.embed.thing, 'thing');
      test.isTrue(!isNaN(new Date(doc.embed.updatedAt)))
    }

    sub?.stop();
  } catch(error) {
    test.isTrue(error = undefined);
  }
});

Tinytest.addAsync('defaults - update - basic', async (test) => {
   try {
    await Meteor.callAsync('removeUsers')
    await Meteor.callAsync('insertUser')
    await Meteor.callAsync('resetDogs');

    let sub;

    if (Meteor.isClient) {
      Tracker.autorun(c => {
        sub = Meteor.subscribe('dogs')
      })
    }

    const _id = await Meteor.callAsync('insertDog');
    await Meteor.callAsync('updateDog', { _id, breed: 'Lab' })
    const doc = await Dogs.findOneAsync({ _id });

    test.equal(doc.breed, 'Lab');
    test.equal(doc.creatorId, userId);
    test.equal(doc.updaterId, userId);
    test.equal(doc.username, 'bob');
    test.isTrue(!isNaN(new Date(doc.createdAt)));
    test.isTrue(!isNaN(new Date(doc.updatedAt)));
    test.isTrue(doc.createdAt !== doc.updatedAt);

    if (Meteor.isServer) {
      test.equal(doc.embed.thing, 'thing');
      test.isTrue(!isNaN(new Date(doc.embed.updatedAt)))
    }

    sub?.stop();
  } catch(error) {
    test.isTrue(error = undefined);
  }
});

Tinytest.addAsync('defaults - update - with another operator', async (test) => {
   try {
    await Meteor.callAsync('removeUsers')
    await Meteor.callAsync('insertUser')
    await Meteor.callAsync('resetDogs');

    let sub;

    if (Meteor.isClient) {
      Tracker.autorun(c => {
        sub = Meteor.subscribe('dogs')
      })
    }

    const _id = await Meteor.callAsync('insertDog');
    await Meteor.callAsync('updateDog', { _id, breed: 'Lab' }, true);
    const doc = await Dogs.findOneAsync({ _id });

    test.equal(doc.breed, 'Lab');
    test.equal(doc.creatorId, userId);
    test.equal(doc.updaterId, userId);
    test.equal(doc.username, 'bob');
    test.isTrue(!isNaN(new Date(doc.createdAt)));
    test.isTrue(!isNaN(new Date(doc.updatedAt)));
    test.isTrue(doc.createdAt !== doc.updatedAt);
    test.equal(doc.num, 1);

    if (Meteor.isServer) {
      test.equal(doc.embed.thing, 'thing');
      test.isTrue(!isNaN(new Date(doc.embed.updatedAt)))
    }

    sub?.stop();
  } catch(error) {
    test.isTrue(error = undefined);
  }
});

Tinytest.addAsync('defaults - update - without set', async (test) => {
   try {
    await Meteor.callAsync('removeUsers')
    await Meteor.callAsync('insertUser')
    await Meteor.callAsync('resetDogs');

    let sub;

    if (Meteor.isClient) {
      Tracker.autorun(c => {
        sub = Meteor.subscribe('dogs')
      })
    }

    const _id = await Meteor.callAsync('insertDog');
    await Meteor.callAsync('updateDog', { _id }, true);
    const doc = await Dogs.findOneAsync({ _id });

    test.equal(doc.breed, 'Westie');
    test.equal(doc.creatorId, userId);
    test.equal(doc.updaterId, userId);
    test.equal(doc.username, 'bob');
    test.isTrue(!isNaN(new Date(doc.createdAt)));
    test.isTrue(!isNaN(new Date(doc.updatedAt)));
    test.isTrue(doc.createdAt !== doc.updatedAt);
    test.equal(doc.num, 1);

    if (Meteor.isServer) {
      test.equal(doc.embed.thing, 'thing');
      test.isTrue(!isNaN(new Date(doc.embed.updatedAt)))
    }

    sub?.stop();
  } catch(error) {
    test.isTrue(error = undefined);
  }
});

Tinytest.addAsync('defaults - replace - basic', async (test) => {
   try {
    await Meteor.callAsync('removeUsers')
    await Meteor.callAsync('insertUser')
    await Meteor.callAsync('resetDogs');

    let sub;

    if (Meteor.isClient) {
      Tracker.autorun(c => {
        sub = Meteor.subscribe('dogs')
      })
    }

    const _id = await Meteor.callAsync('insertDog');
    await Meteor.callAsync('replaceDog', { _id, breed: 'Norwich', num: 20, creatorId: userId, username: 'bob', createdAt: new Date(), embed: {thing: 'hi', updatedAt: new Date()} });
    const doc = await Dogs.findOneAsync({ _id });

    test.equal(doc.breed, 'Norwich');
    test.equal(doc.creatorId, userId);
    test.equal(doc.updaterId, userId);
    test.equal(doc.username, 'bob');
    test.isTrue(!isNaN(new Date(doc.createdAt)));
    test.isTrue(!isNaN(new Date(doc.updatedAt)));
    test.isTrue(doc.createdAt !== doc.updatedAt);
    test.equal(doc.num, 20);

    if (Meteor.isServer) {
      test.equal(doc.embed.thing, 'hi');
      test.isTrue(!isNaN(new Date(doc.embed.updatedAt)));
    }

    sub?.stop();
  } catch(error) {
    test.isTrue(error = undefined);
  }
});

Tinytest.addAsync('defaults - upsert - basic', async (test) => {
   try {
    await Meteor.callAsync('removeUsers')
    await Meteor.callAsync('insertUser')
    await Meteor.callAsync('resetDogs');

    let sub;

    if (Meteor.isClient) {
      Tracker.autorun(c => {
        sub = Meteor.subscribe('dogs')
      })
    }

    const _id = await Meteor.callAsync('insertDog');
    await Meteor.callAsync('upsertDog', _id, { $set: {breed: 'Lab'}});
    const doc = await Dogs.findOneAsync({ _id });

    test.equal(doc.breed, 'Lab');
    test.equal(doc.creatorId, userId);
    test.equal(doc.updaterId, userId);
    test.equal(doc.username, 'bob');
    test.isTrue(!isNaN(new Date(doc.createdAt)));
    test.isTrue(!isNaN(new Date(doc.updatedAt)));
    test.isTrue(doc.createdAt !== doc.updatedAt);

    if (Meteor.isServer) {
      test.equal(doc.embed.thing, 'thing');
      test.isTrue(!isNaN(new Date(doc.embed.updatedAt)))
    }

    sub?.stop();
  } catch(error) {
    test.isTrue(error = undefined);
  }
});

Tinytest.addAsync('defaults - upsert - setOnInsert', async (test) => {
   try {
    await Meteor.callAsync('removeUsers')
    await Meteor.callAsync('insertUser')
    await Meteor.callAsync('resetDogs');

    let sub;

    if (Meteor.isClient) {
      Tracker.autorun(c => {
        sub = Meteor.subscribe('dogs')
      })
    }

    const _id = Random.id();
    await Meteor.callAsync('upsertDog', _id, {$setOnInsert: { breed: 'Lab' }});
    const doc = await Dogs.findOneAsync({ _id });

    test.equal(doc.breed, 'Lab');
    test.equal(doc.creatorId, userId);
    test.equal(doc.updaterId, userId);
    test.equal(doc.username, 'bob');
    test.isTrue(!isNaN(new Date(doc.createdAt)));
    test.isTrue(!isNaN(new Date(doc.updatedAt)));
    test.isTrue(doc.createdAt !== doc.updatedAt);

    if (Meteor.isServer) {
      test.equal(doc.embed.thing, 'thing');
      test.isTrue(!isNaN(new Date(doc.embed.updatedAt)))
    }

    sub?.stop();
  } catch(error) {
    test.isTrue(error = undefined);
  }
});


Tinytest.addAsync('defaults - upsert - setOnInsert and set', async (test) => {
   try {
    await Meteor.callAsync('removeUsers')
    await Meteor.callAsync('insertUser')
    await Meteor.callAsync('resetDogs');

    let sub;

    if (Meteor.isClient) {
      Tracker.autorun(c => {
        sub = Meteor.subscribe('dogs')
      })
    }

    const _id = Random.id();
    await Meteor.callAsync('upsertDog', _id, {$setOnInsert: { breed: 'Lab' }, $set: { num: 5 }});
    const doc = await Dogs.findOneAsync({ _id });

    test.equal(doc.breed, 'Lab');
    test.equal(doc.creatorId, userId);
    test.equal(doc.updaterId, userId);
    test.equal(doc.username, 'bob');
    test.isTrue(!isNaN(new Date(doc.createdAt)));
    test.isTrue(!isNaN(new Date(doc.updatedAt)));
    test.isTrue(doc.createdAt !== doc.updatedAt);
    test.equal(doc.num, 5);

    if (Meteor.isServer) {
      test.equal(doc.embed.thing, 'thing');
      test.isTrue(!isNaN(new Date(doc.embed.updatedAt)))
    }

    sub?.stop()
  } catch(error) {
    test.isTrue(error = undefined);
  }
});

Tinytest.addAsync('defaults - upsert - setOnInsert, set, and another operator', async (test) => {
   try {
    await Meteor.callAsync('removeUsers')
    await Meteor.callAsync('insertUser')
    await Meteor.callAsync('resetDogs');

    let sub;

    if (Meteor.isClient) {
      Tracker.autorun(c => {
        sub = Meteor.subscribe('dogs')
      })
    }

    const _id = Random.id();
    await Meteor.callAsync('upsertDog', _id, {$setOnInsert: { breed: 'Lab' }, $set: { greeting: 'sup' }, $inc: { anotherNum: 1 }});
    const doc = await Dogs.findOneAsync({ _id });

    test.equal(doc.breed, 'Lab');
    test.equal(doc.creatorId, userId);
    test.equal(doc.updaterId, userId);
    test.equal(doc.username, 'bob');
    test.isTrue(!isNaN(new Date(doc.createdAt)));
    test.isTrue(!isNaN(new Date(doc.updatedAt)));
    test.isTrue(doc.createdAt !== doc.updatedAt);
    test.equal(doc.anotherNum, 1);
    test.equal(doc.greeting, 'sup');

    if (Meteor.isServer) {
      test.equal(doc.embed.thing, 'thing');
      test.isTrue(!isNaN(new Date(doc.embed.updatedAt)))
    }

    sub?.stop();
  } catch(error) {
    test.isTrue(error = undefined);
  }
});

Tinytest.addAsync('insert - ID validates successfully', async (test) => {
   try {
    await Meteor.callAsync('insertCar', { make: 'Toyota' });
    test.isTrue(true);
  } catch(error) {
    test.isTrue(error = undefined);
  }
});

Tinytest.addAsync('insert - field with numbers', async (test) => {
  try {
    await Meteor.callAsync("insertCertificate");
    test.isTrue(true);
  } catch (e) {
    test.isTrue(e = undefined);
  }
});

if (Meteor.isServer) {
  Tinytest.addAsync('autoCheck: false', async (test) => {
     try {
      await Meteor.callAsync('insertCar', { make: 2 }, { autoCheck: false });
    } catch(error) {
      test.equal(String(error), 'MongoServerError: Document failed validation')
    }
  });

  if (!Meteor.isFibersDisabled) { // simple test for Meteor 2.x apps that are in the process of migrating to 3.0
    Tinytest.add('insert - fibers - validates successfully against server ', (test) => {
      try {
        const result = Things.insert(thingData);
        test.isTrue(true)
      } catch(error) {
        test.isTrue(error = undefined);
      }
    });
  }

  let thingId;
  Tinytest.addAsync('insert - validates successfully against server ', async (test) => {
     try {
      await Things.removeAsync({});
      thingId = await Things.insertAsync(thingData);
      test.isTrue(true)
    } catch(error) {
      test.isTrue(error = undefined);
    }
  });

  Tinytest.addAsync('insert - preset _id validates successfully against server ', async (test) => {
     try {
      await Things.removeAsync({});
      thingId = await Things.insertAsync({...thingData, _id: '1'});
      test.isTrue(true)
    } catch(error) {
      test.isTrue(error = undefined);
    }
  });

  Tinytest.addAsync('update - $set embedded array of objects with positional $', async (test) => {
     try {
      await Things.updateAsync({'readBy.userId': '3'}, {$set: {'readBy.$.userId': '4', numOrInt: 25}}); //, numOrInt: 14.1, decimal: Decimal(486394763.2)
      test.isTrue(true)
    } catch(error) {
      test.isTrue(error = undefined);
    }
  });

  Tinytest.addAsync('update - $set embedded array of objects with positional $[]', async (test) => {
     try {
      await Things.updateAsync({'readBy.userId': '2'}, {$set: {'readBy.$[].userId': '20', numOrInt: 25}}); //, numOrInt: 14.1, decimal: Decimal(486394763.2)
      test.isTrue(true)
    } catch(error) {
      test.isTrue(error = undefined);
    }
  });

  Tinytest.addAsync('update - $set and $inc', async (test) => {
     try {
      await Things.updateAsync(thingId, {$set: {numOrInt: 14.1}, $inc: {int: 11}}); // decimal: Decimal(4.863947632)
      test.isTrue(true)
    } catch(error) {
      test.isTrue(error = undefined);
    }
  });

  Tinytest.addAsync('update - $set embedded object', async (test) => {
     try {
      await Things.updateAsync(thingId, {$set: {'obj.different': 'another'}});
      test.isTrue(true)
    } catch(error) {
      test.isTrue(error = undefined);
    }
  });

  Tinytest.addAsync('update - $set array', async (test) => {
     try {
      await Things.updateAsync(thingId, {$set: {arrOfInts: [2.2, 4.3]}});
      test.isTrue(true)
    } catch(error) {
      test.isTrue(error = undefined);
    }
  });

  Tinytest.addAsync('update - $set array with positional $', async (test) => {
     try {
      await Things.updateAsync({_id: thingId, arrOfInts: 4.3}, {$set: {'arrOfInts.$': 5}});
      test.isTrue(true)
    } catch(error) {
      test.isTrue(error = undefined);
    }
  });

  Tinytest.addAsync('update - $set array with all positional $[]', async (test) => {
     try {
      await Things.updateAsync({_id: thingId}, {$inc: {'arrOfInts.$[]': 10}});
      test.isTrue(true)
    } catch(error) {
      test.isTrue(error = undefined);
    }
  });

  Tinytest.addAsync('update - $set blackboxArray', async (test) => {
     try {
      await Things.updateAsync(thingId, {$set: {blackboxArray: ['a', 'b']}});
      test.isTrue(true)
    } catch(error) {
      test.isTrue(error = undefined);
    }
  });

  Tinytest.addAsync('update - $set blackbox object', async (test) => {
     try {
      await Things.updateAsync(thingId, {$set: {blackbox: {hello: 'hello'}}});
      test.isTrue(true)
    } catch(error) {
      test.isTrue(error = undefined);
    }
  });

  Tinytest.addAsync('update - $addToSet', async (test) => {
     try {
      await Things.updateAsync(thingId, {$addToSet: {readBy: {userId: '100', lastRead: new Date()}}});
      test.isTrue(true)
    } catch(error) {
      test.isTrue(error = undefined);
    }
  });

  Tinytest.addAsync('update - $addToSet $each', async (test) => {
     try {
      await Things.updateAsync(thingId, {$addToSet: {arr: {$each: ['4', '5']}}});
      test.isTrue(true)
    } catch(error) {
      test.isTrue(error = undefined);
    }
  });

  Tinytest.addAsync('update - $push', async (test) => {
     try {
      await Things.updateAsync(thingId, {$push: {readBy: {userId: '100', lastRead: new Date()}}});
      test.isTrue(true)
    } catch(error) {
      test.isTrue(error = undefined);
    }
  });

  Tinytest.addAsync('update - $push $each', async (test) => {
     try {
      await Things.updateAsync(thingId, {$push: {arr: {$each: ['6', '7']}}});
      test.isTrue(true)
    } catch(error) {
      test.isTrue(error = undefined);
    }
  });

  Tinytest.addAsync('update - $currentDate', async (test) => {
     try {
      await Things.updateAsync(thingId, {$currentDate: {created: true}});
      test.isTrue(true)
    } catch(error) {
      test.isTrue(error = undefined);
    }
  });

  Tinytest.addAsync('update - $bit', async (test) => {
     try {
      await Things.updateAsync(thingId, {$set: {int: 13}});
      await Things.updateAsync(thingId, {$bit: {int: {and: 10}}});
      test.isTrue(true)
    } catch(error) {
      test.isTrue(error = undefined);
    }
  });

  Tinytest.addAsync('update - field with numbers', async (test) => {
    try {
      await Meteor.callAsync('updateCertificate');
      test.isTrue(true);
    } catch (e) {
      test.isTrue(e = undefined);
    }
  });
  Tinytest.addAsync('update - field with numbers and dot notation', async (test) => {
    try {
      await Meteor.callAsync('updateCertificateDotNotation');
      test.isTrue(true);
    } catch (e) {
      test.isTrue(e = undefined);
    }
  });

  Tinytest.addAsync('upsert - {upsert: true} validates successfully against server', async (test) => {
     try {
      await Things.updateAsync({num: 1.4},
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

  Tinytest.addAsync('upsert - validates successfully against server', async (test) => {
     try {
      await Things.upsertAsync({num: 1.5},
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

  Tinytest.addAsync('upsert - shorthand _id validates successfully against server', async (test) => {
    const { _id } = await Things.findOneAsync();

     try {
      await Things.upsertAsync(_id,
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

  Tinytest.addAsync('upsert - field with numbers', async (test) => {
    try {
      await Meteor.callAsync('upsertCertificate');
      test.isTrue(true);
    } catch (e) {
      test.isTrue(e = undefined);
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
    const shapedSchema = shape(schemaAsIs);
    test.equal(shapedSchema, schemaAsIs);
  });

  Tinytest.add('returns a shaped schema when needs it', function(test) {
    const shapedSchema = shape(testSchema);

    // validNumber and validString are instances of Match.Where which is a function. can't compare functions directly for equality so taking those out and then comparing them as their strings to for equality
    // maybe there is a better way to test function equality
    const { people, minMaxString, minString, maxString, maxStringCustomError, minMaxNum, minNum, maxNum, minMaxInt, minInt, maxInt, address, regexString, optionalRegexString, optionalRegexStringVariant, arrayOfRegexStrings, arrayOfOptionalMinMaxNum, optionalArrayOfMinMaxInt, minMaxArray, arrayOfRegexStringsWithArrayMinMax, simpleWhere, dependWhere, ...rest} = shapedSchema;
    const { people: p, minMaxString: mMS, minString: mnS, maxString: mxS, maxStringCustomError: mxSCE, minMaxNum: mmN, minNum: mnN, maxNum: mxN, minMaxInt: mmI, minInt: mnI, maxInt: mxI, address: addr, regexString: rS, optionalRegexString: oRS, optionalRegexStringVariant: oRSV, arrayOfRegexStrings: aRS, arrayOfOptionalMinMaxNum: aOMMN, optionalArrayOfMinMaxInt: oAMMI, minMaxArray: mmA, arrayOfRegexStringsWithArrayMinMax: aRSWAMM, simpleWhere: sW, dependWhere: dW, ...restManual} = testSchemaShapedManual;
    const { rules } = shapedSchema[meta];

    const { state, ...restAddr } = address;
    const { state: sM, ...restAddrM } = addr;

    test.equal(rest, restManual);
    test.equal(restAddr, restAddrM);
    test.equal(people[0].condition.toString(), p[0].condition.toString());
    test.equal(state.condition.toString(), sM.condition.toString());
    test.equal(minMaxString.condition.toString(), mMS.condition.toString());
    test.equal(minString.condition.toString(), mnS.condition.toString());
    test.equal(maxString.condition.toString(), mxS.condition.toString());
    test.equal(maxStringCustomError.condition.toString(), mxSCE.condition.toString());
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
    test.equal(simpleWhere.condition.toString(), sW.condition.toString());
    test.equal(dependWhere, dW);
    test.equal(JSON.stringify(rules), `[{"path":["dependWhere"],"deps":["text"]}]`)
    test.equal(rules[0].rule.toString().includes(`if (text === 'stuff' && !dependWhere) throw 'nope'`), true)
  });

  Tinytest.add('returns a shaped schema when needs it when sugared', function(test) {
    const shapedSchema = shape(testSchemaSugar);

    // validNumber and validString are instances of Match.Where which is a function. can't compare functions directly for equality so taking those out and then comparing them as their strings to for equality
    // maybe there is a better way to test function equality
    const { people, minMaxString, minString, maxString, maxStringCustomError, minMaxNum, minNum, maxNum, minMaxInt, minInt, maxInt, address, regexString, optionalRegexString, optionalRegexStringVariant, arrayOfRegexStrings, arrayOfOptionalMinMaxNum, optionalArrayOfMinMaxInt, minMaxArray, arrayOfRegexStringsWithArrayMinMax, simpleWhere, dependWhere, ...rest} = shapedSchema;
    const { people: p, minMaxString: mMS, minString: mnS, maxString: mxS, maxStringCustomError: mxSCE, minMaxNum: mmN, minNum: mnN, maxNum: mxN, minMaxInt: mmI, minInt: mnI, maxInt: mxI, address: addr, regexString: rS, optionalRegexString: oRS, optionalRegexStringVariant: oRSV, arrayOfRegexStrings: aRS, arrayOfOptionalMinMaxNum: aOMMN, optionalArrayOfMinMaxInt: oAMMI, minMaxArray: mmA, arrayOfRegexStringsWithArrayMinMax: aRSWAMM, simpleWhere: sW, dependWhere: dW, ...restManual} = testSchemaShapedManual;
    const { rules } = shapedSchema[meta];

    const { state, ...restAddr } = address;
    const { state: sM, ...restAddrM } = addr;

    test.equal(rest, restManual);
    test.equal(restAddr, restAddrM);
    test.equal(people[0].condition.toString(), p[0].condition.toString());
    test.equal(state.condition.toString(), sM.condition.toString());
    test.equal(minMaxString.condition.toString(), mMS.condition.toString());
    test.equal(minString.condition.toString(), mnS.condition.toString());
    test.equal(maxString.condition.toString(), mxS.condition.toString());
    test.equal(maxStringCustomError.condition.toString(), mxSCE.condition.toString());
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
    test.equal(simpleWhere.condition.toString(), sW.condition.toString());
    test.equal(dependWhere, dW);
    test.equal(JSON.stringify(rules), `[{"path":["dependWhere"],"deps":["text"]}]`)
    test.equal(rules[0].rule.toString().includes(`if (text === 'stuff' && !dependWhere) throw 'nope'`), true)
  });

  Tinytest.add('deep optional schema', function(test) {
    const shapedSchema = shape(testSchema, { optionalize: true });

    const { people, minMaxString, minString, maxString, maxStringCustomError, minMaxNum, minNum, maxNum, minMaxInt, minInt, maxInt, address, regexString, optionalRegexString, optionalRegexStringVariant, arrayOfRegexStrings, arrayOfOptionalMinMaxNum, optionalArrayOfMinMaxInt, minMaxArray, arrayOfRegexStringsWithArrayMinMax, simpleWhere, dependWhere, ...rest} = shapedSchema;
    const { people: p, minMaxString: mMS, minString: mnS, maxString: mxS, maxStringCustomError: mxSCE, minMaxNum: mmN, minNum: mnN, maxNum: mxN, minMaxInt: mmI, minInt: mnI, maxInt: mxI, address: addr, regexString: rS, optionalRegexString: oRS, optionalRegexStringVariant: oRSV, arrayOfRegexStrings: aRS, arrayOfOptionalMinMaxNum: aOMMN, optionalArrayOfMinMaxInt: oAMMI, minMaxArray: mmA, arrayOfRegexStringsWithArrayMinMax: aRSWAMM, simpleWhere: sW, dependWhere: dW, ...restManual} = testSchemaShapedOptionalManual;
    const { rules } = shapedSchema[meta];

    const { state, ...restAddr } = address.pattern;
    const { state: sM, ...restAddrM } = addr.pattern;

    test.equal(rest, restManual);
    test.equal(restAddr, restAddrM);
    test.equal(people.pattern[0].pattern.condition.toString(), p.pattern[0].pattern.condition.toString());
    test.equal(state.pattern.condition.toString(), sM.pattern.condition.toString());
    test.equal(minMaxString.pattern.condition.toString(), mMS.pattern.condition.toString());
    test.equal(minString.pattern.condition.toString(), mnS.pattern.condition.toString());
    test.equal(maxString.pattern.condition.toString(), mxS.pattern.condition.toString());
    test.equal(maxStringCustomError.pattern.condition.toString(), mxSCE.pattern.condition.toString());
    test.equal(minMaxNum.pattern.condition.toString(), mmN.pattern.condition.toString());
    test.equal(minNum.pattern.condition.toString(), mnN.pattern.condition.toString());
    test.equal(maxNum.pattern.condition.toString(), mxN.pattern.condition.toString());
    test.equal(minMaxInt.pattern.condition.toString(), mmI.pattern.condition.toString());
    test.equal(minInt.pattern.condition.toString(), mnI.pattern.condition.toString());
    test.equal(maxInt.pattern.condition.toString(), mxI.pattern.condition.toString());
    test.equal(regexString.pattern.condition.toString(), rS.pattern.condition.toString());
    test.equal(optionalRegexString.pattern.condition.toString(), oRS.pattern.condition.toString());
    test.equal(optionalRegexStringVariant.pattern.condition.toString(), oRSV.pattern.condition.toString());
    test.equal(arrayOfRegexStrings.pattern[0].pattern.condition.toString(), aRS.pattern[0].pattern.condition.toString());
    test.equal(arrayOfOptionalMinMaxNum.pattern[0].pattern.condition.toString(), aOMMN.pattern[0].pattern.condition.toString());
    test.equal(optionalArrayOfMinMaxInt.pattern[0].pattern.condition.toString(), Object.values(oAMMI)[0][0].pattern.condition.toString());
    test.equal(minMaxArray.pattern.condition.toString(), mmA.pattern.condition.toString());
    test.equal(arrayOfRegexStringsWithArrayMinMax.pattern.condition.toString(), aRSWAMM.pattern.condition.toString());
    test.equal(simpleWhere.pattern.condition.toString(), sW.pattern.condition.toString());
    test.equal(dependWhere.pattern, dW.pattern);
    test.equal(rules, undefined)
  });

  Tinytest.add('handles embedded subschema', function(test) {
    const shapedSchema = shape(personSchema);

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

  Tinytest.add('handles "type:" embedded object', function(test) {
    const shapedSchema = shape(typeSchema);

    test.equal(shapedSchema._id, typeSchemaShapedManual._id);
    test.equal(shapedSchema.address.street, typeSchemaShapedManual.address.street);
    test.equal(shapedSchema.address.city, typeSchemaShapedManual.address.city);
    test.equal(shapedSchema.address.type.something.condition.toString(), typeSchemaShapedManual.address.type.something.condition.toString());
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

  Tinytest.add('condition - custom error - regex string', function(test) {
    try {
      check(regexCustomDataFail, regexCustomSchema)
    } catch(error) {
      test.equal(error.details[0].message, 'Must be .com')
    }

    try {
      check(regexCustomData, regexCustomSchema)
      test.isTrue(true);
    } catch(error) {
      test.isTrue(error = undefined)
    }
  });

  Tinytest.add('condition - min empty string', function(test) {
    try {
      check(minEmptyDataFail, minEmptySchema)
    } catch(error) {
      test.equal(error.details[0].message, 'Min string cannot be empty')
    }

    try {
      check(minEmptyData, minEmptySchema)
      test.isTrue(true);
    } catch(error) {
      test.isTrue(error = undefined)
    }
  });

  Tinytest.add('condition - min string', function(test) {
    try {
      check(minDataFail, minSchema)
    } catch(error) {
      test.equal(error.details[0].message, 'Min string must be at least 2 characters')
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

  Tinytest.add('condition - custom error - minMax string', function(test) {
    try {
      check(minMaxCustomDataFailLow, minMaxCustomSchema)
    } catch(error) {
      test.equal(error.details[0].message, 'Too low')
    }

    try {
      check(minMaxCustomDataFailHigh, minMaxCustomSchema)
    } catch(error) {
      test.equal(error.details[0].message, 'Too high')
    }

    try {
      check(minMaxCustomData, minMaxCustomSchema)
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

  Tinytest.add('condition - custom error - allow string', function(test) {
    try {
      check(allowCustomDataFail, allowCustomSchema)
    } catch(error) {
      test.equal(error.details[0].message, 'Must be hi or bye')
    }

    try {
      check(allowCustomData, allowCustomSchema)
      test.isTrue(true);
    } catch(error) {
      test.isTrue(error = undefined)
    }
  });

  Tinytest.add('condition - fluent - regex string', function(test) {
    try {
      check(regexDataFail, regexSchemaHas)
    } catch(error) {
      test.isTrue(error)
    }

    try {
      check(regexData, regexSchemaHas)
      test.isTrue(true);
    } catch(error) {
      test.isTrue(error = undefined)
    }
  });

  Tinytest.add('condition - fluent - custom error - regex string', function(test) {
    try {
      check(regexCustomDataFail, regexCustomSchemaHas)
    } catch(error) {
      test.equal(error.details[0].message, 'Must be .com')
    }

    try {
      check(regexCustomData, regexCustomSchemaHas)
      test.isTrue(true);
    } catch(error) {
      test.isTrue(error = undefined)
    }
  });

  Tinytest.add('condition - fluent - min empty string', function(test) {
    try {
      check(minEmptyDataFail, minEmptySchemaHas)
    } catch(error) {
      test.equal(error.details[0].message, 'Min string cannot be empty')
    }

    try {
      check(minEmptyData, minEmptySchemaHas)
      test.isTrue(true);
    } catch(error) {
      test.isTrue(error = undefined)
    }
  });

  Tinytest.add('condition - fluent - min string', function(test) {
    try {
      check(minDataFail, minSchemaHas)
    } catch(error) {
      test.equal(error.details[0].message, 'Min string must be at least 2 characters')
    }

    try {
      check(minData, minSchemaHas)
      test.isTrue(true);
    } catch(error) {
      test.isTrue(error = undefined)
    }
  });

  Tinytest.add('condition - fluent - max string', function(test) {
    try {
      check(maxDataFail, maxSchemaHas)
    } catch(error) {
      test.isTrue(error)
    }

    try {
      check(maxData, maxSchemaHas)
      test.isTrue(true);
    } catch(error) {
      test.isTrue(error = undefined)
    }
  });

  Tinytest.add('condition - fluent - minMax string', function(test) {
    try {
      check(minMaxDataFailLow, minMaxSchemaHas)
    } catch(error) {
      test.isTrue(error)
    }

    try {
      check(minMaxDataFailHigh, minMaxSchemaHas)
    } catch(error) {
      test.isTrue(error)
    }

    try {
      check(minMaxData, minMaxSchemaHas)
      test.isTrue(true);
    } catch(error) {
      test.isTrue(error = undefined)
    }
  });

  Tinytest.add('condition - fluent - custom error - minMax string', function(test) {
    try {
      check(minMaxCustomDataFailLow, minMaxCustomSchemaHas)
    } catch(error) {
      test.equal(error.details[0].message, 'Too low')
    }

    try {
      check(minMaxCustomDataFailHigh, minMaxCustomSchemaHas)
    } catch(error) {
      test.equal(error.details[0].message, 'Too high')
    }

    try {
      check(minMaxCustomData, minMaxCustomSchemaHas)
      test.isTrue(true);
    } catch(error) {
      test.isTrue(error = undefined)
    }
  });

  Tinytest.add('condition - fluent - allow string', function(test) {
    try {
      check(allowDataFail, allowSchemaHas)
    } catch(error) {
      test.isTrue(error)
    }

    try {
      check(allowData, allowSchemaHas)
      test.isTrue(true);
    } catch(error) {
      test.isTrue(error = undefined)
    }
  });

  Tinytest.add('condition - fluent - custom error - allow string', function(test) {
    try {
      check(allowCustomDataFail, allowCustomSchemaHas)
    } catch(error) {
      test.equal(error.details[0].message, 'Must be hi or bye')
    }

    try {
      check(allowCustomData, allowCustomSchemaHas)
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

  Tinytest.add('condition - fluent - min num', function(test) {
    try {
      check(minNumDataFail, minNumSchemaHas)
    } catch(error) {
      test.isTrue(error)
    }

    try {
      check(minNumData, minNumSchemaHas)
      test.isTrue(true);
    } catch(error) {
      test.isTrue(error = undefined)
    }
  });

  Tinytest.add('condition - fluent - max num', function(test) {
    try {
      check(maxNumDataFail, maxNumSchemaHas)
    } catch(error) {
      test.isTrue(error)
    }

    try {
      check(maxNumData, maxNumSchemaHas)
      test.isTrue(true);
    } catch(error) {
      test.isTrue(error = undefined)
    }
  });

  Tinytest.add('condition - fluent - minMax num', function(test) {
    try {
      check(minMaxNumDataFailLow, minMaxNumSchemaHas)
    } catch(error) {
      test.isTrue(error)
    }

    try {
      check(minMaxNumDataFailHigh, minMaxNumSchemaHas)
    } catch(error) {
      test.isTrue(error)
    }

    try {
      check(minMaxNumData, minMaxNumSchemaHas)
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

  Tinytest.add('condition - fluent - min int', function(test) {
    try {
      check(minIntDataFail, minIntSchemaHas)
    } catch(error) {
      test.isTrue(error)
    }

    try {
      check(minIntData, minIntSchemaHas)
      test.isTrue(true);
    } catch(error) {
      test.isTrue(error = undefined)
    }
  });

  Tinytest.add('condition - fluent - max int', function(test) {
    try {
      check(maxIntDataFail, maxIntSchemaHas)
    } catch(error) {
      test.isTrue(error)
    }

    try {
      check(maxIntData, maxIntSchemaHas)
      test.isTrue(true);
    } catch(error) {
      test.isTrue(error = undefined)
    }
  });

  Tinytest.add('condition - fluent - minMax int', function(test) {
    try {
      check(minMaxIntDataFailLow, minMaxIntSchemaHas)
    } catch(error) {
      test.isTrue(error)
    }

    try {
      check(minMaxIntDataFailHigh, minMaxIntSchemaHas)
    } catch(error) {
      test.isTrue(error)
    }

    try {
      check(minMaxIntData, minMaxIntSchemaHas)
      test.isTrue(true);
    } catch(error) {
      test.isTrue(error = undefined)
    }
  });

  Tinytest.add('condition - fluent - allow int', function(test) {
    try {
      check(allowIntDataFail, allowIntSchemaHas)
    } catch(error) {
      test.isTrue(error)
    }

    try {
      check(allowIntData, allowIntSchemaHas)
      test.isTrue(true);
    } catch(error) {
      test.isTrue(error = undefined)
    }
  });

  ///////
  Tinytest.add('condition - min double', function(test) {
    try {
      check(minDoubleDataFail, minDoubleSchema)
    } catch(error) {
      test.isTrue(error)
    }

    try {
      check(minDoubleData, minDoubleSchema)
      test.isTrue(true);
    } catch(error) {
      test.isTrue(error = undefined)
    }
  });

  Tinytest.add('condition - max double', function(test) {
    try {
      check(maxDoubleDataFail, maxDoubleSchema)
    } catch(error) {
      test.isTrue(error)
    }

    try {
      check(maxDoubleData, maxDoubleSchema)
      test.isTrue(true);
    } catch(error) {
      test.isTrue(error = undefined)
    }
  });

  Tinytest.add('condition - minMax double', function(test) {
    try {
      check(minMaxDoubleDataFailLow, minMaxDoubleSchema)
    } catch(error) {
      test.isTrue(error)
    }

    try {
      check(minMaxDoubleDataFailHigh, minMaxDoubleSchema)
    } catch(error) {
      test.isTrue(error)
    }

    try {
      check(minMaxDoubleData, minMaxDoubleSchema)
      test.isTrue(true);
    } catch(error) {
      test.isTrue(error = undefined)
    }
  });

  Tinytest.add('condition - allow double', function(test) {
    try {
      check(allowDoubleDataFail, allowDoubleSchema)
    } catch(error) {
      test.isTrue(error)
    }

    try {
      check(allowDoubleData, allowDoubleSchema)
      test.isTrue(true);
    } catch(error) {
      test.isTrue(error = undefined)
    }
  });

  Tinytest.add('condition - fluent - min double', function(test) {
    try {
      check(minDoubleDataFail, minDoubleSchemaHas)
    } catch(error) {
      test.isTrue(error)
    }

    try {
      check(minDoubleData, minDoubleSchemaHas)
      test.isTrue(true);
    } catch(error) {
      test.isTrue(error = undefined)
    }
  });

  Tinytest.add('condition - fluent - max double', function(test) {
    try {
      check(maxDoubleDataFail, maxDoubleSchemaHas)
    } catch(error) {
      test.isTrue(error)
    }

    try {
      check(maxDoubleData, maxDoubleSchemaHas)
      test.isTrue(true);
    } catch(error) {
      test.isTrue(error = undefined)
    }
  });

  Tinytest.add('condition - fluent - minMax double', function(test) {
    try {
      check(minMaxDoubleDataFailLow, minMaxDoubleSchemaHas)
    } catch(error) {
      test.isTrue(error)
    }

    try {
      check(minMaxDoubleDataFailHigh, minMaxDoubleSchemaHas)
    } catch(error) {
      test.isTrue(error)
    }

    try {
      check(minMaxDoubleData, minMaxDoubleSchemaHas)
      test.isTrue(true);
    } catch(error) {
      test.isTrue(error = undefined)
    }
  });

  Tinytest.add('condition - fluent - allow double', function(test) {
    try {
      check(allowDoubleDataFail, allowDoubleSchemaHas)
    } catch(error) {
      test.isTrue(error)
    }

    try {
      check(allowDoubleData, allowDoubleSchemaHas)
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

   Tinytest.add('condition - fluent - min decimal', function(test) {
    try {
      check(minDecimalDataFail, minDecimalSchemaHas)
    } catch(error) {
      test.isTrue(error)
    }

    try {
      check(minDecimalData, minDecimalSchemaHas)
      test.isTrue(true);
    } catch(error) {
      test.isTrue(error = undefined)
    }
  });

  Tinytest.add('condition - fluent - max decimal', function(test) {
    try {
      check(maxDecimalDataFail, maxDecimalSchemaHas)
    } catch(error) {
      test.isTrue(error)
    }

    try {
      check(maxDecimalData, maxDecimalSchemaHas)
      test.isTrue(true);
    } catch(error) {
      test.isTrue(error = undefined)
    }
  });

  Tinytest.add('condition - fluent - minMax decimal', function(test) {
    try {
      check(minMaxDecimalDataFailLow, minMaxDecimalSchemaHas)
    } catch(error) {
      test.isTrue(error)
    }

    try {
      check(minMaxDecimalDataFailHigh, minMaxDecimalSchemaHas)
    } catch(error) {
      test.isTrue(error)
    }

    try {
      check(minMaxDecimalData, minMaxDecimalSchemaHas)
      test.isTrue(true);
    } catch(error) {
      test.isTrue(error = undefined)
    }
  });

  Tinytest.add('condition - fluent - allow decimal', function(test) {
    try {
      check(allowDecimalDataFail, allowDecimalSchemaHas)
    } catch(error) {
      test.isTrue(error)
    }

    try {
      check(allowDecimalData, allowDecimalSchemaHas)
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

  Tinytest.add('condition - custom error - unique array', function(test) {
    try {
      check(uniqueArrCustomDataFail, uniqueArrCustomSchema)
    } catch(error) {
      test.equal(error.details[0].message, 'Gotta be unique')
    }

    try {
      check(uniqueArrCustomData, uniqueArrCustomSchema)
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

  Tinytest.add('condition - custom error - allow 2d array', function(test) {

    try {
      check(allowArrCustomDataFail, allowArrCustomSchema)
    } catch(error) {
      test.equal(error.details[0].message, 'Nope')
    }

    try {
      check(allowArrCustomData, allowArrCustomSchema)
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

  Tinytest.add('condition - custom error - allow array of objects', function(test) {
    try {
      check(allowArrOfObjCustomDataFail, allowArrOfObjCustomSchema)
    } catch(error) {
      test.equal(error.details[0].message, 'Negative')
    }

    try {
      check(allowArrOfObjCustomData, allowArrOfObjCustomSchema)
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
      check(genericArrAllowDataFail, genericArrAllowSchemaHas)
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

  //
  Tinytest.add('condition - fluent - min array', function(test) {
    try {
      check(minArrDataFail, minArrSchemaHas)
    } catch(error) {
      test.isTrue(error)
    }

    try {
      check(minArrData, minArrSchemaHas)
      test.isTrue(true);
    } catch(error) {
      test.isTrue(error = undefined)
    }
  });

  Tinytest.add('condition - fluent - max array', function(test) {
    try {
      check(maxArrDataFail, maxArrSchemaHas)
    } catch(error) {
      test.isTrue(error)
    }

    try {
      check(maxArrData, maxArrSchemaHas)
      test.isTrue(true);
    } catch(error) {
      test.isTrue(error = undefined)
    }
  });

  Tinytest.add('condition - fluent - minMax array', function(test) {
    try {
      check(minMaxArrDataFailLow, minMaxArrSchemaHas)
    } catch(error) {
      test.isTrue(error)
    }

    try {
      check(minMaxArrDataFailHigh, minMaxArrSchemaHas)
    } catch(error) {
      test.isTrue(error)
    }

    try {
      check(minMaxArrData, minMaxArrSchemaHas)
      test.isTrue(true);
    } catch(error) {
      test.isTrue(error = undefined)
    }
  });

  Tinytest.add('condition - fluent - unique array', function(test) {
    try {
      check(uniqueArrDataFail, uniqueArrSchemaHas)
    } catch(error) {
      test.isTrue(error)
    }

    try {
      check(uniqueArrData, uniqueArrSchemaHas)
      test.isTrue(true);
    } catch(error) {
      test.isTrue(error = undefined)
    }
  });

  Tinytest.add('condition - fluent - custom error - unique array', function(test) {
    try {
      check(uniqueArrCustomDataFail, uniqueArrCustomSchemaHas)
    } catch(error) {
      test.equal(error.details[0].message, 'Gotta be unique')
    }

    try {
      check(uniqueArrCustomData, uniqueArrCustomSchemaHas)
      test.isTrue(true);
    } catch(error) {
      test.isTrue(error = undefined)
    }
  });

  Tinytest.add('condition - fluent - allow 2d array', function(test) {

    try {
      check(allowArrDataFail, allowArrSchemaHas)
    } catch(error) {
      test.isTrue(error)
    }

    try {
      check(allowArrData, allowArrSchemaHas)
      test.isTrue(true);
    } catch(error) {
      test.isTrue(error = undefined)
    }
  });

  Tinytest.add('condition - fluent - custom error - allow 2d array', function(test) {

    try {
      check(allowArrCustomDataFail, allowArrCustomSchemaHas)
    } catch(error) {
      test.equal(error.details[0].message, 'Nope')
    }

    try {
      check(allowArrCustomData, allowArrCustomSchemaHas)
      test.isTrue(true);
    } catch(error) {
      test.isTrue(error = undefined)
    }
  });

  Tinytest.add('condition - fluent - allow array of objects', function(test) {
    try {
      check(allowArrOfObjDataFail, allowArrOfObjSchemaHas)
    } catch(error) {
      test.isTrue(error)
    }

    try {
      check(allowArrOfObjData, allowArrOfObjSchemaHas)
      test.isTrue(true);
    } catch(error) {
      test.isTrue(error = undefined)
    }
  });

  Tinytest.add('condition - fluent - custom error - allow array of objects', function(test) {
    try {
      check(allowArrOfObjCustomDataFail, allowArrOfObjCustomSchemaHas)
    } catch(error) {
      test.equal(error.details[0].message, 'Negative')
    }

    try {
      check(allowArrOfObjCustomData, allowArrOfObjCustomSchemaHas)
      test.isTrue(true);
    } catch(error) {
      test.isTrue(error = undefined)
    }
  });

  Tinytest.add('condition - fluent - generic array unique', function(test) {
    try {
      check(genericArrUniqueDataFail, genericArrUniqueSchemaHas)
    } catch(error) {
      test.isTrue(error)
    }

    try {
      check(genericArrUniqueData, genericArrUniqueSchemaHas)
      test.isTrue(true);
    } catch(error) {
      test.isTrue(error = undefined)
    }
  });

  Tinytest.add('condition - fluent - generic array allow', function(test) {
    try {
      check(genericArrAllowDataFail, genericArrAllowSchemaHas)
    } catch(error) {
      test.isTrue(error)
    }

    try {
      check(genericArrAllowData, genericArrAllowSchemaHas)
      test.isTrue(true);
    } catch(error) {
      test.isTrue(error = undefined)
    }
  });
  // 
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

  Tinytest.add('condition - fluent - min object', function(test) {
    try {
      check(minObjDataFail, minObjSchemaHas)
    } catch(error) {
      test.isTrue(error)
    }

    try {
      check(minObjData, minObjSchemaHas)
      test.isTrue(true);
    } catch(error) {
      test.isTrue(error = undefined)
    }
  });

  Tinytest.add('condition - fluent - max object', function(test) {
    try {
      check(maxObjDataFail, maxObjSchemaHas)
    } catch(error) {
      test.isTrue(error)
    }

    try {
      check(maxObjData, maxObjSchemaHas)
      test.isTrue(true);
    } catch(error) {
      test.isTrue(error = undefined)
    }
  });

  Tinytest.add('condition - fluent - generic object', function(test) {
    try {
      check(genericObjDataFail, genericObjSchemaHas)
    } catch(error) {
      test.isTrue(error)
    }

    try {
      check(genericObjData, genericObjSchemaHas)
      test.isTrue(true);
    } catch(error) {
      test.isTrue(error = undefined)
    }
  });

  Tinytest.add('condition - fluent - generic object allow', function(test) {
    try {
      check(genericObjAllowDataFail, genericObjAllowSchemaHas)
    } catch(error) {
      test.isTrue(error)
    }

    try {
      check(genericObjAllowData, genericObjAllowSchemaHas)
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

  Tinytest.add('condition - fluent - date allow', function(test) {
    try {
      check(allowDateDataFail, allowDateSchemaHas)
    } catch(error) {
      test.isTrue(error)
    }

    try {
      check(allowDateData, allowDateSchemaHas)
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

  Tinytest.add('condition - fluent - boolean allow', function(test) {
    try {
      check(booleanAllowDataFail, booleanAllowSchemaHas)
    } catch(error) {
      test.isTrue(error)
    }

    try {
      check(booleanAllowData, booleanAllowSchemaHas)
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

  Tinytest.add('condition - extra props in objects', function(test) {
    try {
      // TODO: why does this pass on the first run but not subsequent?
      const result = check(extraDataFail, extraSchema)
    } catch(error) {
      test.isTrue(error)
      test.equal(error.details[0].message,`Nice must be at most 2 properties`)
    }

    try {
      const result = check(extraData, extraSchema)
      test.isTrue(true);
    } catch(error) {
      test.isTrue(error = undefined)
    }
  });

  Tinytest.add('JSONSchema - extra props in objects', function(test) {
    // TODO: why does this pass on the first run but not subsequent?
    const jsonSchema = createJSONSchema(extraSchema)
    // console.dir(jsonSchema, {depth: null})
    test.equal(jsonSchema, {
      bsonType: 'object',
      properties: {
        _id: { bsonType: 'string' },
        text: { bsonType: 'string' },
        something: {
          bsonType: 'object',
          properties: {
            stuff: { bsonType: 'string' },
            embed: {
              bsonType: 'object',
              properties: { more: { bsonType: 'string' } },
              required: [ 'more' ],
              additionalProperties: true
            },
            nice: {
              bsonType: 'object',
              properties: { b: { bsonType: 'string' } },
              required: [ 'b' ],
              additionalProperties: true,
              maxProperties: 2
            }
          },
          required: [ 'stuff', 'embed', 'nice' ],
          additionalProperties: true
        },
        things: {
          bsonType: 'array',
          items: {
            bsonType: 'object',
            properties: { yo: { bsonType: 'string' } },
            required: [ 'yo' ],
            additionalProperties: true
          }
        }
      },
      required: [ 'text', 'something', 'things' ],
      additionalProperties: true
    })
  });


  Tinytest.add('condition - simple where', function(test) {
    try {
      const result = check(whereDataFail, whereSchema)
    } catch(error) {
      test.isTrue(error)
      test.equal(error.details[0].message,`failed where condition in field string`)
    }

    try {
      const result = check(whereData, whereSchema)
      test.isTrue(true);
    } catch(error) {
      test.isTrue(error = undefined)
    }
  });

  Tinytest.add('condition - fluent - simple where', function(test) {
    try {
      const result = check(whereDataFail, whereSchemaHas)
    } catch(error) {
      test.isTrue(error)
      test.equal(error.details[0].message,`failed where condition in field string`)
    }

    try {
      const result = check(whereData, whereSchemaHas)
      test.isTrue(true);
    } catch(error) {
      test.isTrue(error = undefined)
    }
  });

  Tinytest.add('condition - dependent where update', function(test) {
    try {
      check({$set: {password: 'hello123', confirmPassword: 'nope123'}}, dependentWhereSchema)
    } catch(error) {
      test.isTrue(error)
      test.equal(error.details[0].message,`Passwords must match`)
    }

    try {
      check({$set: {password: 'hello123', confirmPassword: 'hello123'}}, dependentWhereSchema)
      test.isTrue(true);
    } catch(error) {
      test.isTrue(error = undefined)
    }
  });

  Tinytest.add('condition - dependent where update 2', function(test) {
    try {
      check({$set: {password: 'hello123'}}, dependentWhereSchema)
    } catch(error) {
      test.isTrue(error)
      test.equal(error.details[0].message,`passwords must match`)
    }
  });

  Tinytest.add('condition - fluent - dependent where update', function(test) {
    try {
      check({$set: {password: 'hello123', confirmPassword: 'nope123'}}, dependentWhereSchemaHas)
    } catch(error) {
      test.isTrue(error)
      test.equal(error.details[0].message,`Passwords must match`)
    }

    try {
      check({$set: {password: 'hello123', confirmPassword: 'hello123'}}, dependentWhereSchemaHas)
      test.isTrue(true);
    } catch(error) {
      test.isTrue(error = undefined)
    }
  });

  Tinytest.add('condition - fluent - dependent where update 2', function(test) {
    try {
      check({$set: {password: 'hello123'}}, dependentWhereSchemaHas)
    } catch(error) {
      test.isTrue(error)
      test.equal(error.details[0].message,`passwords must match`)
    }
  });

  Tinytest.add('condition - required dependent where', function(test) {
    try {
      check(requiredDependentDataFail, requiredDependentSchema)
    } catch(error) {
      test.isTrue(error)
      test.equal(error.details[0].message,`Thing is required`)
    }

    try {
      check(requiredDependentDataFail2, requiredDependentSchema)
    } catch(error) {
      test.isTrue(error)
      test.equal(error.details[0].message, 'Thing must be a string, not boolean')
    }

    try {
      check(requiredDependentData, requiredDependentSchema)
      test.isTrue(true);
    } catch(error) {
      test.isTrue(error = undefined)
    }

    try {
      check(requiredDependentData2, requiredDependentSchema)
      test.isTrue(true);
    } catch(error) {
      test.isTrue(error = undefined)
    }

    try {
      check(requiredDependentData3, requiredDependentSchema)
      test.isTrue(true);
    } catch(error) {
      test.isTrue(error = undefined)
    }
  });

  Tinytest.add('condition - nested where', function (test) {
    const dataFail = {
      _id: '1',
      name: 'hi',
      homeAddress: {street: 'thing', city: 'no', state: {full: 'Texas', code: 'tx'}},
      billingAddress: {street: 'thing', city: 'no', state: {full: 'fail', code: 'tx'}}, // should fail here
      stuff: 'sup',
      another: [{name: 'bob', age: 21, foo: 'f'}, {name: 'jim', age: 39, foo: 'g'}]
    }

    try {
      check(dataFail, nestedSchema);
    } catch(error) {
      test.isTrue(error)
      test.equal(error.details[0].message,`Nope`)
    }

    const dataSuccess = {
      _id: '1',
      name: 'hi',
      homeAddress: {street: 'thing', city: 'no', state: {full: 'Texas', code: 'tx'}},
      billingAddress: {street: 'thing', city: 'no', state: {full: 'Texas', code: 'tx'}},
      stuff: 'sup',
      another: [{name: 'bob', age: 21, foo: 'f'}, {name: 'jim', age: 39, foo: 'g'}]
    }

    try {
      check(dataSuccess, nestedSchema)
      test.isTrue(true);
    } catch(error) {
      test.isTrue(error = undefined)
    }
  });

  Tinytest.add('condition - nested array where', function (test) {
    const dataFail = {
      _id: '1',
      name: 'hi',
      homeAddress: {street: 'thing', city: 'no', state: {full: 'Texas', code: 'tx'}},
      billingAddress: {street: 'thing', city: 'no', state: {full: 'Texas', code: 'tx'}},
      stuff: 'sup',
      another: [{name: 'bob', age: 21, foo: 'f'}, {name: 'jim', age: 41, foo: 'g'}] // should fail here
    }

    try {
      check(dataFail, nestedSchema)
    } catch(error) {
      test.isTrue(error)
      test.equal(error.details[0].message,`old`)
    }

    const dataSuccess = {
      _id: '1',
      name: 'hi',
      homeAddress: {street: 'thing', city: 'no', state: {full: 'Texas', code: 'tx'}},
      billingAddress: {street: 'thing', city: 'no', state: {full: 'Texas', code: 'tx'}},
      stuff: 'sup',
      another: [{name: 'bob', age: 21, foo: 'f'}, {name: 'jim', age: 39, foo: 'g'}]
    }

    try {
      check(dataSuccess, nestedSchema)
      test.isTrue(true);
    } catch(error) {
      test.isTrue(error = undefined)
    }
  });

  Tinytest.add('JSONSchema - converts an easy schema', function(test) {
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
        'double': { anyOf: [ { bsonType: 'double' }, { bsonType: 'int' } ] },
        'stuff': { 'bsonType': 'object' },
        'int': { 'bsonType': 'int' },
        'minMaxString': { 'bsonType': 'string', 'minLength': 0, 'maxLength': 20 },
        'minString': { 'bsonType': 'string', 'minLength': 2 },
        'maxString': { 'bsonType': 'string', 'maxLength': 5 },
        'maxStringCustomError': { 'bsonType': 'string', 'maxLength': 5 },
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
            'arrayOfOptionalBooleans': { 'bsonType': 'array', 'items': { 'bsonType': 'bool' }, 'minItems': 0 },
           },
           'required': [ 'name', 'age', 'arrayOfOptionalBooleans' ],
           'additionalProperties': false,
           'minProperties': 3
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
       'regexString': { 'bsonType': 'string', 'pattern': '.com$' },
       'optionalRegexString': { 'bsonType': 'string', 'pattern': '.com$' },
       'optionalRegexStringVariant': { 'bsonType': 'string', 'pattern': '.com$' },
       'arrayOfRegexStrings': { 'bsonType': 'array', 'items': { 'bsonType': 'string', 'pattern': '.com$' } },
       'arrayOfOptionalMinMaxNum': { 'bsonType': 'array', 'items': { 'bsonType': 'double', 'minimum': 1, 'maximum': 4 }, 'minItems': 0 },
       'optionalArrayOfMinMaxInt': { 'bsonType': 'array', 'items': { 'bsonType': 'int', 'minimum': 200, 'maximum': 300 } },
       'minMaxArray': { 'bsonType': 'array', 'items': { 'bsonType': 'string' }, 'minItems': 1, 'maxItems': 3 },
       'arrayOfRegexStringsWithArrayMinMax': { 'bsonType': 'array', 'items': { 'bsonType': 'string', 'pattern': 'com$' }, 'minItems': 1, 'maxItems': 2 },
       'anyOf': {'anyOf': [{ 'bsonType': 'array', 'items': { 'bsonType': 'string' } }, { 'bsonType': 'array', 'items': { 'bsonType': 'date' } }]},
       'arrayAnyOf': { 'bsonType': 'array', 'items': {'anyOf': [{'bsonType': 'string'}, {'bsonType': 'double'}]}},
       'any': {},
       'simpleWhere': { 'bsonType': 'string' },
       'dependWhere': { 'bsonType': 'string' }
      },
      'required': [
       'text',        'emails',
       'createdAt',   'bool',
       'num',
       'double',      'stuff',
       'int',         'minMaxString',
       'minString',   'maxString',
       'maxStringCustomError',
       'minMaxNum',   'minNum',
       'maxNum',      'minMaxInt',
       'minInt',      'maxInt',
       'address',     'people',
       'arrayOfInts', 'arrayOfOptionalInts',
       'regexString', 'arrayOfRegexStrings',
       'arrayOfOptionalMinMaxNum', 'minMaxArray',
       'arrayOfRegexStringsWithArrayMinMax', 'anyOf',
       'arrayAnyOf', 'any',
       'simpleWhere', 'dependWhere'
      ],
      'additionalProperties': false
    });
  });

Tinytest.add('JSONSchema - converts an easy schema sugared', function(test) {
    const jsonSchema = createJSONSchema(testSchemaSugar);
    //console.log('SUGAR jsonSchema');
    //console.dir(jsonSchema, {depth: null});
    test.equal(jsonSchema, {
      'bsonType': 'object',
      'properties': {
        '_id': { 'bsonType': 'string' },
        'text': { 'bsonType': 'string' },
        'emails': { 'bsonType': 'array', 'items': { 'bsonType': 'string' } },
        'createdAt': { 'bsonType': 'date' },
        'bool': { 'bsonType': 'bool' },
        'num': { 'bsonType': 'double' },
        'double': { anyOf: [ { bsonType: 'double' }, { bsonType: 'int' } ] },
        'stuff': { 'bsonType': 'object' },
        'int': { 'bsonType': 'int' },
        'minMaxString': { 'bsonType': 'string', 'minLength': 0, 'maxLength': 20 },
        'minString': { 'bsonType': 'string', 'minLength': 2 },
        'maxString': { 'bsonType': 'string', 'maxLength': 5 },
        'maxStringCustomError': { 'bsonType': 'string', 'maxLength': 5 },
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
           'additionalProperties': false,
           'minProperties': 3
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
       'regexString': { 'bsonType': 'string', 'pattern': '.com$' },
       'optionalRegexString': { 'bsonType': 'string', 'pattern': '.com$' },
       'optionalRegexStringVariant': { 'bsonType': 'string', 'pattern': '.com$' },
       'arrayOfRegexStrings': { 'bsonType': 'array', 'items': { 'bsonType': 'string', 'pattern': '.com$' } },
       'arrayOfOptionalMinMaxNum': { 'bsonType': 'array', 'items': { 'bsonType': 'double', 'minimum': 1, 'maximum': 4 }, 'minItems': 0 },
       'optionalArrayOfMinMaxInt': { 'bsonType': 'array', 'items': { 'bsonType': 'int', 'minimum': 200, 'maximum': 300 } },
       'minMaxArray': { 'bsonType': 'array', 'items': { 'bsonType': 'string' }, 'minItems': 1, 'maxItems': 3 },
       'arrayOfRegexStringsWithArrayMinMax': { 'bsonType': 'array', 'items': { 'bsonType': 'string', 'pattern': 'com$' }, 'minItems': 1, 'maxItems': 2 },
       'anyOf': {'anyOf': [{ 'bsonType': 'array', 'items': { 'bsonType': 'string' } }, { 'bsonType': 'array', 'items': { 'bsonType': 'date' } }]},
       'arrayAnyOf': { 'bsonType': 'array', 'items': {'anyOf': [{'bsonType': 'string'}, {'bsonType': 'double'}]}},
       'any': {},
       'simpleWhere': { 'bsonType': 'string' },
       'dependWhere': { 'bsonType': 'string' }
      },
      'required': [
       'text',        'emails',
       'createdAt',   'bool',
       'num',
       'double',      'stuff',
       'int',         'minMaxString',
       'minString',   'maxString',
       'maxStringCustomError',
       'minMaxNum',   'minNum',
       'maxNum',      'minMaxInt',
       'minInt',      'maxInt',
       'address',     'people',
       'arrayOfInts', 'arrayOfOptionalInts',
       'regexString', 'arrayOfRegexStrings',
       'arrayOfOptionalMinMaxNum', 'minMaxArray',
       'arrayOfRegexStringsWithArrayMinMax', 'anyOf',
       'arrayAnyOf', 'any',
       'simpleWhere', 'dependWhere'
      ],
      'additionalProperties': false
    });
  });

  Tinytest.add('correctly shapes schema with type property without allowed condition keywords', function(test) {
    const shapedSchema = shape(messageSchema);
    test.equal(shapedSchema, messageSchema);
  });

  Tinytest.add('JSONSchema - correctly converts easy schema with type property without allowed condition keywords', function(test) {
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

  Tinytest.add('JSONSchema - correctly converts easy schema with doubles', function(test) {
    const jsonSchema = createJSONSchema(doubleSchema);
    test.equal(jsonSchema, {
      bsonType: 'object',
      properties: {
        _id: { bsonType: 'string' },
        num: { anyOf: [ { bsonType: 'double' }, { bsonType: 'int' } ] },
        nums: {
          bsonType: 'array',
          items: { anyOf: [ { bsonType: 'double' }, { bsonType: 'int' } ] }
        },
        things: {
          bsonType: 'array',
          items: {
            bsonType: 'object',
            properties: {
              a: { bsonType: 'string' },
              b: { anyOf: [ { bsonType: 'double' }, { bsonType: 'int' } ] }
            },
            required: [ 'a', 'b' ],
            additionalProperties: false
          }
        },
        stuff: {
          bsonType: 'object',
          properties: {
            c: { bsonType: 'string' },
            d: { anyOf: [ { bsonType: 'double' }, { bsonType: 'int' } ] }
          },
          required: [ 'c', 'd' ],
          additionalProperties: false
        }
      },
      required: [ '_id', 'num', 'nums', 'things', 'stuff' ],
      additionalProperties: false
    });
  });

  Tinytest.add('isEqual - should return true for equal primitive values', function (test) {
    test.isTrue(isEqual(5, 5));
    test.isTrue(isEqual('hello', 'hello'));
    test.isTrue(isEqual(null, null));
    test.isTrue(isEqual(undefined, undefined));
  });

  Tinytest.add('isEqual - should return false for different primitive values', function (test) {
    test.isFalse(isEqual(5, '5'));
    test.isFalse(isEqual('hello', 'world'));
    test.isFalse(isEqual(0, false));
  });

  Tinytest.add('isEqual - should return true for equal arrays', function (test) {
    test.isTrue(isEqual([1, 2, 3], [1, 2, 3]));
    test.isTrue(isEqual(['a', 'b', 'c'], ['a', 'b', 'c']));
    test.isTrue(isEqual([], []));
  });

  Tinytest.add('isEqual - should return false for different arrays', function (test) {
    test.isFalse(isEqual([1, 2, 3], [1, 2, 4]));
    test.isFalse(isEqual(['a', 'b', 'c'], ['a', 'b']));
    test.isFalse(isEqual([1, 2, 3], '1,2,3'));
  });

  Tinytest.add('isEqual - should return true for equal objects', function (test) {
    test.isTrue(isEqual({ a: 1, b: 2 }, { a: 1, b: 2 }));
    test.isTrue(isEqual({ name: 'John', age: 25 }, { name: 'John', age: 25 }));
    test.isTrue(isEqual({}, {}));
  });

  Tinytest.add('isEqual - should return false for different objects', function (test) {
    test.isFalse(isEqual({ a: 1, b: 2 }, { a: 1, b: 3 }));
    test.isFalse(isEqual({ name: 'John', age: 25 }, { name: 'John', age: 30 }));
    test.isFalse(isEqual({ a: 1, b: 2 }, '[object Object]'));
  });

  Tinytest.add('isEqual - should handle nested structures', function (test) {
    test.isTrue(isEqual({ a: [1, 2, { b: 'c' }], d: { e: 'f' }, x: [1, 2], y: [[1, 2], [3, 4]] }, { a: [1, 2, { b: 'c' }], d: { e: 'f' }, x: [1, 2], y: [[1, 2], [3, 4]] }));
    test.isFalse(isEqual({ a: [1, 2, { b: 'c' }], d: { e: 'f' }, x: [1, 2], y: [[1, 2], [3, 4]] }, { a: [1, 2, { b: 'c' }], d: { e: 'g' }, x: [1, 2], y: [[1, 2], [3, 4]] }));
    test.isFalse(isEqual({ a: [1, 2, { b: 'c' }], d: { e: 'f' }, x: [1, 2], y: [[1, 2], [3, 4]] }, { a: [1, 2, { b: 'c' }], d: { e: 'f' }, x: [1, 2], y: [[1, 2], [30, 4]] }));
  });

  Tinytest.add('isEqual - should handle nested arrays', function (test) {
    test.isTrue(isEqual([{a: '1', b: 2, c: {a: 'a', b: 'b'}}, {x: '1', y: 2, z: {a: 'a', b: 'b'}}], [{a: '1', b: 2, c: {a: 'a', b: 'b'}}, {x: '1', y: 2, z: {a: 'a', b: 'b'}}]));
    test.isFalse(isEqual([{a: '1', b: 2, c: {a: 'a', b: 'b'}}, {x: '1', y: 2, z: {a: 'a', b: 'b'}}], [{a: '1', b: 2, c: {a: 'a', b: 'b'}}, {x: '1', y: 2, z: {a: 'c', b: 'b'}}]));
  });

  Tinytest.add('isEqual - should handle deeply nested arrays', function (test) {
    test.isTrue(isEqual([{a: '1', b: 2, c: {a: 'a', b: 'b'}, deep: [{a: '1', b: [1, 2, 3], c: {a: 'a', b: 'b'}}, {x: '1', y: [1, 2, 3], z: {a: 'a', b: 'b'}}]}, {x: '1', y: 2, z: {a: 'a', b: 'b'}}], [{a: '1', b: 2, c: {a: 'a', b: 'b'}, deep: [{a: '1', b: [1, 2, 3], c: {a: 'a', b: 'b'}}, {x: '1', y: [1, 2, 3], z: {a: 'a', b: 'b'}}]}, {x: '1', y: 2, z: {a: 'a', b: 'b'}}]));
    test.isFalse(isEqual([{a: '1', b: 2, c: {a: 'a', b: 'b'}, deep: [{a: '1', b: [1, 2, 3], c: {a: 'a', b: 'b'}}, {x: '1', y: [1, 2, 3], z: {a: 'a', b: 'b'}}]}, {x: '1', y: 2, z: {a: 'a', b: 'b'}}], [{a: '1', b: 2, c: {a: 'a', b: 'b'}, deep: [{a: '1', b: [1, 2, 3], c: {a: 'a', b: 'c'}}, {x: '1', y: [1, 2, 3], z: {a: 'a', b: 'b'}}]}, {x: '1', y: 2, z: {a: 'a', b: 'b'}}]));
  });

  Tinytest.add('isEqual - should handle edge cases', function (test) {
    test.isTrue(isEqual(undefined, undefined));
    test.isTrue(isEqual(null, null));
  });
}

Tinytest.add('condition - dependent where', function(test) {
  try {
    check(dependentWhereDataFail, dependentWhereSchema)
  } catch(error) {
    test.isTrue(error)
    test.equal(error.details[0].message,`Passwords must match`)
  }

  try {
    check(dependentWhereData, dependentWhereSchema)
    test.isTrue(true);
  } catch(error) {
    test.isTrue(error = undefined)
  }
});

Tinytest.addAsync('insert - ObjectID validates successfully', async (test) => {
   try {
    await Meteor.callAsync('insertNote', { text: 'hi', stuff: 'hi', something: 'sup', anotherSomething: 'sup' });
    test.isTrue(true)
  } catch(error) {
    test.isTrue(error = undefined);
  }
});

Tinytest.addAsync('throw all errors - successful', async (test) => {
  const _id = await Meteor.callAsync('insertNote', { text: 'hi', stuff: 'hi' })
   try {
    await Meteor.callAsync('updateNote', { _id, text: 2, stuff: 's', something: 'sup', anotherSomething: 'nope' });
    test.isTrue(false)
  } catch(error) {
    test.equal(error.details.length, 3)
    test.equal(error.details[0].message, 'Stuff must be hi and must be at least 2 characters')
    test.equal(error.details[1].message, 'Text must be a string, not number')
    test.equal(error.details[2].message, 'Somethings must match')
  }
});

Tinytest.add('getParams - successfully gets params', function (test) {
  const fn = text => { if (text !== 'stuff') throw 'text must be "stuff"' }
  const fn1 = ({text}) => { if (text !== 'stuff') throw 'text must be "stuff"' }
  const fn2 = ({text, checked}) => { if (text === 'stuff' && !checked) throw 'required' }
  const fn3 = ({checked, text}) => { if (text === 'stuff' && !checked) throw 'required' }
  const fn4 = ({text, checked, thing}) => { if (text !== 'stuff') throw 'text must be "stuff"' }
  const fn5 = function(text) { if (text !== 'stuff') throw 'text must be "stuff"'}
  const fn6 = function({text, checked}) { if (text !== 'stuff') throw 'text must be "stuff"'}
  const fn7 = function({text, checked, thing}) { if (text !== 'stuff') throw 'text must be "stuff"'}

  test.equal(_getParams(fn), [])
  test.equal(_getParams(fn1), ['text'])
  test.equal(_getParams(fn2), ['text', 'checked'])
  test.equal(_getParams(fn3), ['checked', 'text'])
  test.equal(_getParams(fn4), ['text', 'checked', 'thing'])
  test.equal(_getParams(fn5), [])
  test.equal(_getParams(fn6), ['text', 'checked'])
  test.equal(_getParams(fn7), ['text', 'checked', 'thing'])
});

const Fruits = new Mongo.Collection('fruits');

Tinytest.addAsync('config - base', async (test) => {
  EasySchema.configure({
    base: { thing: String, aDate: { type: Date, default: Date.now } }
  });

  test.equal(EasySchema.config.base.thing, String)
  test.equal(EasySchema.config.base.aDate.type, Date)

  const aSchema = {
    _id: String,
    num: Number
  }

  Fruits.attachSchema(aSchema);

  test.equal(Fruits.schema._id, String)
  test.equal(Fruits.schema.num, Number)
  test.equal(Fruits.schema.thing, String)
  test.equal(Fruits.schema.aDate, Date)
});

