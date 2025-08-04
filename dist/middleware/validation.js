"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateAuditRequest = void 0;
const joi_1 = __importDefault(require("joi"));
const validateAuditRequest = (req, _res, next) => {
    const schema = joi_1.default.object({
        url: joi_1.default.string()
            .uri({ scheme: ['http', 'https'] })
            .required()
            .messages({
            'string.uri': 'URL must be a valid HTTP or HTTPS URL',
            'any.required': 'URL is required',
        }),
        includeScreenshot: joi_1.default.boolean().optional().default(false),
        customCriteria: joi_1.default.array().items(joi_1.default.string()).optional(),
    });
    const { error, value } = schema.validate(req.body);
    if (error) {
        const appError = new Error(error.details[0].message);
        appError.statusCode = 400;
        appError.isOperational = true;
        return next(appError);
    }
    req.body = value;
    next();
};
exports.validateAuditRequest = validateAuditRequest;
//# sourceMappingURL=validation.js.map