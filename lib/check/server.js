import { check as c, Match } from 'meteor/check';
import { Mongo } from 'meteor/mongo';
import { Collections } from '../attach/server.js';
import { shape, meta, enforce, Optional, isOptional } from '../shape.js';
import { isObject, pick, hasOperators, formatErrors } from '../utils/shared';
import { ValidationError } from 'meteor/mdg:validation-error';
import { flatten, unflatten } from 'flat';

const getCollection = name => Mongo.getCollection ? Mongo.getCollection(name) : Collections?.get(name); // adding for backwards compatability pre Meteor 3.0.2. can probably be removed one day to just use Mongo.getCollection only

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

/**
 * @summary Check that data matches a schema pattern.
 * If the data does not match the schema, a `ValidationError` is thrown.
 *
 * @param {any} data The data to check
 * @param {Pattern} schema The schema to match `data` against
 * @param {Object} [options] Additional options for validation
 * @param {boolean} [options.full] Perform a full validation (on the server only)
 *
 * @throws {ValidationError} If the data does not conform to the schema
 */
export const check = (data, schema, { full = false } = {}) => { // the only reason we don't have this in shared is to reduce bundle size on the client
  const dataHasOperators = hasOperators(data);
  const transformedModifier = dataHasOperators && transformModifier(data);
  const dataToCheck = dataHasOperators ? unflatten(transformedModifier) : data;

  const isSchemaObject = isObject(schema);
  const { name, shaped, optionalized } = schema[meta] || {};
  const schemaDeepOptional = optionalized ? schema : dataHasOperators && (getCollection(name)?._schemaDeepOptional || shape(schema, { optionalize: true }));

  const shapedSchema = !isSchemaObject ? schema : dataHasOperators ? schemaDeepOptional : shaped ? schema : shape(schema); // if we've already shaped / deepOptionalized use it, otherwise a custom schema has been passed in and it needs to be shaped
  const { extra, rules } = shapedSchema[meta] || {};

  if (full && !dataToCheck?._id && shapedSchema._id && !isOptional(shapedSchema._id)) { // we likely won't have an _id (unless it's been preset) when doing an insert, so we make it optional
    shapedSchema._id = Optional(shapedSchema._id)
  }

  const schemaToCheck = !isSchemaObject ? schema : name && !full ? pick(shapedSchema, Object.keys(dataToCheck)) : shapedSchema; // we only want to pick when necessary
  const errors = [];

  try {
    c(dataToCheck, extra ? Match.ObjectIncluding(schemaToCheck) : schemaToCheck, { throwAllErrors: true });
  } catch (e) {
    Array.isArray(e) ? errors.push(...e) : errors.push(e);
  }

  try  {
    enforce(dataToCheck, rules);
  } catch (e) {
    errors.push(...e)
  }

  if (errors.length) {
    throw new ValidationError(formatErrors(errors));
  }

  return;
};
