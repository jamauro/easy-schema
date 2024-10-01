export function merge(source, target) {
  for (const [key, val] of Object.entries(source)) {
    if (val !== null && typeof val === `object`) {
      target[key] ??=new val.__proto__.constructor();
      merge(val, target[key]);
    } else {
      target[key] = val;
    }
  }

  return target; // we're replacing in-situ, so this is more for chaining than anything else
}
