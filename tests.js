const suite = require('tapsuite');
const parser = require('./');
const joi = require('joi');
const joiDate = require('@joi/date');

suite('swagger converts', (s) => {
	/**
	 * Test method
	 *
	 * @param {string} description Description of the test case
	 * @param {object} input Joi schema to test against
	 * @param {object} output expected generated schema
	 * @param {object} [components] expected generated components
	 * @param {boolean} [only] set to true to only run this test
	 */
	function simpleTest (description, input, output, components, only) {
		s[only ? 'only' : 'test'](description, (t) => {
			const result = parser(input);
			t.same(result.swagger, output, `${description}: swagger matches`);
			if (components) t.same(result.components, components, `${description}: components match`);
			t.end();
		});
	}

	/**
	 * Test error method
	 *
	 * @param {string} description Description of the test case
	 * @param {object} input Joi schema to test against
	 * @param {Error} expectedError expected error
	 * @param {boolean} [only] set to true to only run this test
	 */
	function testError (description, input, expectedError, only) {
		s[only ? 'only' : 'test'](description, (t) => {
			t.throws(() => parser(input), expectedError, `${description}: expected error was thrown`);
			t.end();
		});
	}

	simpleTest(
		'integer with min and max',
		joi.number().integer().min(1).max(10),
		{
			type: 'integer',
			maximum: 10,
			minimum: 1,
		},
	);

	simpleTest(
		'positive number',
		joi.number().positive(),
		{
			type: 'number',
			format: 'float',
			minimum: 1,
		},
	);

	simpleTest(
		'negative number with precision',
		joi.number().precision(2).negative(),
		{
			type: 'number',
			format: 'double',
			maximum: -1,
		},
	);

	simpleTest(
		'string',
		joi.string(),
		{
			type: 'string',
		},
	);

	simpleTest(
		'string with label',
		joi.string().label('test'),
		{
			type: 'string',
			title: 'test',
		},
	);

	simpleTest(
		'string with regex',
		joi.string().regex(/^A$/),
		{
			type: 'string',
			pattern: '^A$',
		},
	);

	simpleTest(
		'string with min and max',
		joi.string().min(4).max(9),
		{
			type: 'string',
			maxLength: 9,
			minLength: 4,
		},
	);

	simpleTest(
		'string with min, max and length',
		joi.string().min(4).max(9).length(14),
		{
			type: 'string',
			maxLength: 14,
			minLength: 14,
		},
	);

	simpleTest(
		'string with max, length and min',
		joi.string().max(9).length(14).min(4),
		{
			type: 'string',
			maxLength: 14,
			minLength: 4,
		},
	);

	simpleTest(
		'string with alphanum',
		joi.string().alphanum(),
		{
			type: 'string',
			pattern: '^[a-zA-Z0-9]*$',
		},
	);

	simpleTest(
		'string with alphanum and strict',
		joi.string().strict().alphanum(),
		{
			type: 'string',
			pattern: '^[a-zA-Z0-9]*$',
		},
	);

	simpleTest(
		'string with alphanum and lowercase',
		joi.string().strict().alphanum().lowercase(),
		{
			type: 'string',
			pattern: '^[a-z0-9]*$',
		},
	);

	simpleTest(
		'string with alphanum and uppercase (without strict)',
		// confirm that non-strict mode enables insensitive match
		joi.string().alphanum().uppercase(),
		{
			type: 'string',
			pattern: '^[a-zA-Z0-9]*$',
		},
	);

	simpleTest(
		'string with strict, alphanum and uppercase',
		joi.string().strict().alphanum().uppercase(),
		{
			type: 'string',
			pattern: '^[A-Z0-9]*$',
		},
	);

	simpleTest(
		'string with token',
		joi.string().token(),
		{
			type: 'string',
			pattern: '^[a-zA-Z0-9_]*$',
		},
	);

	simpleTest(
		'string with alphanum and email',
		joi.string().alphanum().email(),
		{
			type: 'string',
			format: 'email',
		},
	);

	simpleTest(
		'string with alphanum and isoDate',
		joi.string().alphanum().isoDate(),
		{
			type: 'string',
			format: 'date-time',
		},
	);

	simpleTest(
		'using @joi/date with format YYYY-MM-DD',
		joi.extend(joiDate).date().format('YYYY-MM-DD'),
		{
			type: 'string',
			format: 'date',
		},
	);

	simpleTest(
		'string with valid',
		joi.string().valid('A', 'B', 'C', null),
		{
			type: 'string',
			enum: [ 'A', 'B', 'C' ],
			nullable: true,
		},
	);

	simpleTest(
		'string with invalid',
		joi.string().invalid('A', 'B', 'C'),
		{
			type: 'string',
			not: {
				enum: [ 'A', 'B', 'C' ],
			},
		},
	);

	simpleTest(
		'string with uuid',
		joi.string().uuid(),
		{
			type: 'string',
			format: 'uuid',
		},
	);

	simpleTest(
		'string with uuid and other pattern set already',
		joi.string().alphanum().uuid(),
		{
			type: 'string',
			format: 'uuid',
		},
		{},
	);

	simpleTest(
		'boolean',
		joi.boolean(),
		{
			type: 'boolean',
		},
	);

	simpleTest(
		'boolean with default true',
		joi.boolean().default(true),
		{
			type: 'boolean',
			default: true,
		},
	);

	simpleTest(
		'boolean with default false',
		joi.boolean().default(false),
		{
			type: 'boolean',
			default: false,
		},
	);

	simpleTest(
		'boolean with allow null',
		joi.boolean().allow(null),
		{
			type: 'boolean',
			nullable: true,
		},
	);

	simpleTest(
		'binary',
		joi.binary(),
		{
			type: 'string',
			format: 'binary',
		},
	);

	simpleTest(
		'binary with base64 encoding',
		joi.binary().encoding('base64'),
		{
			type: 'string',
			format: 'byte',
		},
	);

	simpleTest(
		'array with items of boolean and date',
		joi.array().items(joi.boolean(), joi.date()),
		{
			type: 'array',
			items: {
				oneOf: [
					{
						type: 'boolean',
					},
					{
						type: 'string',
						format: 'date-time',
					},
				],
			},
		},
	);

	simpleTest(
		'array with items unique strings',
		joi.array().items(joi.string()).unique(),
		{
			type: 'array',
			uniqueItems: true,
			items: { type: 'string' },
		},
	);

	simpleTest(
		'array with min and max and items of strings and numbers',
		joi.array().items(joi.string(), joi.number(), joi.object().forbidden()).min(1).max(5),
		{
			type: 'array',
			items: {
				oneOf: [
					{
						type: 'string',
					},
					{
						type: 'number',
						format: 'float',
					},
				],
			},
			minItems: 1,
			maxItems: 5,
		},
	);

	simpleTest(
		'object with pattern for keys and string as value',
		joi.object().pattern(/^/, joi.string()),
		{
			type: 'object',
			properties: {},
			additionalProperties: {
				type: 'string',
			},
		},
	);

	simpleTest(
		'object with pattern for keys and forbidden value',
		joi.object().pattern(/^/, joi.string().forbidden()),
		{
			type: 'object',
			properties: {},
			additionalProperties: false,
		},
	);

	simpleTest(
		'object with pattern for keys and object as value',
		joi.object().pattern(/^/, joi.object({ name: joi.string(), date: joi.date() })),
		{
			type: 'object',
			properties: {
			},
			additionalProperties: {
				type: 'object',
				properties: {
					name: {
						type: 'string',
					},
					date: {
						type: 'string',
						format: 'date-time',
					},
				},
				additionalProperties: false,
			},
		},
	);

	simpleTest(
		'object with pattern for keys and array as value',
		joi.object().pattern(/^/, joi.array().items(joi.object({ name: joi.string(), date: joi.date() }))),
		{
			type: 'object',
			properties: {
			},
			additionalProperties: {
				type: 'array',
				items: {
					type: 'object',
					properties: {
						name: {
							type: 'string',
						},
						date: {
							type: 'string',
							format: 'date-time',
						},
					},
					additionalProperties: false,
				},
			},
		},
	);

	simpleTest(
		'object with pattern for keys and alternative as value',
		joi.object().pattern(/^/, joi.alternatives(joi.object({ name: joi.string(), date: joi.date() }), joi.string())),
		{
			type: 'object',
			properties: {
			},
			additionalProperties: {
				anyOf: [
					{
						type: 'object',
						properties: {
							name: {
								type: 'string',
							},
							date: {
								type: 'string',
								format: 'date-time',
							},
						},
						additionalProperties: false,
					},
					{
						type: 'string',
					},
				],
			},
		},
	);

	simpleTest(
		'object with pattern for keys and reference as value',
		joi.object().pattern(/^/, joi.object({ name: joi.string() }).meta({ className: 'innerObject' })),
		{
			type: 'object',
			properties: {
			},
			additionalProperties: {
				$ref: '#/components/schemas/innerObject',
			},
		},
		{
			schemas: {
				innerObject: {
					type: 'object',
					properties: {
						name: {
							type: 'string',
						},
					},
					additionalProperties: false,
				},
			},
		},
	);

	simpleTest(
		'alternatives of string or number',
		joi.alternatives(joi.string(), joi.number()),
		{
			anyOf: [
				{
					type: 'string',
				},
				{
					type: 'number',
					format: 'float',
				},
			],
		},
	);

	simpleTest(
		'alternatives of objects with match all',
		joi.alternatives().try(
			joi.object({
				a: joi.string(),
			}),
			joi.object({
				d: joi.number().integer(),
			}),
		).match('all'),
		{
			allOf: [
				{
					type: 'object',
					properties: {
						a: {
							type: 'string',
						},
					},
					additionalProperties: false,
				},
				{
					type: 'object',
					properties: {
						d: {
							type: 'integer',
						},
					},
					additionalProperties: false,
				},
			],
		},
	);

	simpleTest(
		'alternatives of different objects with match one',
		joi.alternatives(
			joi.object({
				a: joi.string().invalid('A', 'B', 'C').required(),
				b: joi.number().integer().valid(1, 2, 3),
			}),
			joi.object({
				c: joi.string().invalid('E', 'F', 'G'),
				d: joi.number().integer().valid(4, 5, 6).required(),
			}),
		).match('one'),
		{
			oneOf: [
				{
					type: 'object',
					required: [ 'a' ],
					properties: {
						a: {
							type: 'string',
							not: {
								enum: [ 'A', 'B', 'C' ],
							},
						},
						b: {
							type: 'integer',
							enum: [ 1, 2, 3 ],
						},
					},
					additionalProperties: false,
				},
				{
					type: 'object',
					required: [ 'd' ],
					properties: {
						c: {
							type: 'string',
							not: {
								enum: [ 'E', 'F', 'G' ],
							},
						},
						d: {
							type: 'integer',
							enum: [ 4, 5, 6 ],
						},
					},
					additionalProperties: false,
				},
			],
		},
	);

	simpleTest(
		'alternatives with conditional',
		{
			a: joi.alternatives().conditional('b', { is: 5, then: joi.string(), otherwise: joi.number() }),
			b: joi.number().integer(),
		},
		{
			type: 'object',
			properties: {
				a: {
					anyOf: [
						{
							type: 'string',
						},
						{
							type: 'number',
							format: 'float',
						},
					],
				},
				b: {
					type: 'integer',
				},
			},
			additionalProperties: false,
		},
	);

	simpleTest(
		'alternatives with conditional using switch',
		{
			a: joi.alternatives().conditional('b', {
				switch: [
					{ is: 5, then: joi.string() },
					{ is: 6, then: joi.number() },
				],
				otherwise: joi.number().integer(),
			}),
			b: joi.number().integer(),
		},
		{
			type: 'object',
			properties: {
				a: {
					anyOf: [
						{
							type: 'string',
						},
						{
							type: 'number',
							format: 'float',
						},
						{
							type: 'integer',
						},
					],
				},
				b: {
					type: 'integer',
				},
			},
			additionalProperties: false,
		},
	);

	simpleTest(
		'when with then and otherwise',
		joi.when('myRequiredField', {
			is: true,
			then: joi.string(),
			otherwise: joi.number(),
		}),
		{
			oneOf: [
				{
					type: 'string',
				},
				{
					type: 'number',
					format: 'float',
				},
			],
		},
	);

	simpleTest(
		'object with any using when with valid',
		{
			a: joi.any()
				.when('b', {
					is: joi.exist(),
					then: joi.string().valid('A').required(),
					otherwise: joi.string().valid('B').required(),
				})
				.when('c', { is: joi.number().min(10), then: joi.string().valid('C') }),
			b: joi.any(),
			c: joi.number(),
		},
		{
			type: 'object',
			properties: {
				a: {
					anyOf: [
						{
							type: 'string',
							enum: [ 'A' ],
							'x-required': true,
						},
						{
							type: 'string',
							enum: [ 'B' ],
							'x-required': true,
						},
						{
							type: 'string',
							enum: [ 'C' ],
						},
					],
				},
				b: {},
				c: {
					type: 'number',
					format: 'float',
				},
			},
			additionalProperties: false,
		},
	);

	simpleTest(
		'object with when on numbers',
		joi.object({
			a: joi.number().required(),
			b: joi.number().integer()
				.when('a', {
					switch: [
						{ is: 0, then: joi.valid(1) },
						{ is: 1, then: joi.valid(2) },
						{ is: 2, then: joi.valid(3) },
					],
					otherwise: joi.valid(4),
				}),
		}),
		{
			type: 'object',
			required: [ 'a' ],
			properties: {
				a: {
					type: 'number',
					format: 'float',
				},
				b: {
					type: 'integer',
					oneOf: [
						{ enum: [ 1 ] },
						{ enum: [ 2 ] },
						{ enum: [ 3 ] },
						{ enum: [ 4 ] },
					],
				},
			},
			additionalProperties: false,
		},
	);

	simpleTest(
		'object with alternatives.conditional of a scalar property',
		{
			a: joi.alternatives().conditional('b', { is: 5, then: joi.string(), otherwise: joi.number().integer() }),
			b: joi.number().integer(),
		},
		{
			type: 'object',
			properties: {
				a: {
					anyOf: [
						{
							type: 'string',
						},
						{
							type: 'integer',
						},
					],
				},
				b: {
					type: 'integer',
				},
			},
			additionalProperties: false,
		},
	);

	simpleTest(
		'object with forbidden properties and when',
		joi.object({
			req: joi.string().required(),
			forbiddenAny: joi.forbidden(),
			forbiddenString: joi.string().forbidden(),
			forbiddenNumber: joi.number().forbidden(),
			forbiddenBoolean: joi.boolean().forbidden(),
			forbiddenBinary: joi.binary().forbidden(),
			maybeRequiredOrForbidden: joi.number().when('someField', {
				is: true,
				then: joi.required(),
				otherwise: joi.forbidden(),
			}),
		}),
		{
			type: 'object',
			required: [ 'req' ],
			properties: {
				req: { type: 'string' },
				maybeRequiredOrForbidden: {
					type: 'number',
					format: 'float',
					oneOf: [
						{ 'x-required': true },
					],
				},
			},
			additionalProperties: false,
		},
	);

	simpleTest(
		'object with unknown and required property',
		joi.object().keys({
			id: joi.number().integer().required(),
			name: joi.string(),
		}).unknown(),
		{
			type: 'object',
			required: [ 'id' ],
			properties: {
				id: { type: 'integer' },
				name: { type: 'string' },
			},
		},
	);

	simpleTest(
		'object with nested object with unknown',
		joi.object().keys({
			name: joi.string(),
			settings: joi.object().unknown(),
		}).unknown(false),
		{
			type: 'object',
			properties: {
				name: { type: 'string' },
				settings: {
					type: 'object',
					properties: {},
				},
			},
			additionalProperties: false,
		},
	);

	simpleTest(
		'object with a property with default',
		joi.object().keys({
			value: joi.string().default('hello'),
		}),
		{
			type: 'object',
			properties: {
				value: { type: 'string', default: 'hello' },
			},
			additionalProperties: false,
		},
	);

	simpleTest(
		'creating a reference by using meta className',
		joi.string().alphanum().email().meta({ className: 'Email' }),
		{
			$ref: '#/components/schemas/Email',
		},
		{
			schemas: {
				Email: {
					type: 'string',
					format: 'email',
				},
			},
		},
	);

	simpleTest(
		'string with example',
		joi.string().example('sii'),
		{
			example: 'sii',
			type: 'string',
		},
	);

	simpleTest(
		'string with multiple examples',
		joi.string().example('sel').example('wyn'),
		{
			examples: [ 'sel', 'wyn' ],
			type: 'string',
		},
	);

	simpleTest(
		'any',
		joi.any(),
		{},
	);

	simpleTest(
		'any with valid',
		joi.any().valid(1, 'a'),
		{
			enum: [ 1, 'a' ],
		},
	);

	simpleTest(
		'any with invalid',
		joi.any().invalid(1, 'a'),
		{
			not: {
				enum: [ 1, 'a' ],
			},
		},
	);

	simpleTest(
		'object with properties using meta className to create references',
		{
			start: joi.object().keys({
				lat:  joi.number().min(-90).max(90).required(),
				lon:  joi.number().min(-180).max(180).required(),
			}).meta({ className: 'GeoPoint' }),
			stop: joi.object().keys({
				lat:  joi.number().min(-90).max(90).required(),
				lon:  joi.number().min(-180).max(180).required(),
			}).meta({ className: 'GeoPoint' }),
		},
		{
			type: 'object',
			properties: {
				start: { $ref: '#/components/schemas/GeoPoint' },
				stop: { $ref: '#/components/schemas/GeoPoint' },
			},
			additionalProperties: false,
		},
		{
			schemas: {
				GeoPoint: {
					type: 'object',
					required: [ 'lat', 'lon' ],
					properties: {
						lat: {
							type: 'number',
							format: 'float',
							minimum: -90,
							maximum: 90,
						},
						lon: {
							type: 'number',
							format: 'float',
							minimum: -180,
							maximum: 180,
						},
					},
					additionalProperties: false,
				},
			},
		},
	);

	simpleTest(
		'creating a reference with className and classTarget',
		{
			body: joi.object().keys({
				subject: joi.string(),
				message: joi.string().trim().min(1, 'utf8').max(400, 'utf8').meta({ className: 'MessageBody' }),
			}).unknown().meta({ className: 'MessageCreate', classTarget: 'requestBodies' }),
		},
		{
			type: 'object',
			properties: {
				body: { '$ref': '#/components/requestBodies/MessageCreate' },
			},
			additionalProperties: false,
		},
		{
			schemas: {
				'MessageBody': {
					maxLength: 400,
					minLength: 1,
					type: 'string',
				},
			},
			requestBodies: {
				'MessageCreate': {
					type: 'object',
					properties: {
						message: { '$ref': '#/components/schemas/MessageBody' },
						subject: { 'type': 'string' },
					},
				},
			},
		},
	);

	simpleTest(
		'conditionally required field',
		{
			id: joi.string()
				.when('version', { is: joi.number().greater(0).required(), then: joi.required() }),
		},
		{
			type: 'object',
			properties: {
				id: {
					type: 'string',
					oneOf: [
						{ 'x-required': true },
					],

				},
			},
			additionalProperties: false,
		},
	);

	simpleTest(
		'object with forbidden field',
		{
			id: joi.string()
				.description('user id')
				.forbidden(),
		},
		{
			type: 'object',
			properties: {},
			additionalProperties: false,
		},
	);

	simpleTest(
		'date with default',
		joi.date().default(Date.now),
		{
			type: 'string',
			format: 'date-time',
		},
	);

	// custom swagger schemas with schemaOverride
	simpleTest(
		'using meta schemaOverride',
		joi.alternatives().meta({ schemaOverride: joi.number() }),
		{
			type: 'number',
			format: 'float',
		},
	);

	testError(
		'nested schemaOverride fails',
		joi.object({}).meta({ schemaOverride: joi.object({}).meta({ schemaOverride: joi.object({}) }) }),
		new Error('Cannot override the schema for one which is being used in another override (no nested schema overrides).'),
	);

	// custom swagger schemas with swagger and swaggerOverride
	simpleTest(
		'using meta swagger',
		joi.date().default(Date.now).meta({ swagger: { customProperty: 'test' } }),
		{
			type: 'string',
			format: 'date-time',
			customProperty: 'test',
		},
	);

	simpleTest(
		'using meta swagger and className',
		joi.date().default(Date.now).meta({ swagger: { customProperty: 'test' }, className: 'myDate' }),
		{
			$ref: '#/components/schemas/myDate',
		},
		{
			schemas: {
				myDate: {
					type: 'string',
					format: 'date-time',
					customProperty: 'test',
				},
			},
		},
	);

	simpleTest(
		'using meta swagger and swaggerOverride',
		joi.date().default(Date.now).meta({ swagger: { customProperty: 'test' }, swaggerOverride: true }),
		{
			customProperty: 'test',
		},
	);

	simpleTest(
		'using meta swagger and swaggerOverride and className',
		joi.date().default(Date.now).meta({ swagger: { customProperty: 'test' }, swaggerOverride: true, className: 'myDate' }),
		{
			$ref: '#/components/schemas/myDate',
		},
		{
			schemas: {
				myDate: {
					customProperty: 'test',
				},
			},
		},
	);

	// test files
	simpleTest(
		'using meta swaggerType file',
		joi.any().meta({ swaggerType: 'file' }).description('simpleFile'),
		{
			description: 'simpleFile',
			in: 'formData',
			type: 'file',
		},
	);

	// extend test
	simpleTest(
		'customType with extend',
		(
			() => {
				const customJoi = joi.extend({
					type: 'customStringType',
					base: joi.string().meta({ baseType: 'string' }),
				});

				return customJoi.extend({
					type: 'customObjectType',
					base: customJoi.object({
						property1: customJoi.customStringType().required(),
					}).meta({
						baseType: 'object',
					}),
				}).customObjectType();
			}
		)(),
		{
			type: 'object',
			required: [ 'property1' ],
			properties: {
				property1: { type: 'string' },
			},
			additionalProperties: false,
		},
	);

	testError('missing schema', undefined, new Error('No schema was passed.'));

	testError('no joi schema', 5, new TypeError('Passed schema does not appear to be a joi schema.'));

	testError(
		'invalid baseType',
		(
			() => {
				const customJoi = joi.extend({
					type: 'customStringType',
					base: joi.string().meta({ baseType: 'string' }),
				});

				return customJoi.extend({
					type: 'customObjectType',
					base: customJoi.object({
						property1: customJoi.customStringType().required(),
					}).meta({
						baseType: 'myInvalidType',
					}),
				}).customObjectType();
			}
		)(),
		new TypeError('myInvalidType is not a recognized Joi type.'),
	);
});
