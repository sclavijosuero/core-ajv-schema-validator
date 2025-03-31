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
 * @param data - The data to be validated. This can be any JavaScript object or value.
 * @param schema - The schema to validate against. Supported formats include plain JSON schema, 
 * Swagger, and OpenAPI documents.
 * @param path - An optional object specifying the path to the schema definition in a Swagger 
 * or OpenAPI document. This includes the endpoint, HTTP method, and status code. If the schema 
 * is a plain JSON schema, this parameter is not required.
 * 
 * @returns An object containing the validation results:
 * - `errors`: An array of error objects if validation fails as provided by the standard Ajv validator, or `null` if validation succeeds.
 * - `dataMismatches`: An object detailing any mismatches between the data and the schema.
 * - `issueStyles`: An object containing style information for displaying validation issues, including icons and colors for property errors and missing properties.
 *        issueStyles = {
 *            iconPropertyError: '😱',
 *            colorPropertyError: 'ee930a',
 *            iconPropertyMissing: '😡',
 *            colorPropertyMissing: 'c10000'
 *        }
 * 
 * @throws {Error} If any of the required parameters (`data` or `schema`) are missing, or if the 
 * schema or schema definition cannot be found.
 */

export declare function validateSchema(
    data: any,
    schema: any,
    path?: PathObject
): object;
