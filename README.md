joi-to-swagger
==============

[![npm](https://img.shields.io/npm/v/joi-to-swagger.svg?logo=npm)](https://www.npmjs.com/package/joi-to-swagger)
[![Dependency Status](https://img.shields.io/david/Twipped/joi-to-swagger.svg?style=flat-square)](https://david-dm.org/Twipped/joi-to-swagger)
[![Download Status](https://img.shields.io/npm/dm/joi-to-swagger.svg?style=flat-square)](https://www.npmjs.com/package/joi-to-swagger)

Conversion library for transforming [Joi](http://npm.im/joi) schema objects into [Swagger](http://swagger.io) schema definitions.

```js
// input
joi.object().keys({
  id:      joi.number().integer().positive().required(),
  name:    joi.string(),
  email:   joi.string().email().required(),
  created: joi.date().allow(null),
  active:  joi.boolean().default(true),
})
```

```json5
// output
{
  "type": "object",
  "required": ["id", "email"],
  "properties": {
    "id": {
      "type": "integer",
      "minimum": 1
    },
    "name": {
      "type": "string"
    },
    "email": {
      "type": "string",
      "format": "email"
    },
    "created": {
      "type": "string",
      "nullable": true,
      "format": "date-time"
    },
    "active": {
      "type": "boolean"
    }
  }
}
```

## Usage

```js
var j2s = require('joi-to-swagger');

var {swagger, components} = j2s(mySchema, existingComponents);
```

J2S takes two arguments, the first being the Joi object you wish to convert. The second optional argument is a collection of existing components to reference against for the meta `className` identifiers (see below).

J2S returns a result object containing `swagger` and `components` properties. `swagger` contains your new schema, `components` contains any components that were generated while parsing your schema.

## Supported Conventions:

- `joi.object()`
  - `.unknown(false)` -> `additionalProperties: false`
  - `.required()` on object members produces a `"required": []` array

- `joi.array().items()` defines the structure using the first schema provided on `.items()` (see below for how to override)
  - `.min(4)` -> `"minItems": 4`
  - `.max(10)` -> `"maxItems": 10`
  - `.unique(truthy)` -> `"uniqueItems": true`

- `joi.number()` produces `"type": "number"` with a format of `"float"`
  - `.precision()` -> `"format": "double"`
  - `.integer()` -> `"type": "integer"`
  - `.strict().only(1, 2, '3')` -> `"enum": [1, 2]` (note that non-numbers are omitted due to swagger type constraints)
  - `.allow(null)` -> `"nullable": true`
  - `.min(5)` -> `"minimum": 5`
  - `.max(10)` -> `"maximum": 10`
  - `.positive()` -> `"minimum": 1`
  - `.negative()` -> `"maximum": -1`

- `joi.string()` produces `"type": "string"` with no formatting
  - `.strict().only('A', 'B', 1)` -> `"enum": ["A", "B"]` (note that non-strings are omitted due to swagger type constraints)
  - `.alphanum()` -> `"pattern": "/^[a-zA-Z0-9]*$/"`
  - `.alphanum().lowercase()`
  - `.alphanum().uppercase()`
  - `.token()` -> `"pattern": "/^[a-zA-Z0-9_]*$/"`
  - `.token().lowercase()`
  - `.token().uppercase()`
  - `.email()` -> `"format": "email"`
  - `.isoDate()` -> `"format": "date-time"`
  - `.regex(/foo/)` -> `"pattern": "/foo/"`
  - `.allow(null)` -> `"nullable": true`
  - `.min(5)` -> `"minLength": 5`
  - `.max(10)` -> `"maxLength": 10`

- `joi.binary()` produces `"type": "string"` with a format of `"binary"`.
  - `.encoding('base64')` -> `"format": "byte"`
  - `.min(5)` -> `"minLength": 5`
  - `.max(10)` -> `"maxLength": 10`
  - `.allow(null)` -> `"nullable": true`

- `joi.date()` produces `"type": "string"` with a format of `"date-time"`.
  - `.allow(null)` -> `"nullable": true`

- `joi.alternatives()` defines the structure using the first schema provided on `.items()` (see below for how to override)

- `any.default()` sets the `"default"` detail.

- `any.example()` sets the `"example"` or `"examples"`.
  - `.example('hi')` -> `"example": "hi"`
  - joi < v14: `.example('hi').example('hey')` -> `"examples": ["hi", "hey"]`
  - joi v14: `.example('hi', 'hey')` -> `"examples": ["hi", "hey"]`

- `joi.any().meta({ swaggerType: 'file' }).description('simpleFile')` add a file to the swagger structure

## Meta Overrides

The following may be provided on a joi `.meta()` object to explicitly override default joi-to-schema behavior.

**className**: By default J2S will be full verbose in its components. If an object has a `className` string, J2S will look for an existing schema component with that name, and if a component does not exist then it will create one. Either way, it will produce a `$ref` element for that schema component. If a new component is created it will be returned with the swagger schema.

**classTarget**: Named components are assumed to be schemas, and are referenced as `components/schemas/ComponentName`. If a `classTarget` meta value is provided (such as `parameters`), this will replace schemas in the reference.

**swaggerIndex**: Swagger's deterministic design disallows for supporting multiple type components. Because of this, only a single schema from `.alternatives()` and `.array().items()` may be converted to swagger. By default J2S will use the first component. Defining a different zero based index for this meta tag will override that behavior.

**swagger**: To explicitly define your own swagger component for a joi schema object, place that swagger object in the `swagger` meta tag. It will be mixed in to the schema that J2S produces.

**swaggerOverride**: If this meta tag is truthy, the `swagger` component will replace the result for that schema instead of mixing in to it.

**swaggerType**: Can be used with the .any() type to add files.

## Custom Types (joi.extend)

For supporting custom joi types you can add the needed type information using a the meta property **baseType**.

```js
const customJoi = joi.extend({
    name: 'customStringType',
    base: joi.string().meta({ baseType: 'string' }),
    // ...
});
```
