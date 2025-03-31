import Ajv from "ajv"
import addFormats from "ajv-formats"
import _ from "lodash"


// Create a new Ajv instance (Show all validation errors and disable strict mode)
const ajv = new Ajv({ allErrors: true, strict: false })
// Note: When AJV property strict is true, for some reason the Openapi shema validation fails not recognizing "components" (Error: strict mode: unknown keyword: "components").
//       This does not happens in Swagger schema validation with the equivalent keyword "definitions".

// Extend Ajv supported formats (E.g.: uuid, email, etc.)
addFormats(ajv)


// ------------------------------------
// MESSAGES & ICONS
// ------------------------------------

const issueStyles = {
    iconPropertyError: '😱',
    colorPropertyError: '#ee930a',
    iconPropertyMissing: '😡',
    colorPropertyMissing: '#c10000'
}

const errorInvalidSchema = `You must provide a valid schema!`
const errorInvalidSchemaParameters = `You must provide valid schema parameters (missing 'endpoint', 'method' or 'status' params)!`


// ------------------------------------
// PUBLIC FUNCTIONS
// ------------------------------------

/**
 * Function that validates the given data against the provided schema.
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
 *   - issueStyles: An object with the icons and HEX colors used to flag the issues. This could be useful if wanted to create legend in the application validating the schema.
 *                  Includes the properties: iconPropertyError, colorPropertyError, iconPropertyMissing, and colorPropertyMissing.
 * @throws {Error} - If any of the required parameters are missing or if the schema or schema definition is not found.
 *
 * @example
 * const schema = {
 *   "swagger": "2.0",
 *   "paths": {
 *     "/users": {
 *       "get": {
 *         "responses": {
 *           "200": {
 *             "schema": { $ref: "#/definitions/User" }
 *           }
 *         }
 *       }
 *     }
 *   },
 *   "definitions": {
 *     "User": {
 *       "type": "object",
 *       "properties": {
 *         "name": { "type": "string" },
 *         "age": { "type": "number" }
 *       }
 *     }
 *   }
 * }
 *
 *   // response... (is the response object from the API request)
 *   const data = response.body
 *   const path = { endpoint: '/users', method: 'GET', status: '200' };
 * 
 *   const validationResult = validateSchema(data, schema, path);
 *   console.log(validationResult.errors); // Array of validation errors
 *   console.log(validationResult.dataMismatches); // Data with mismatches flagged
 *   console.log(validationResult.issueStyles); // Icons and colors used for mismatches
 * });
 */
export const validateSchema = (data, schema, path) => {

    if (schema == null) {
        console.log(errorInvalidSchema)
        throw new Error(errorInvalidSchema)
    }

    if (path != null) {
        path.method = path.method || 'GET'
        path.status = path.status || 200

        // Check if the schema is a Swagger or OpenAPI document,
        // otherwise the provided schema is a valid schema object (JSON schema) and can be used as is
        if (schema.swagger || schema.openapi) {
            // Extract the schema definition from the Swagger or OpenAPI document.
            schema = _getSchemaFromSpecificationDoc(schema, path)
        }
    }

    // Validate the response body against the schema
    const { errors, dataMismatches } = _validateSchemaAJV(schema, data, issueStyles)

    return { errors, dataMismatches, issueStyles }
}

// ------------------------------------
// PRIVATE FUNCTIONS
// ------------------------------------

/**
 * Retrieves the schema definition for a given endpoint, method, and status from a Swagger or OpenAPI document.
 * @private
 *
 * @param {object} schema - The Swagger or OpenAPI document.
 * @param {object} path - The path object to the schema definition in a Swagger or OpenAPI document.
 * @param {string} path.endpoint - The endpoint path.
 * @param {string} path.method - The HTTP method.
 * @param {integer} path.status - The response status code.
 * 
 * @returns {object} - The merged schema definition with the components definitions.
 * @throws {Error} - If any of the required parameters are missing or if the schema or schema definition is not found.
 *
 * @example
 * const schema = {
 *   "swagger": "2.0",
 *   "paths": {
 *     "/users": {
 *       "get": {
 *         "responses": {
 *           "200": {
 *             "schema": { $ref: "#/definitions/User" }
 *           }
 *         }
 *       }
 *     }
 *   },
 *   "definitions": {
 *     "User": {
 *       "type": "object",
 *       "properties": {
 *         "name": { "type": "string" },
 *         "age": { "type": "number" }
 *       }
 *     }
 *   }
 * }
 *
 * const path = { endpoint: '/users', method: 'GET', status: '200' };
 *
 * const result = _getSchemaFromSpecificationDoc(schema, path);
 * console.log(result);
 * // Output: 
 * // {
 * //   $id: '/users:get:200',
 * //   type: 'object', properties: { name: { type: 'string' }, age: { type: 'number' } },
 * //   definitions: { User: { type: 'object', properties: { name: { type: 'string' }, age: { type: 'number' } } } }
 * // }
 */
