import { check as c, Match } from 'meteor/check';
import { shape, _shaped, _extra, _rules, enforce } from '../shape.js';
import { isObject, pick, hasOperators, formatErrors } from '../utils/shared';
import { ValidationError } from 'meteor/mdg:validation-error';
import { flatten, unflatten } from 'flat';

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
 * If the data does not match the schema, throw a `Validation Error`.
 *
 * @param {Any} data The data to check
 * @param {Pattern} schema The schema to match `data` against
 */
export const check = (data, schema, { full = false } = {}) => { // the only reason we don't have this in shared is to reduce bundle size on the client
  const dataHasOperators = hasOperators(data);
  const transformedModifier = dataHasOperators && transformModifier(data);
  const dataToCheck = dataHasOperators ? unflatten(transformedModifier) : data;

  const schemaIsObject = isObject(schema);
  const { $id, ...schemaRest } = schemaIsObject ? schema : {}; // we don't need to check $id, so we remove it
  const shapedSchema = schemaIsObject ? (($id || schema[_shaped]) ? schemaRest : dataHasOperators ? shape(schema, {optionalize: true}) : shape(schema)) : {}; // if we have an $id, then we've already shaped / deepOptionalized as needed so we don't need to do it again, otherwise a custom schema has been passed in and it needs to be shaped / deepOptionalized
  const extra = shapedSchema[_extra];
  const rules = shapedSchema[_rules];

  if (full && !dataToCheck._id) {
    delete shapedSchema._id // we likely won't have an _id (unless it's been preset) when doing an insert with full, so we remove it from the schema
  }

  const schemaToCheck = schemaIsObject ? ((dataHasOperators || full || schema[_shaped] && !$id) ? shapedSchema : pick(shapedSchema, Object.keys(dataToCheck))) : schema; // basically we only want to pick when necessary
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
