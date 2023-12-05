import { Meteor } from 'meteor/meteor';
import { Mongo, MongoInternals } from 'meteor/mongo';
import { Any, Optional, Integer, AnyOf, Where, shape, getValue, allowed, hasOperators, isArray, ss, REQUIRED, getParams, enforce } from './shared';
import { pick, isObject, isEmpty } from './utils';
import { ValidationError } from 'meteor/mdg:validation-error';
import { flatten, unflatten } from 'flat'
import { check as c } from 'meteor/check';

const config = {
  ...ss,
  autoCheck: true,
  autoAttachJSONSchema: true,
  validationAction: 'error',
  validationLevel: 'strict',
  additionalBsonTypes: {} // allows user to set additional key, value pairs in typeMap
};

const typeMap = {
  String: 'string',
  Number: 'double', // double for mongo, number for jsonschema
  Boolean: 'bool', // bool for mongo, boolean for jsonschema
  Date: 'date',
  Object: 'object',
  Array: 'array',
  ['__integer__']: 'int', // int for mongo, integer for jsonschema,
  Decimal: 'decimal', // only avaiable when using the mongo-decimal package
  // BigInt: 'long' // untested, commenting out for now. also the team that works on the mongo node driver is working on some things around this so let's wait to see what they do. https://jira.mongodb.org/browse/NODE-3126
};

const configure = options => {
  c(options, {
    basePath: Match.Maybe(String),
    autoCheck: Match.Maybe(Boolean),
    autoAttachJSONSchema: Match.Maybe(Boolean),
    validationAction: Match.Maybe(String),
    validationLevel: Match.Maybe(String),
    additionalBsonTypes: Match.Maybe(Object)
  });

  if (!isEmpty(options.additionalBsonTypes)) {
    Object.assign(typeMap, options.additionalBsonTypes)
  }

  return Object.assign(config, options);
}

const skipAutoCheck = () => config.autoCheck = false;

const deepPartialify = obj => {
  const rules = [];

  const sculpt = (obj, currentPath = [], skip = false) => {
    return Object.entries(obj).reduce((acc, [k, v]) => {
      const path = skip ? currentPath : [...currentPath, k]; // we don't want to add Optional or AnyOf keys – 'pattern', '0' – to the path which we use for $rules so we use skip
      const { value, optional, anyOf } = getValue(v);

      if (optional) {
        acc[k] = Optional(...Object.values(sculpt(v, path, true)));
      } else if (anyOf) {
        acc[k] = Optional(AnyOf(...Object.values(sculpt(value, path, true))));
      } else if (isObject(value) && value.hasOwnProperty('type')) {
        const { type, ...conditions } = value;
        const { where, ...restConditions } = conditions;
        const deps = typeof where === 'function' ? getParams(where).filter(n => n !== k) : [];

        if (Object.keys(conditions).some(i => !allowed.includes(i))) {
          acc[k] = Optional(sculpt(value));
        } else {
          if (isEmpty(conditions)) {
            acc[k] = Optional(type);
          } else {
            const { value: tValue, optional: tOptional } = getValue(type);
            const finalConditions = deps.length ? restConditions : conditions;
            acc[k] = tOptional ? Optional(Where({ type: tValue, ...finalConditions })) : Optional(Where({ type, ...finalConditions }));
          }
        }

        if (deps.length) {
          rules.push({
            path,
            rule: where,
            deps
          });
        }
      } else if (isArray(value)) {
        acc[k] = isArray(value[0]) ? Optional([Where({ type: value })]) : Optional([...Object.values(sculpt(v, path))]);
      } else if (isObject(value)) {
        acc[k] = Optional(sculpt(value, path));
      } else {
        acc[k] = Optional(v);
      }
      return acc;
    }, {});
  };

  const result = sculpt(obj);
  rules.length && (result.$rules = rules);
  return result;
};

const minProps = {
  int: 'minimum',
  decimal: 'minimum',
  double: 'minimum',
  string: 'minLength',
  array: 'minItems',
  object: 'minProperties'
};

const maxProps = {
  int: 'maximum',
  decimal: 'maximum',
  double: 'maximum',
  string: 'maxLength',
  array: 'maxItems',
  object: 'maxProperties'
};

const createQualifiers = ({ type, conditions }) => {
  const qualifiers = {}
  if (conditions.hasOwnProperty('min')) {
    qualifiers[minProps[type]] = conditions['min'];
  }

  if (conditions.hasOwnProperty('max')) {
    qualifiers[maxProps[type]] = conditions['max'];
  }

  if (conditions.hasOwnProperty('regex')) {
    qualifiers['pattern'] = conditions['regex'];
  }

  if (conditions.hasOwnProperty('allow')) {
    qualifiers['enum'] = conditions['allow'];
  }

  if (conditions.hasOwnProperty('unique')) {
    qualifiers['uniqueItems'] = conditions['unique'];
  }

  if (conditions.hasOwnProperty('additionalProperties')) {
    qualifiers['additionalProperties'] = conditions['additionalProperties'];
  }

  return qualifiers;
}

