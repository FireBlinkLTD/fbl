import {ActionHandler} from '../../models';
import * as Joi from 'joi';
import {createCipheriv, createDecipheriv, pbkdf2, randomBytes} from 'crypto';
import * as tmp from 'tmp-promise';
import {createReadStream, createWriteStream, ReadStream, rename} from 'fs';
import {promisify} from 'util';

export abstract class BaseCrypto extends ActionHandler {
    private static encryptionAlgorithm = 'aes-256-cbc';
    private static hashAlgorithm = 'sha512';
    private static ivSize = 16;
    private static keySize = 32;
    private static saltSize = 24;
    private static version = new Buffer('0001', 'hex');

    private static validationSchema = Joi.object({
            password: Joi.string().required(),
            include: Joi.array()
                .items(Joi.string().min(1).required())
                .min(1)
                .required(),
            exclude: Joi.array()
                .items(Joi.string().min(1).required())
        })
        .required()
        .options({ abortEarly: true });

    getValidationSchema(): Joi.SchemaLike | null {
        return BaseCrypto.validationSchema;
    }

    private static async getPasswordHash(password: string, salt?: Buffer): Promise<{hash: Buffer, salt: Buffer}> {
        salt = salt || randomBytes(BaseCrypto.saltSize);
        const hash = await promisify(pbkdf2)(password, salt, 100000, BaseCrypto.keySize, BaseCrypto.hashAlgorithm);

        return {
            salt: salt,
            hash: hash
        };
    }

    protected async encrypt(file: string, password: string): Promise<void> {
        const passwordHash = await BaseCrypto.getPasswordHash(password);
        const iv = randomBytes(BaseCrypto.ivSize);
        const cipher = createCipheriv(BaseCrypto.encryptionAlgorithm, passwordHash.hash, iv);

        const tmpFile = await tmp.file();
        const rs = createReadStream(file);
        const ws = createWriteStream(tmpFile.path);

        const writeAsync = (chunk: Buffer): Promise<void> => {
            return new Promise<void>(resolve => {
                ws.write(chunk, () => resolve());
            });
        };

        await writeAsync(BaseCrypto.version);
        await writeAsync(passwordHash.salt);
        await writeAsync(iv);

        await new Promise<void>(resolve => {
            rs.pipe(cipher).pipe(ws);
            rs.on('close', () => {
                ws.end();
                resolve();
            });
        });

        await promisify(rename)(tmpFile.path, file);
    }

    private static streamToBuffer(stream: ReadStream): Promise<Buffer> {
        return new Promise((resolve, reject) => {
            const buffers: Buffer[] = [];
            stream.on('error', reject);
            stream.on('data', (data) => buffers.push(data));
            stream.on('end', () => resolve(Buffer.concat(buffers)));
        });
    }

    protected async decrypt(file: string, password: string): Promise<void> {
        const headerSize = 2 + BaseCrypto.saltSize + BaseCrypto.ivSize;

        let rs = createReadStream(file, {
            end: headerSize
        });

        const header = await BaseCrypto.streamToBuffer(rs);

        const salt = header.slice(2, 2 + BaseCrypto.saltSize);
        const iv = header.slice(2 + BaseCrypto.saltSize, headerSize);

        rs = createReadStream(file, {
            start: headerSize
        });

        const passwordHash = await BaseCrypto.getPasswordHash(password, salt);
        const decipher = createDecipheriv(BaseCrypto.encryptionAlgorithm, passwordHash.hash, iv);

        const tmpFile = await tmp.file();
        const ws = createWriteStream(tmpFile.path);

        await new Promise<void>(resolve => {
            rs.pipe(decipher).pipe(ws);
            rs.on('close', () => {
                ws.end();
                resolve();
            });
        });

        await promisify(rename)(tmpFile.path, file);
    }
}
