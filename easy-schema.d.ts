import { Match } from 'meteor/check';

/**
 * Check that data matches a schema.
 * @param data The data to check
 * @param schema The schema to match `data` against
 */
export declare function check<T extends Match.Pattern>(
  data: any,
  schema: T
): asserts data is Match.PatternMatch<T>;


/** Matches any value. */
export declare const Any: Match.Matcher<any>;
/** Matches a signed 32-bit integer. Doesn’t match `Infinity`, `-Infinity`, or `NaN`. */
export declare const Integer: Match.Matcher<number>;

/**
  * Matches either `undefined`, `null`, or pattern. If used in an object, matches only if the key is not set as opposed to the value being set to `undefined` or `null`. This set of conditions
  * was chosen because `undefined` arguments to Meteor Methods are converted to `null` when sent over the wire.
  */
export declare function Optional<T extends Pattern>(
  pattern: T
): Matcher<PatternMatch<T> | undefined | null>;

/**
 * Shapes an object based on a POJO.
 *
 * @param {Object} obj - The object to be shaped.
 * @param {Object} [options] - Options object.
 * @param {boolean} [options.optionalize=false] - If true, marks all properties as optional.
 * @returns {Object} The shaped object that's ready to use with jam:easy-schema `check`.
 */
export declare const shape: (obj: Record<string, any>, options?: { optionalize?: boolean }) => Record<string, any>;

/**
 * Creates a new object composed of the specified keys and their corresponding values from the given object.
 *
 * @param {Object} obj - The source object from which to pick keys.
 * @param {string[]} keys - An array of keys to pick from the source object.
 * @returns {Object} - A new object containing only the specified keys and their values.
 */
export declare const pick: (obj: Record<string, any>, keys: string[]) => Record<string, any>;

export declare const EasySchema: {
  /**
    * Readonly configuration options for EasySchema.
    */
  readonly config: {
    autoCheck?: boolean;
    autoAttachJSONSchema?: boolean;
    validationAction?: string;
    validationLevel?: string;
    additionalBsonTypes?: object;
  },
  /**
   * Configures the settings for EasySchema.
   */
  configure: (options: {
    autoCheck?: boolean;
    autoAttachJSONSchema?: boolean;
    validationAction?: string;
    validationLevel?: string;
    additionalBsonTypes?: object;
  }) => object,
  /**
   * Make a field required that was optional. See docs for more info.
   */
  readonly REQUIRED: string,
  /**
   * Used to skip auto check on a one-off basis inside a Meteor Method body.
   */
  skipAutoCheck: Function
};

declare module 'meteor/mongo' {
  module Mongo {
    interface Collection<T> {
      attachSchema(schema: object): void;
      schema?: Match.Pattern;
    }
  }
}
