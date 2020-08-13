import { Schema } from 'joi';

interface SwaggerSchema {
    [propName: string]: any;
}

interface ComponentsSchema {
    schemas?: SwaggerSchema;
    [propName: string]: SwaggerSchema | undefined;
}

export default function joiToSwagger(schema: Schema, existingComponents?: SwaggerSchema): {
    swagger: SwaggerSchema,
    components?: ComponentsSchema
};
