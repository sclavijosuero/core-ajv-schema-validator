/**
 * Validates the given data against the provided schema.
 * 
 * This function checks if the provided data conforms to the specified schema. 
 * It supports validation against plain JSON schemas, as well as Swagger and OpenAPI documents. 
 * If the schema is a Swagger or OpenAPI document, the `path` parameter can be used to specify 
 * the location of the schema definition within the document.
 * 
 * @public
 * 
 * @param {any} data - The data to be validated.
 * @param {object} schema - The schema to validate against. Supported formats are plain JSON schema, Swagger, and OpenAPI documents. See https://ajv.js.org/json-schema.html for more information.
 * @param {object} [path] - The path object to the schema definition in a Swagger or OpenAPI document. Not required if the schema is a plain JSON schema.
 * @param {string} [path.endpoint] - The endpoint path. Required if the schema is a Swagger or OpenAPI document.
 * @param {string} [path.method] - The HTTP method. If not provided, it will use 'GET'.
 * @param {integer} [path.status] - The response status code. If not provided, it will use 200.
 * 
 * @returns {object} - An object containing:
 *   - errors: An array of validation errors as provided by Ajv, or null if the data is valid against the schema.
 *   - dataMismatches: The original response data with all schema mismatches flagged directly.
 *   - issueStyles: An object with the icons used to flag the issues. This could be useful if wanted to create legend in the application validating the schema.
 *                  Includes the properties: iconPropertyError, and iconPropertyMissing.
 * @throws {Error} - If any of the required parameters are missing or if the schema or schema definition is not found.
 */

export declare function validateSchema(
    data: any,
    schema: any,
    path?: PathObject
): object;
