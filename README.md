joi-to-swagger
==============

[![npm](https://img.shields.io/npm/v/joi-to-swagger.svg?logo=npm)](https://www.npmjs.com/package/joi-to-swagger)
[![Node.js Testing](https://github.com/Twipped/joi-to-swagger/actions/workflows/tests.yaml/badge.svg)](https://github.com/Twipped/joi-to-swagger/actions/workflows/tests.yaml)
[![Download Status](https://img.shields.io/npm/dm/joi-to-swagger.svg?style=flat-square)](https://www.npmjs.com/package/joi-to-swagger)

Conversion library for transforming [Joi](http://npm.im/joi) schema objects into [Swagger](http://swagger.io) OAS 3.0 schema definitions.

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
  },
  "additionalProperties": false
}
```

## Usage

```js
const j2s = require('joi-to-swagger');

const { swagger, components } = j2s(mySchema, existingComponents);
```

_- in case of ES6 module syntax:_
```js
import j2s from 'joi-to-swagger';

const { swagger, components } = j2s(mySchema, existingComponents);
```

J2S takes two arguments, the first being the Joi object you wish to convert. The second optional argument is a collection of existing components to reference against for the meta `className` identifiers (see below).

J2S returns a result object containing `swagger` and `components` properties. `swagger` contains your new schema, `components` contains any components that were generated while parsing your schema.

## Supported Conventions:

- `joi.object()`
  - `.unknown(false)` -> `additionalProperties: false`
  - `.required()` on object members produces a `"required": []` array
  - `.pattern(pattern, JoiSchema)` -> `additionalProperties: [Schema]`

- `joi.array().items()` - in case of multiple provided schemas using `items()` method, the "oneOf" (OAS3) keyword is used
  - `.min(4)` -> `"minItems": 4`
  - `.max(10)` -> `"maxItems": 10`
  - `.unique(truthy)` -> `"uniqueItems": true`

- `joi.number()` produces `"type": "number"` with a format of `"float"`
  - `.precision()` -> `"format": "double"`
  - `.integer()` -> `"type": "integer"`
  - `.strict().only(1, 2, '3')` -> `"enum": [1, 2]` (note that non-numbers are omitted due to swagger type constraints)
  - `.allow(null)` -> `"nullable": true`
  - `.min(5)` -> `"minimum": 5` (joi.ref is supported and will fallback to 0 if not provided via refValues metadata)
  - `.max(10)` -> `"maximum": 10` (joi.ref is supported and will fallback to 0 if not provided via refValues metadata)
  - `.positive()` -> `"minimum": 1`
  - `.negative()` -> `"maximum": -1`
  - `.valid(1, 2)` -> `"enum": [1, 2]`
  - `.invalid(1, 2)` -> `"not": { "enum": [1, 2] }`

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
  - `.uuid()` -> `"format": "uuid"`
  - `.valid('A', 'B')` -> `"enum": ['A', 'B']`
  - `.invalid('A', 'B')` -> `"not": { "enum": ['A', 'B'] }`

- `joi.binary()` produces `"type": "string"` with a format of `"binary"`.
  - `.encoding('base64')` -> `"format": "byte"`
  - `.min(5)` -> `"minLength": 5`
  - `.max(10)` -> `"maxLength": 10`
  - `.allow(null)` -> `"nullable": true`

- `joi.date()` produces `"type": "string"` with a format of `"date-time"`.
  - `.allow(null)` -> `"nullable": true`

- `joi.alternatives()` - structure of alternative schemas is defined by "anyOf", "oneOf" or "allOf (OAS3) keywords
  - `.mode('one')` -> produces `"oneOf": [ { ... } ]`
  - in case of `joi.required()` alternative schema, the custom property option "x-required" is added to subschema -> `"x-required": true`

- `joi.when()` conditions are transformed to `"oneOf": [ { ... }, { ... } ]` keyword
  - if multiple `joi.when().when()` conditions are provided, they are transformed to `"anyOf": [ { ... }, { ... } ]` keyword
  - in case of `joi.required()` condition, the custom property option "x-required" is added to subschema -> `"x-required": true`

- `any.default()` sets the `"default"` detail.

- `any.example()` sets the `"example"` or `"examples"`.
  - `.example('hi')` -> `"example": "hi"`
  - `.example('hi', 'hey')` -> `"examples": ["hi", "hey"]`

- `joi.any()`
- `.meta({ swaggerType: 'file' }).description('simpleFile')` add a file to the swagger structure
- `.valid(1, 'A')` -> `"enum": [1, 'A']`
- `.invalid(1, 'A')` -> `"not": { "enum": [1, 'A'] }`

## Meta Overrides

The following may be provided on a joi `.meta()` object to explicitly override default joi-to-schema behavior.

**className**: By default J2S will be full verbose in its components. If an object has a `className` string, J2S will look for an existing schema component with that name, and if a component does not exist then it will create one. Either way, it will produce a `$ref` element for that schema component. If a new component is created it will be returned with the swagger schema.

**classTarget**: Named components are assumed to be schemas, and are referenced as `components/schemas/ComponentName`. If a `classTarget` meta value is provided (such as `parameters`), this will replace schemas in the reference.

**swagger**: To explicitly define your own swagger component for a joi schema object, place that swagger object in the `swagger` meta tag. It will be mixed in to the schema that J2S produces.

**swaggerOverride**: If this meta tag is truthy, the `swagger` component will replace the result for that schema instead of mixing in to it.

**swaggerType**: Can be used with the .any() type to add files.

**schemaOverride**: A replacement Joi schema which is used to generate swagger. For example, AWS API Gateway supports a subset of the swagger spec. In order to utilize
this library with AWS API Gateway's swagger, this option is useful when working with Joi.alternatives().

The example below uses `joi.when`, which would normally use `oneOf`, `anyOf`, or `allOf` keywords. In order to get around that, the meta tag overrides the schema to be similar, but less strict.
```
joi.object({
  type: joi.string().valid('a', 'b'),
  body: when('type', {
    is: 'a',
    then: joi.object({ a: joi.string() }),
    otherwise: when('type', {
      is: 'b',
      then: joi.object({ b: joi.string() }),
      otherwise: joi.forbidden()
    })
  })
}).meta({ schemaOverride: joi.object({ a: joi.string(), b: joi.string() })})
```

**refValues**: The possibility to give exact values when using joi.ref()
```
joi.object({
  durationFrom: joi.number().integer().min(5).max(10),
  durationTo: joi.number().integer().min(joi.ref('durationFrom')).max(20)
    .meta({ refValues: { durationFrom: 5 } }),
})
```

## Custom Types (joi.extend)

For supporting custom joi types you can add the needed type information using a the meta property **baseType**.

```js
const customJoi = joi.extend({
    type: 'customStringType',
    base: joi.string().meta({ baseType: 'string' }),
    // ...
});
```