const _getSchemaFromSpecificationDoc = (schema, { endpoint, method, status }) => {

    if (endpoint == null || method == null || status == null) {
        console.log(errorInvalidSchemaParameters)
        throw new Error(errorInvalidSchemaParameters)
    }

    // Normalize the method to lowercase for Swagger and OpenAPI documents
    method = method.toLowerCase()

    // Need to create a unique $id for each schema definition in AJV
    let $id = `${_random()}:${endpoint}:${method}:${status}`

    // Property name for the schema definition in the Swagger or OpenAPI document
    let schemaProperty
    // Object with the components (for a OpenAPI document) or the definitions (for a Swagger document) when there are $ref in the schema
    let componentsDefinitions

    if (schema.swagger) {
        schemaProperty = 'schema'
        componentsDefinitions = { definitions: schema.definitions }
    } else if (schema.openapi) {
        schemaProperty = 'content.application/json.schema'
        componentsDefinitions = { components: schema.components }
    }

    // Paths where to find the response definition for the given endpoint, method and status
    let pathStatus = `paths.${endpoint}.${method}.responses.${status}`
    // Try "default" status if status is not found
    let pathDefault = `paths.${endpoint}.${method}.responses.default`

    // Get the response definition for the given endpoint, method and status
    let responseDef = _.get(
        schema,
        pathStatus,
        _.get(schema, pathDefault) // Try "default" status if status is not found
    )
    if (responseDef === undefined) {
        throw new Error(`No response definition found for path '${pathStatus}' or ${pathDefault}'!`);
    }

    // Get the schema definition for the given endpoint, method and status
    const schemaDef = _.get(
        responseDef,
        schemaProperty
    )
    if (schemaDef === undefined) {
        throw new Error(`No schema definition found for path '${pathStatus}.${schemaProperty}'!`);
    }

    // Merge the schema definition with the components definitions as needed by AJV when there are $ref in the schema
    schema = {
        $id,
        ...schemaDef,
        ...componentsDefinitions
    }

    return schema
}


/**
 * Validates data against a JSON schema using AJV Schema validator.
 * @private
 *
 * @param {object} schema - The JSON schema to validate against.
 * @param {object} data - The data to be validated.
 * 
 * @returns {object} - An object containing the validation result and any errors: { valid, errors }.
 * 
 * @example
 * const schema = {
 *   "type": "object",
 *   "properties": {
 *     "name": { "type": "string" },
 *     "age": { "type": "number" }
 *   },
 *   "required": ["name"]
 * }
 *
 * const data = {
 *   name: 'John Wick',
 *   age: 49
 * }
 *
 * const validationResult = _validateSchemaAJV(schema, data)
 * console.log(validationResult.valid) // true
 * console.log(validationResult.errors) // null
 */
const _validateSchemaAJV = (schema, data, issueStyles) => {

    const { iconPropertyError, iconPropertyMissing } = issueStyles
    // Generate validating function from the schema
    const validate = ajv.compile(schema)
    // Validate the data using passed schema
    const valid = validate(data)

    const errors = validate.errors

    // Create a copy of the data validated to show the mismatches
    const dataMismatches = _.cloneDeep(data)

    if (errors) {
        errors.forEach(error => {
            let instancePathArray = error.instancePath.replace(/^\//, '').split('/') // Remove the first '/' from the instance path "/0/name" => "0/name"
            let instancePath = instancePathArray.join('.')

            let errorDescription
            let value = _.get(data, instancePath)

            if (error.keyword === 'required') {
                const missingProperty = error.params.missingProperty
                instancePath = (instancePath === "") ? missingProperty : `${instancePath}.${missingProperty}`

                errorDescription = `${iconPropertyMissing} Missing property '${missingProperty}'`
            } else {
                const message = error.message
                errorDescription = `${iconPropertyError} ${String(JSON.stringify(value)).replaceAll("\"", "'")} ${message}` // We also use String() to handle the case of undefined values
            }
            _.set(dataMismatches, instancePath, errorDescription)
        })
    }

    return { valid, errors, dataMismatches }
}


/**
 * Generates a random string with 10 characters.
 * @private
 *
 * @returns {string} A random string.
 * 
 * @example
 * const randomString = _random();
 * console.log(randomString); // Output: "3hj7k9da1e"
 */
const _random = () => {
    return Math.random().toString(36).substring(10)

}
