const suite = require('tapsuite');
const parser = require('./');
const joi = require('@hapi/joi');

suite('swagger converts', (s) => {
	let i = 0;
	function simpleTest (...args) {
		let input, output, components, only, description;
		i++;
		if (typeof args[0] === 'string') {
			[ description, input, output, components, only ] = args;
		} else {
			[ input, output, components, only ] = args;
			description = 'Set ' + i;
		}
		s[only ? 'only' : 'test'](description, (t) => {
			const result = parser(input);
			t.deepEqual(result.swagger, output, `${description}: swagger matches`);
			if (components) t.deepEqual(result.components, components, `${description}: components match`);
			t.end();
		});
	}

	simpleTest(
		joi.number().integer().min(1).max(10),
		{
			type: 'integer',
			maximum: 10,
			minimum: 1,
		},
	);

	simpleTest(
		joi.number().positive(),
		{
			type: 'number',
			format: 'float',
			minimum: 1,
		},
	);

	simpleTest(
		joi.number().precision(2).negative(),
		{
			type: 'number',
			format: 'double',
			maximum: -1,
		},
	);

	simpleTest(
		joi.string(),
		{
			type: 'string',
		},
	);

	simpleTest(
		joi.string().label('test'),
		{
			type: 'string',
			title: 'test',
		},
	);

	simpleTest(
		joi.string().regex(/^A$/),
		{
			type: 'string',
			pattern: '^A$',
		},
	);

	simpleTest(
		joi.string().min(4).max(9),
		{
			type: 'string',
			maxLength: 9,
			minLength: 4,
		},
	);

	simpleTest(
		joi.string().min(4).max(9).length(14),
		{
			type: 'string',
			maxLength: 14,
			minLength: 14,
		},
	);

	simpleTest(
		joi.string().max(9).length(14).min(4),
		{
			type: 'string',
			maxLength: 14,
			minLength: 4,
		},
	);

	simpleTest(
		joi.string().alphanum(),
		{
			type: 'string',
			pattern: '^[a-zA-Z0-9]*$',
		},
	);

	simpleTest(
		joi.string().strict().alphanum().lowercase(),
		{
			type: 'string',
			pattern: '^[a-z0-9]*$',
		},
	);

	simpleTest(
		// confirm that non-strict mode enables insensitive match
		joi.string().alphanum().uppercase(),
		{
			type: 'string',
			pattern: '^[a-zA-Z0-9]*$',
		},
	);

	simpleTest(
		joi.string().strict().alphanum().uppercase(),
		{
			type: 'string',
			pattern: '^[A-Z0-9]*$',
		},
	);

	simpleTest(
		joi.string().alphanum().email(),
		{
			type: 'string',
			format: 'email',
		},
	);

	simpleTest(
		joi.string().alphanum().isoDate(),
		{
			type: 'string',
			format: 'date-time',
		},
	);

	simpleTest(
		joi.string().valid('A', 'B', 'C', null),
		{
			type: 'string',
			enum: [ 'A', 'B', 'C' ],
			nullable: true,
		},
	);

	simpleTest(
		joi.string().invalid('A', 'B', 'C'),
		{
			type: 'string',
			not: {
				enum: [ 'A', 'B', 'C' ],
			},
		}
	);

	simpleTest(
		joi.string().uuid(),
		{
			type: 'string',
			format: 'uuid',
		}
	);

	simpleTest(
		joi.boolean(),
		{
			type: 'boolean',
		}
	);

	simpleTest(
		joi.boolean().allow(null),
		{
			type: 'boolean',
			nullable: true,
		}
	);

	simpleTest(
		joi.binary(),
		{
			type: 'string',
			format: 'binary',
		}
	);

	simpleTest(
		joi.binary().encoding('base64'),
		{
			type: 'string',
			format: 'byte',
		}
	);

	simpleTest(
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
		}
	);

	simpleTest(
		joi.array().items(joi.string()).unique(),
		{
			type: 'array',
			uniqueItems: true,
			items: { type: 'string' },
		}
	);

	simpleTest(
		joi.array().items(joi.string(), joi.number()).min(1).max(5),
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
		}
	);

	simpleTest(
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
		}
	);

	simpleTest(
		joi.alternatives(
			joi.object({
				a: joi.string().invalid('A', 'B', 'C').required(),
				b: joi.number().integer().valid(1, 2, 3),
			}),
			joi.object({
				c: joi.string().invalid('E', 'F', 'G'),
				d: joi.number().integer().valid(4, 5, 6).required(),
			})

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
		}
	);

	// TODO -> any
	simpleTest(
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
		}
	);

	simpleTest(
		{
			a: joi.any()
				.when('b', {
					is: joi.exist(),
					then: joi.string().valid('A'),
					otherwise: joi.string().valid('B'),
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
						},
						{
							type: 'string',
							enum: [ 'B' ],
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
		}
	);

	simpleTest(
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
		}
	);

	simpleTest(
		joi.object({
			req: joi.string().required(),
			forbiddenAny: joi.forbidden(),
			forbiddenString: joi.string().forbidden(),
			forbiddenNumber: joi.number().forbidden(),
			forbiddenBoolean: joi.boolean().forbidden(),
			forbiddenBinary: joi.binary().forbidden(),
			maybeForbidden: joi.when('someField', {
				is: true,
				then: joi.number().integer().min(1).max(10),
				otherwise: joi.forbidden(),
			}),
		}),
		{
			type: 'object',
			required: [ 'req' ],
			properties: {
				req: { type: 'string' },
				maybeForbidden: {
					type: 'integer',
					minimum: 1,
					maximum: 10,
				},
			},
			additionalProperties: false,
		}
	);

	simpleTest(
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
		}
	);

	simpleTest(
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
		joi.object().keys({
			value: joi.string().default('hello'),
		}),
		{
			type: 'object',
			properties: {
				value: { type: 'string', default: 'hello' },
			},
			additionalProperties: false,
		}
	);

	simpleTest(
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
		}
	);

	simpleTest(
		joi.string().example('sii'),
		{
			example: 'sii',
			type: 'string',
		}
	);

	simpleTest(
		joi.string().example('sel').example('wyn'),
		{
			examples: [ 'sel', 'wyn' ],
			type: 'string',
		}
	);

	simpleTest(
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
		}
	);

	simpleTest(
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
		}
	);

	simpleTest(
		{
			id: joi.string()
				.when('version', { is: joi.number().greater(0).required(), then: joi.string().required() }),
		},
		{
			type: 'object',
			properties: {
				id: { type: 'string' },
			},
			additionalProperties: false,
		}
	);

	simpleTest(
		{
			id: joi.string()
				.description('user id')
				.forbidden(),
		},
		{
			type: 'object',
			properties: {},
			additionalProperties: false,
		}
	);

	simpleTest(
		joi.date().default(Date.now),
		{
			type: 'string',
			format: 'date-time',
		}
	);

	// test files
	simpleTest(
		joi.any().meta({ swaggerType: 'file' }).description('simpleFile'),
		{
			description: 'simpleFile',
			in: 'formData',
			type: 'file',
		}
	);

	// extend test
	simpleTest(
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
		}
	);
});
