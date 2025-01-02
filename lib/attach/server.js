import { Mongo, MongoInternals } from 'meteor/mongo';
import { config, typeMap } from '../config/server';
import { shape, getValue, isArray, ALLOWED, ID_PATTERN } from '../shape.js';
import { isObject } from '../utils/shared';

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
  if ('min' in conditions) {
    qualifiers[minProps[type]] = Array.isArray(conditions['min']) ? conditions['min'][0] : conditions['min'];
  }

  if ('max' in conditions) {
    qualifiers[maxProps[type]] = Array.isArray(conditions['max']) ? conditions['max'][0] : conditions['max'];
  }

  if ('regex' in conditions) {
    qualifiers['pattern'] = (Array.isArray(conditions['regex']) ? conditions['regex'][0] : conditions['regex']).source;
  }

  if ('enums' in conditions) {
    const enums = conditions['enums'];
    const alwErr = enums.some(Array.isArray) && typeof ([last] = enums.slice(-1))[0] === 'string' ? last : undefined;
    qualifiers['enum'] = alwErr ? enums[0] : enums;
  }

  if ('unique' in conditions) {
    qualifiers['uniqueItems'] = Array.isArray(conditions['unique']) ? conditions['unique'][0] : conditions['unique'];
  }

  if ('extra' in conditions) {
    qualifiers['additionalProperties'] = conditions['extra'];
  }

  return qualifiers;
}

const getTypeID = value => {
  if (!value.condition) return undefined;

  const condition = value.condition.toString();
  return condition.includes('ID_PATTERN') ? 'ID' : condition.includes('ObjectID') ? 'ObjectID' : undefined;
};

// MONGO uses bsonType instead of type
export const createJSONSchema = (obj) => {
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
        const { type, default: dValue, where, ...conditions } = value;

        if (Object.keys(conditions).some(i => !ALLOWED.includes(i))) { // this prevents a situation where the user has a {type: } as part of their schema but did not intend to use it to create conditions
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

          const typeID = getTypeID(typeValue);
          const mappedType = typeMap[typeID ?? (typeValue.name || typeValue)];
          return { bsonType: mappedType, ...(typeID === 'ID' && { pattern: ID_PATTERN.source }), ...(conditions && createQualifiers({ type: mappedType, conditions })) };
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
        const typeID = getTypeID(value);
        const type = typeMap[typeID ?? (value?.name || value)];
        return type ? { bsonType: type, ...(typeID === 'ID' && { pattern: ID_PATTERN.source }) } : value === null ? { bsonType: 'null' } : {};
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
    additionalProperties: obj.extra ?? false
  };
};

const db = MongoInternals.defaultRemoteCollectionDriver().mongo.db;

const attachMongoSchema = async (collection, schema) => {
  try {
    if (!config.autoAttachJSONSchema) { // optional setting that allows user to not attach a JSONSchema to the collection in the db
      return;
    }

    const mongoJSONSchema = createJSONSchema(schema);
    const options = {
      validationAction: config.validationAction,
      validationLevel: config.validationLevel,
      validator: { $jsonSchema: mongoJSONSchema }
    };

    const { _name } = collection;
    const exists = _name === 'users' || await db.listCollections({ name: _name }).hasNext(); // when using Meteor's Accounts system, the users collection had already been established at this point but db.listCollections wasn't able to find it

    return exists ? await db.command({ collMod: _name, ...options }) : await db.createCollection(_name, options);
  } catch (error) {
    console.error(error)
  }
}

/**
 * @summary Attach a schema to a collection
 *
 * @param {Object} schema The schema to attach
 */
Mongo.Collection.prototype.attachSchema = function(schema) {
  try {
    if (!schema) {
      throw new Error('You must pass in a schema');
    }

    const collection = this;
    const fullSchema = {...schema, ...config.base};

    /** @type {import('meteor/check').Match.Pattern} */
    collection.schema = { ...shape(fullSchema), '$id': `/${collection._name}` };

    /** @type {import('meteor/check').Match.Pattern} */
    collection._schemaDeepOptional = { ...shape(fullSchema, {optionalize: true}), '$id': `/${collection._name}` };

    attachMongoSchema(collection, fullSchema);

    return this;
  } catch (error) {
    console.error(error)
  }
};