// MONGO uses bsonType instead of type
const createJSONSchema = (obj) => {
  let optionalKeys = [];

  // Iterate over the keys and values of the input object.
  const properties = Object.entries(obj).reduce((acc, [k, v]) => {
    const { value, optional, anyOf } = getValue(v);

    if (optional) {
      optionalKeys = [...optionalKeys, k]
    }

    const property = (() => {
      if (optional) {
        return Object.values(createJSONSchema(v).properties)[0];
      } else if (anyOf) {
        return { anyOf: value.map(i => createJSONSchema({ items: i }).properties.items) }
      } else if (isObject(value) && value.hasOwnProperty('type')) {
        const { type, where, ...conditions } = value;

        if (Object.keys(conditions).some(i => !allowed.includes(i))) { // this prevents a situation where the user has a {type: } as part of their schema but did not intend to use it to create conditions
          return createJSONSchema(value);
        } else {
          const { value: typeValue, optional } = getValue(type);
          if (optional) {
            optionalKeys = [...optionalKeys, k]
          }

          if (isObject(typeValue)) {
            return { ...createJSONSchema({ items: typeValue }).properties.items, ...(conditions && createQualifiers({ type: 'object', conditions })) };
          }

          // for case when type is an array, e.g. {type: [String], min: //}
          if (isArray(typeValue)) {
            return { ...createJSONSchema({ items: typeValue }).properties.items, ...(conditions && createQualifiers({ type: 'array', conditions })) };
          }

          const mappedType = typeMap[typeValue.name || typeValue];
          return { bsonType: mappedType, ...(conditions && createQualifiers({ type: mappedType, conditions })) };
        }
      } else if (isArray(value)) {
        const { value: firstValue, optional, anyOf } = getValue(value[0]);
        const { type: fvType, ...conditions } = firstValue; // might be using [{type: }]
        const { value: typeValue, optional: fvTypeOptional } = getValue(fvType);
        const items = isArray(value[0]) ? firstValue.map(f => createJSONSchema({ items: f }).properties.items) : createJSONSchema({ items: value[0] }).properties.items;

        return { bsonType: 'array', items, ...((optional || fvTypeOptional) && { minItems: 0 }) }
      } else if (isObject(value)) {
        return createJSONSchema(value);
      } else {
        const type = typeMap[value?.name || value];
        return type ? { bsonType: type } : value === null ? { bsonType: 'null' } : {};
      }
    })();

    acc[k] = property;
    return acc;
  }, {});

  // Check if the optional property is set in the schema object.
  const required = Object.keys(properties).filter(key => !optionalKeys.includes(key));

  return {
    bsonType: 'object',
    properties,
    required,
    additionalProperties: obj.additionalProperties ?? false
  };
};

const db = MongoInternals.defaultRemoteCollectionDriver().mongo.db;

const addSchema = async (name, schema) => {
  return await db.command({
    collMod: name,
    validationAction: config.validationAction,
    validationLevel: config.validationLevel,
    validator: { $jsonSchema: schema },
  });
};

Mongo.Collection.prototype.attachSchema = async function(schema = undefined) {
  try {
    const schemaToAttach = schema ? schema : (require(`${config.basePath}/${this._name}/schema.js`)).schema;
    if (!schemaToAttach) {
      throw new Error('No schema found');
    }

    const collection = this;
    collection.schema = { ...shape(schemaToAttach), '$id': `/${collection._name}` };
    collection._schemaDeepPartial = deepPartialify({ ...schemaToAttach, '$id': `/${collection._name}` });

    if (!config.autoAttachJSONSchema) { // optional setting that allows user to not attach a JSONSchema to the collection in the db
      return;
    }

    // the collection technically doesn't exist in the db until you insert a doc even though it was already initialized with new Mongo.Collection
    // so we check if it exists and if not, we insert a doc and then remove it before adding the schema so we don't run into validation errors
    const collectionNames = (await db.listCollections({}, { nameOnly: true }).toArray()).map(c => c.name);
    if (!collectionNames.includes(collection._name)) {
      skipAutoCheck();
      await collection.insertAsync({ _id: 'setup schema' });
      await collection.removeAsync({ _id: 'setup schema' });
    }

    const mongoJSONSchema = createJSONSchema(schemaToAttach);

    return addSchema(`${collection._name}`, mongoJSONSchema);
  } catch(error) {
    console.error(error)
  }
};

const transformObject = (obj, isArrayOperator, isCurrentDateOperator, isBitOperator) => Object.entries(obj).reduce((acc, [k, v]) => {
  const replaced = k.replace(/\$\[\w*]|\$|\d+/g, '0'); // replaces $, $[], $[any words], and digit with 0
  const endsWithPositionalOperator = replaced.endsWith('.0');
  const newKey = replaced.replace(/.0$/, ""); // strip off last .0 so we can make comparisons easy

  acc[newKey] = (isArrayOperator || endsWithPositionalOperator) ? (Object.keys(v).includes('$each') ? Object.values(v)[0] : [v]) : isCurrentDateOperator ? new Date() : isBitOperator ? Object.values(v)[0] : v;
  return acc;
}, {});

