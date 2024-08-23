import { check as c } from 'meteor/check';
import { Any, ObjectID, Optional, Integer, AnyOf, shape, _shaped, _getParams, hasOperators, REQUIRED, enforce, formatErrors } from './shared';
import { isObject, pick } from './utils';
import { ValidationError } from 'meteor/mdg:validation-error';

const configure = () => { }; // no-op on the client side. this is here to support isomorphic code
const skipAutoCheck = () => { }; // no-op on the client side. this is here to support isomorphic code inside Meteor Methods.

/**
 * @summary Attach a schema to a collection
 *
 * @param {Object} schema The schema to attach
 */
Mongo.Collection.prototype.attachSchema = function(schema) {
  if (!schema) {
    throw new Error('You must pass in a schema');
  }

  /** @type {import('meteor/check').Match.Pattern} */
  this.schema = Object.assign(shape(schema), { '$id': `/${this._name}` });
  return;
};

/**
 * @summary Check that data matches a [schema](#matchpatterns).
 * If the data does not match the schema, throw a `Validation Error`.
 *
 * @param {Any} data The data to check
 * @param {MatchPattern} schema The schema to match `data` against
 */
const check = (data, schema) => { // full check only happens on the server so it's not an argument here
  if (data && hasOperators(data)) { // check on the client doesn't validate update operators to reduce bundle size and since it shouldn't be necessary. update operators are checked on the server.
    return;
  }

  // schema passed in can be customized instead of using the one on the collection.
  // if it it's already been shaped, then we don't need to do that again but otherwise we do so that {type: } and conditions are converted properly
  const { $rules, ...schemaToCheck } = isObject(schema) ? (schema[_shaped] ? (schema['$id'] ? pick(schema, Object.keys(data)) : schema) : shape(schema)) : schema;
  const errors = [];

  try {
    c(data, schemaToCheck, { throwAllErrors: true });
  } catch (e) {
    Array.isArray(e) ? errors.push(...e) : errors.push(e);
  }

  try  {
    enforce(data, $rules);
  } catch (e) {
    errors.push(...e)
  }

  if (errors.length) {
    throw new ValidationError(formatErrors(errors));
  }

  return;
};

const EasySchema = { skipAutoCheck, configure, REQUIRED };
export { shape, check, pick, _getParams, Any, ObjectID, Optional, Integer, AnyOf, EasySchema };
