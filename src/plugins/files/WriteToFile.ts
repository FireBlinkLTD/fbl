import {ActionHandler, IHandlerMetadata} from '../../models';
import * as Joi from 'joi';
import {SchemaLike} from 'joi';
import {writeFile} from 'fs';
import {promisify} from 'util';

export class WriteToFile extends ActionHandler {
    private static metadata = <IHandlerMetadata> {
        id: 'com.fireblink.fbl.files.write',
        version: '1.0.0',
        description: 'Write string content to a file.',
        aliases: [
            'fbl.files.write',
            'files.write',
            '->'
        ],
        examples: [
`'->':
  # Path of file to where write the "content"
  path: '/tmp/test.json'
  # File content to write
  content: |-
    {
      "version": "<%- ctx.version %>"
    }`
        ]
    };

    private static validationSchema = Joi.object({
        path: Joi.string()
            .min(1)
            .required(),
        content: Joi.alternatives(Joi.number(), Joi.string())
            .required()
    })
        .required()
        .options({ abortEarly: true });

    getMetadata(): IHandlerMetadata {
        return WriteToFile.metadata;
    }

    getValidationSchema(): SchemaLike | null {
        return WriteToFile.validationSchema;
    }

    async execute(options: any, context: any): Promise<void> {
        await promisify(writeFile)(options.path, options.content, 'utf8');
    }
}
