import { check as c } from 'meteor/check';
import { Any, Optional, Integer, AnyOf, shape, shaped, hasOperators, REQUIRED, enforce } from './shared';
import { isObject, pick, capitalize } from './utils';
import { ValidationError } from 'meteor/mdg:validation-error';

const configure = () => {}; // no-op on the client side. this is here to support isomorphic code
const skipAutoCheck = () => {}; // no-op on the client side. this is here to support isomorphic code inside Meteor Methods.

Mongo.Collection.prototype.attachSchema = function(schema) {
  if (!schema) {
    throw new Error('You must pass in a schema');
  }

  this.schema = { ...shape(schema), '$id': `/${this._name}` };
  return;
};

const check = (data, schema) => { // full check only happens on the server so it's not an argument here
  if (data && hasOperators(data)) { // check on the client doesn't validate update operators to reduce bundle size and since it shouldn't be necessary. update operators are checked on the server.
    return;
  }

  // schema passed in can be customized instead of using the one on the collection.
  // if it it's already been shaped, then we don't need to do that again but otherwise we do so that {type: } and conditions are converted properly
  const schemaToCheck = isObject(schema) ? (schema['$id'] ? pick(schema, Object.keys(data)) : (schema[shaped] ? schema : shape(schema))) : schema;

  try {
    c(data, schemaToCheck);

    const $rules = schema['$rules'];
    $rules && enforce(data, $rules);

  } catch ({ path, message: m }) {
    const type = m.includes('Missing key') ? 'required' : m.includes('Expected') ? 'type' : 'condition';
    const matches = type === 'type' && (m.match(/Expected (.+), got (.+) in/) || m.match(/Expected (.+) in/));
    const errorMessage = type === 'required' ? 'is required' : matches ? `must be a ${matches[1]}${matches[2] ? `, not ${matches[2]}` : ''}` : m.replace(/\b(Match error:|w:|in field\s\S*)/g, '').trim();
    const splitPath = path.split('.');
    const name = splitPath.pop();
    const message = (name && (type !== 'condition' || !m.includes('w:'))) ? `${capitalize(name.replace(/([A-Z])/g, ' $1'))} ${errorMessage}` : errorMessage;

    throw new ValidationError([{ name, type, message, ...(splitPath.length > 1 && {path}) }]);
  }
};

const EasySchema = { skipAutoCheck, configure, REQUIRED };
export { shape, check, Any, Optional, Integer, AnyOf, EasySchema };