const supportedOperators = ['$set', '$setOnInsert', '$inc', '$addToSet', '$push', '$min', '$max', '$mul', '$currentDate', '$bit'];
const transformModifier = modifier => flatten(Object.entries(modifier).reduce((acc, [k, v]) => {
  if (!supportedOperators.includes(k)) {
    if (!k.startsWith('$')) acc[k] = v // support for the upsert use case where we want to validate against the query
    return acc;
  }
  const isArrayOperator = ['$addToSet', '$push'].includes(k);
  const isCurrentDateOperator = k === '$currentDate';
  const isBitOperator = k === '$bit';

  return { ...acc, ...transformObject(v, isArrayOperator, isCurrentDateOperator, isBitOperator) }
}, {}), { safe: true }); // safe: true preserves arrays when using flatten

const check = (data, schema, { full = false } = {}) => { // the only reason we don't have this in shared is to reduce bundle size on the client
  const dataHasOperators = data && hasOperators(data);
  const transformedModifier = dataHasOperators && transformModifier(data);
  const dataToCheck = dataHasOperators ? unflatten(transformedModifier) : data;

  const schemaIsObject = isObject(schema);
  const { $id, ...schemaRest } = schemaIsObject ? schema : {}; // we don't need to check $id, so we remove it
  const { $rules, ...shapedSchema } = schemaIsObject ? (schema['$id'] ? schemaRest : dataHasOperators ? deepPartialify(schema) : shape(schema)) : {}; // if we have an $id, then we've already shaped / deepPartialified as needed so we don't need to do it again, otherwise a custom schema has been passed in and it needs to be shaped / deepPartialified

  if (full) {
    delete shapedSchema._id // we won't have an _id when doing an insert with full, so we remove it from the schema
  }

  const schemaToCheck = schemaIsObject ? ((dataHasOperators || full) ? shapedSchema : pick(shapedSchema, Object.keys(dataToCheck))) : schema; // basically we only want to pick when necessary, e.g. on the initial check with the args passed in from the client to the server

  try {
    c(dataToCheck, schemaToCheck);

    $rules && enforce(dataToCheck, $rules)

    return true;
  } catch (error) {
    const formattedMessage = error.message?.includes('Match.Where') ? `${error.path} failed condition` : `${error.message.replace(/\b(Match error:|Error:)\s*/g, '')}` // replaceAll is Node 15+ .message?.replaceAll('Match error: ', '')
    const message = formattedMessage === REQUIRED ? `${REQUIRED} '${error.path}'` : formattedMessage;
    const type = message.includes('Missing') ? 'required' : message.includes('Expected') ? 'type' : 'condition';
    const name = error.path || message.split("'")[1];

    throw new ValidationError([{ name, type, message }]);
  }
};

// Wrap DB write operation methods
// Only run on the server since we're already validating through Meteor methods.
// This is validation of the data being written before it's inserted / updated / upserted.
export const isMeteor2 = Meteor.release.split('@')[1].split('.')[0] === '2'; // eventually remove this when Meteor drops *Async post 3.0
const writeMethods = ['insert', 'update', 'upsert'].map(m => isMeteor2 ? m : `${m}Async`); // eventually this .map when Meteor drops *Async post 3.0
Meteor.startup(() => {
  // autoCheck defaults to true but if user configures it to be false, then we don't wrap the write operation methods
  Meteor.isServer && config.autoCheck && writeMethods.forEach(methodName => {
    const method = Mongo.Collection.prototype[methodName];
    Mongo.Collection.prototype[methodName] = function(...args) {
      const collection = this;
      const { _name, schema, _schemaDeepPartial } = collection;

      // autoCheck can also be skipped on a one-off basis per method call, so we check here if that's the case
      if (!config.autoCheck) {
        const result = method.apply(collection, args);
        config.autoCheck = true;
        return result;
      }

      if (!schema) {
        return method.apply(collection, args);
      }

      const isUpdate = ['update', 'updateAsync'].includes(methodName);
      const isUpsert = ['upsert', 'upsertAsync'].includes(methodName) || (isUpdate && (args[2]?.hasOwnProperty('upsert') || false) && args[2]['upsert']);
      const isUserServicesUpdate = isUpdate && _name === 'users' && Object.keys(Object.values(args[1])[0])[0].split('.')[0] === 'services';

      // If you do have a Meteor.users schema, then this prevents a check on Meteor.users.services updates that run periodically to resume login tokens and other things that don't need validation
      if (isUserServicesUpdate) {
        return method.apply(collection, args);
      }

      const data = isUpsert ? { ...args[0], ...args[1] } : isUpdate ? args[1] : args[0];
      const schemaToCheck = isUpdate ? _schemaDeepPartial : schema;
      const full = !isUpdate; // inserts only

      check(data, schemaToCheck, { full });

      return method.apply(collection, args);
    }
  });
});

const EasySchema = { config, configure, skipAutoCheck, REQUIRED }
export { Integer, Any, Optional, AnyOf, check, createJSONSchema, EasySchema };
