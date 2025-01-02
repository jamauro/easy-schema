import { Match } from 'meteor/check';

export declare const has: unique symbol;

type HasFluentSchema<T> = {
  [has]: BaseSchema<T>
};

// Object pattern limited to 
export type ObjectPattern<T> = {
  type: HasFluentSchema<T>
};

export type Pattern = 
  | BaseSchema<any>
  | HasFluentSchema<any>
  | ObjectPattern<any>
  | [Pattern]
  // Meteor Check doesn't require Pattern[], because check schemas are ephemeral
  // so typescript gives e.g. [String] the strict type of [StringConstructor]
  // but a schema declared as a variable does not have this benefit of the doubt
  // and is inferred as StringConstructor[]
  // Object.freeze or `as const` makes TS complain about mutability... can't win.
  | Pattern[]
  | {[key: string]: Pattern}
  | Match.Pattern;

export type PatternMatch<T extends Pattern> =
  T extends BaseSchema<infer U> ? U :
  T extends HasFluentSchema<infer U> ? U :
  T extends [Pattern] ? PatternMatch<T[0]>[] :
  T extends Pattern[] ? PatternMatch<T[0]>[] :
  T extends ObjectPattern<infer U> ? U :
  T extends {[key: string]: Pattern} ? {[K in keyof T]: PatternMatch<T[K]>} :
  Match.PatternMatch<T>;

// Base Schema class for common behavior
declare class BaseSchema<T> {
  constructor(type: T);

  default(value: any): this;
  where(value: (item: T) => boolean): this;
  enums(value: any, message?: string): this;
}

// Specialized schemas for different types
declare class StringSchema extends BaseSchema<string> {
  min(value: number | string, message?: string): this;
  max(value: number | string, message?: string): this;
  regex(value: RegExp, message?: string): this;
}

declare class NumberSchema extends BaseSchema<number> {
  min(value: number, message?: string): this;
  max(value: number, message?: string): this;
}

declare class ArraySchema extends BaseSchema<any[]> {
  min(value: number, message?: string): this;
  max(value: number, message?: string): this;
  unique(value?: boolean): this;
  only(value?: any): this;
}

declare class ObjectSchema extends BaseSchema<object> {
  min(value: number, message?: string): this;
  max(value: number, message?: string): this;
  extra(value?: boolean): this;
  only(value?: any): this;
}

// Augment native constructors with "has" symbol-based getter
declare global {
  interface StringConstructor {
    [has]: StringSchema;
  }

  interface NumberConstructor {
    [has]: NumberSchema;
  }

  interface ArrayConstructor {
    [has]: ArraySchema;
  }

  interface ObjectConstructor {
    [has]: ObjectSchema;
  }

  interface BooleanConstructor {
    [has]: BaseSchema<boolean>;
  }

  interface DateConstructor {
    [has]: BaseSchema<Date>;
  }
}

// Custom types for Integer, ID, and ObjectID
interface IntegerConstructor {
  [has]: NumberSchema;
}

interface IDConstructor {
  [has]: BaseSchema<string>;
}

interface ObjectIDConstructor {
  [has]: BaseSchema<Mongo.ObjectID>;
}

interface DecimalConstructor {
  [has]: BaseSchema<any>;
}

export declare const ID: IDConstructor;
export declare const ObjectID: ObjectIDConstructor;

/**
 * Check that data matches a schema.
 * @param data The data to check
 * @param schema The schema to match `data` against
 */
export declare function check<T extends Pattern>(
  data: any,
  schema: T
): asserts data is PatternMatch<T>;


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
): Match.Matcher<PatternMatch<T> | undefined | null>;

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
    base?: object;
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
    base?: object;
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
};

declare module 'meteor/mongo' {
  namespace Mongo {
    interface Collection<T> {
      attachSchema<U extends Pattern>(schema: U): Collection<PatternMatch<U>>
      schema?: Pattern;
    }
  }
}
